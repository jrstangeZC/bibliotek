import { describe, expect, it } from "vitest";

import { composeHoldReadyMessage, queueHoldNotices } from "@/lib/mail";
import type { Book, Borrower, Database, Reservation } from "@/lib/types";

const book: Book = {
  id: "sult",
  title: "Sult",
  author: "Knut Hamsun",
  isbn: "978-82-05-39001-4",
  year: 1890,
  copies: 1,
};

function person(id: string, notifyByEmail = true): Borrower {
  return { id, name: `Person ${id}`, email: `${id}@example.no`, role: "borrower", notifyByEmail };
}

function hold(id: string, borrowerId: string, readyAt: string | null): Reservation {
  return {
    id,
    bookId: "sult",
    borrowerId,
    reservedAt: "2026-09-20T12:00:00.000Z",
    readyAt,
    closedAt: null,
    outcome: null,
    passedToId: null,
    handledAt: null,
    notifiedAt: null,
  };
}

function database(reservations: Reservation[], borrowers = [person("a"), person("b", false)]): Database {
  return { books: [book], borrowers, loans: [], reservations, outbox: [] };
}

const NOW = "2026-10-01T12:00:00.000Z";

describe("composeHoldReadyMessage", () => {
  it("names the book, the deadline and the person", () => {
    const message = composeHoldReadyMessage(
      hold("r", "a", "2026-10-01T12:00:00.000Z"),
      book,
      person("a")
    );

    expect(message).toMatchObject({
      to: "a@example.no",
      toName: "Person a",
      subject: "«Sult» er klar til henting",
    });
    expect(message.body).toContain("Hei Person a,");
    expect(message.body).toContain("innen 8. oktober 2026");
    expect(message.body).toContain("Min profil");
  });
});

describe("queueHoldNotices", () => {
  it("emails a new hold once, however many times it runs", () => {
    const data = database([hold("r", "a", NOW)]);

    expect(queueHoldNotices(data, NOW)).toHaveLength(1);
    expect(queueHoldNotices(data, "2026-10-02T12:00:00.000Z")).toHaveLength(0);
    expect(data.outbox).toHaveLength(1);
    expect(data.outbox[0]).toMatchObject({ reservationId: "r", createdAt: NOW });
    expect(data.reservations[0].notifiedAt).toBe(NOW);
  });

  it("sends nothing to someone who opted out, and does not send it later either", () => {
    const data = database([hold("r", "b", NOW)]);

    expect(queueHoldNotices(data, NOW)).toEqual([]);
    expect(data.reservations[0].notifiedAt).toBe(NOW);

    data.borrowers[1].notifyByEmail = true;
    expect(queueHoldNotices(data, NOW)).toEqual([]);
  });

  it("leaves a place in the queue alone until a copy is set aside", () => {
    const data = database([hold("r", "a", null)]);

    expect(queueHoldNotices(data, NOW)).toEqual([]);
    expect(data.reservations[0].notifiedAt).toBeNull();
  });
});
