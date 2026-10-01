import { describe, expect, it } from "vitest";

import { formatDate } from "@/lib/format";
import {
  HOLD_DAYS,
  MAX_OPEN_RESERVATIONS,
  canBorrow,
  holdDeadline,
  holdEndsAt,
  needsHandling,
  queuePosition,
  reservationBlock,
  settleReservations,
} from "@/lib/reservations";
import type { Book, Database, Loan, Reservation } from "@/lib/types";

function book(id: string, copies = 1): Book {
  return { id, title: id, author: "Knut Hamsun", isbn: id, year: 1890, copies };
}

function loan(bookId: string, borrowerId: string, returnedAt: string | null = null): Loan {
  return {
    id: `loan-${bookId}-${borrowerId}`,
    bookId,
    borrowerId,
    borrowedAt: "2026-09-01T12:00:00.000Z",
    dueAt: "2026-09-29T12:00:00.000Z",
    returnedAt,
    renewedAt: null,
  };
}

function reservation(
  id: string,
  bookId: string,
  borrowerId: string,
  overrides: Partial<Reservation> = {}
): Reservation {
  return {
    id,
    bookId,
    borrowerId,
    reservedAt: "2026-09-10T12:00:00.000Z",
    readyAt: null,
    closedAt: null,
    outcome: null,
    passedToId: null,
    handledAt: null,
    notifiedAt: null,
    ...overrides,
  };
}

function database(overrides: Partial<Database> = {}): Database {
  return {
    books: [book("sult")],
    borrowers: ["a", "b", "c", "d"].map((id) => ({
      id,
      name: id,
      email: `${id}@example.no`,
      role: "borrower" as const,
      notifyByEmail: true,
    })),
    loans: [],
    reservations: [],
    outbox: [],
    ...overrides,
  };
}

function find(data: Database, id: string): Reservation {
  const found = data.reservations.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no reservation ${id}`);
  return found;
}

describe("hold deadlines", () => {
  it("gives a week, shown as the UTC day the rule counts", () => {
    expect(HOLD_DAYS).toBe(7);
    // 01:30 in Oslo on 2 October, but still 1 October in UTC.
    const readyAt = "2026-10-01T23:30:00.000Z";

    expect(formatDate(holdDeadline(readyAt))).toBe("8. oktober 2026");
    expect(holdEndsAt(readyAt).toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });

  it("moves to the next day once UTC midnight has passed", () => {
    expect(formatDate(holdDeadline("2026-10-02T00:30:00.000Z"))).toBe("9. oktober 2026");
  });

  it("keeps the hold through the whole deadline day, and not a minute longer", () => {
    const held = () =>
      database({
        reservations: [
          reservation("r1", "sult", "a", { readyAt: "2026-10-01T23:30:00.000Z" }),
        ],
      });

    const lastMinute = held();
    settleReservations(lastMinute, "2026-10-08T23:59:00.000Z");
    expect(find(lastMinute, "r1").closedAt).toBeNull();

    const midnight = held();
    settleReservations(midnight, "2026-10-09T00:00:00.000Z");
    expect(find(midnight, "r1")).toMatchObject({
      outcome: "expired",
      closedAt: "2026-10-09T00:00:00.000Z",
    });
  });
});

describe("settleReservations", () => {
  it("sets free copies aside first come, first served", () => {
    const data = database({
      books: [book("sult", 2)],
      reservations: [
        reservation("late", "sult", "c", { reservedAt: "2026-09-12T12:00:00.000Z" }),
        reservation("early", "sult", "a", { reservedAt: "2026-09-10T12:00:00.000Z" }),
        reservation("middle", "sult", "b", { reservedAt: "2026-09-11T12:00:00.000Z" }),
      ],
    });

    const readied = settleReservations(data, "2026-10-01T12:00:00.000Z");

    expect(readied.map((r) => r.id)).toEqual(["early", "middle"]);
    expect(find(data, "late").readyAt).toBeNull();
    expect(queuePosition(data.reservations, find(data, "late"))).toBe(1);
  });

  it("passes an expired hold on from the moment it ran out, along the whole chain", () => {
    const data = database({
      loans: [loan("sult", "d", "2026-09-30T12:00:00.000Z")],
      reservations: [
        reservation("first", "sult", "a", {
          reservedAt: "2026-09-10T12:00:00.000Z",
          readyAt: "2026-09-30T12:00:00.000Z",
        }),
        reservation("second", "sult", "b", { reservedAt: "2026-09-11T12:00:00.000Z" }),
        reservation("third", "sult", "c", { reservedAt: "2026-09-12T12:00:00.000Z" }),
      ],
    });

    // Two whole holds later: first ran out 8 Oct, second 16 Oct.
    settleReservations(data, "2026-10-20T12:00:00.000Z");

    expect(find(data, "first")).toMatchObject({
      outcome: "expired",
      closedAt: "2026-10-08T00:00:00.000Z",
      passedToId: "second",
    });
    expect(find(data, "second")).toMatchObject({
      readyAt: "2026-10-08T00:00:00.000Z",
      outcome: "expired",
      closedAt: "2026-10-16T00:00:00.000Z",
      passedToId: "third",
    });
    expect(find(data, "third")).toMatchObject({
      readyAt: "2026-10-16T00:00:00.000Z",
      closedAt: null,
    });
  });

  it("puts the copy back on the shelf when a hold runs out with nobody waiting", () => {
    const data = database({
      reservations: [
        reservation("only", "sult", "a", { readyAt: "2026-09-30T12:00:00.000Z" }),
      ],
    });
    expect(canBorrow(data, data.books[0], "b")).toBe(false);

    settleReservations(data, "2026-10-08T00:00:00.000Z");

    expect(find(data, "only")).toMatchObject({ outcome: "expired", passedToId: null });
    expect(needsHandling(find(data, "only"))).toBe(true);
    expect(canBorrow(data, data.books[0], "b")).toBe(true);
  });

  it("does not hand an expired hold to someone who joined the queue after it ran out", () => {
    const data = database({
      reservations: [
        reservation("first", "sult", "a", { readyAt: "2026-09-30T12:00:00.000Z" }),
        reservation("latecomer", "sult", "b", { reservedAt: "2026-10-09T12:00:00.000Z" }),
      ],
    });

    settleReservations(data, "2026-10-10T12:00:00.000Z");

    expect(find(data, "first").passedToId).toBeNull();
    // Picked up by the free-copy step instead, from now.
    expect(find(data, "latecomer").readyAt).toBe("2026-10-10T12:00:00.000Z");
  });

  it("closes reservations for a title or a person no longer in the register", () => {
    const data = database({
      reservations: [
        reservation("gone-book", "slettet", "a"),
        reservation("gone-person", "sult", "slettet"),
      ],
    });

    settleReservations(data, "2026-10-01T12:00:00.000Z");

    expect(find(data, "gone-book").outcome).toBe("cancelled");
    expect(find(data, "gone-person").outcome).toBe("cancelled");
  });

  it("gives the same answer every time it runs", () => {
    const build = () =>
      database({
        loans: [loan("sult", "d", "2026-09-30T12:00:00.000Z")],
        reservations: [
          reservation("first", "sult", "a", { readyAt: "2026-09-30T12:00:00.000Z" }),
          reservation("second", "sult", "b"),
        ],
      });
    const once = build();
    const twice = build();

    settleReservations(once, "2026-10-12T08:00:00.000Z");
    settleReservations(twice, "2026-10-12T08:00:00.000Z");
    settleReservations(twice, "2026-10-12T08:00:00.000Z");

    expect(twice).toEqual(once);
  });
});

describe("reservationBlock", () => {
  const allOut = () =>
    database({
      books: [book("sult"), book("pan"), book("victoria"), book("markens-grode")],
      loans: ["sult", "pan", "victoria", "markens-grode"].map((id) => loan(id, "d")),
    });

  it("lets anyone queue for a title with every copy out", () => {
    const data = allOut();
    expect(reservationBlock(data, data.books[0], "a")).toBeNull();
  });

  it("sends you to borrow when a copy is on the shelf", () => {
    const data = database();
    expect(reservationBlock(data, data.books[0], "a")).toBe("book-available");
  });

  it("refuses the person who has the book already", () => {
    const data = allOut();
    expect(reservationBlock(data, data.books[0], "d")).toBe("already-borrowed");
  });

  it("refuses a second place in the same queue", () => {
    const data = allOut();
    data.reservations.push(reservation("r", "sult", "a"));
    expect(reservationBlock(data, data.books[0], "a")).toBe("already-reserved");
  });

  it(`stops at ${MAX_OPEN_RESERVATIONS} open reservations, held copies included`, () => {
    const data = allOut();
    data.reservations.push(
      reservation("r1", "pan", "a"),
      reservation("r2", "victoria", "a"),
      reservation("r3", "markens-grode", "a", { readyAt: "2026-10-01T12:00:00.000Z" })
    );
    expect(reservationBlock(data, data.books[0], "a")).toBe("limit-reached");

    data.reservations[0].closedAt = "2026-10-01T12:00:00.000Z";
    data.reservations[0].outcome = "cancelled";
    expect(reservationBlock(data, data.books[0], "a")).toBeNull();
  });
});

describe("needsHandling", () => {
  it("flags a held copy that was given up, until the desk has dealt with it", () => {
    const given = reservation("r", "sult", "a", {
      readyAt: "2026-10-01T12:00:00.000Z",
      closedAt: "2026-10-02T12:00:00.000Z",
      outcome: "cancelled",
    });
    expect(needsHandling(given)).toBe(true);
    expect(needsHandling({ ...given, handledAt: "2026-10-02T13:00:00.000Z" })).toBe(false);
  });

  it("ignores a collected hold and a place given up before any copy was set aside", () => {
    expect(
      needsHandling(
        reservation("r", "sult", "a", {
          readyAt: "2026-10-01T12:00:00.000Z",
          closedAt: "2026-10-02T12:00:00.000Z",
          outcome: "collected",
        })
      )
    ).toBe(false);
    expect(
      needsHandling(
        reservation("r", "sult", "a", {
          closedAt: "2026-10-02T12:00:00.000Z",
          outcome: "cancelled",
        })
      )
    ).toBe(false);
  });
});
