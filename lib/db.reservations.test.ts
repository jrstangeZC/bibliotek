import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Same set-up as `db.renewals.test.ts`: each run moves into a scratch copy of
 * the seed before `lib/db.ts` is loaded, so the real `data/db.json` is never
 * touched.
 *
 * In the seed, «The Little Prince» (`book-5`) has one copy, lent to
 * borrower-1 and due 3 August 2026.
 */

const originalCwd = process.cwd();
let scratch: string;
let db: typeof import("@/lib/db");
let loans: typeof import("@/lib/loans");

const BOOK = "book-5";
const HOLDER = "borrower-1";
const OCT_1 = new Date("2026-10-01T12:00:00.000Z");
const OCT_2 = new Date("2026-10-02T12:00:00.000Z");
const OCT_3 = new Date("2026-10-03T12:00:00.000Z");

async function reserve(borrowerId: string, now: Date, bookId = BOOK) {
  const result = await db.createReservation(bookId, borrowerId, now);
  if (!result.ok) throw new Error(`expected a reservation, got ${result.error}`);
  return result.reservation;
}

async function returnTheCopy(now = OCT_3) {
  const result = await loans.registerReturn("loan-1", now);
  if (!result.ok) throw new Error(`expected the return to work, got ${result.error}`);
  return result;
}

async function reservation(id: string) {
  return (await db.getReservations()).find((candidate) => candidate.id === id);
}

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), "bibliotek-reservations-"));
  await mkdir(path.join(scratch, "data"));
  await cp(path.join(originalCwd, "data/seed.json"), path.join(scratch, "data/seed.json"));

  process.chdir(scratch);
  vi.resetModules();
  db = await import("@/lib/db");
  loans = await import("@/lib/loans");
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(scratch, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.resetDatabase();
});

describe("createReservation", () => {
  it("queues for a title with every copy out", async () => {
    const first = await reserve("borrower-2", OCT_1);
    const second = await reserve("borrower-3", OCT_2);

    expect(first).toMatchObject({ bookId: BOOK, readyAt: null, closedAt: null });
    expect((await loans.findBook(BOOK, OCT_2))?.waiting).toBe(2);
    expect(second.reservedAt).toBe(OCT_2.toISOString());
  });

  it("refuses when a copy is on the shelf", async () => {
    expect(await db.createReservation("book-1", "borrower-2", OCT_1)).toEqual({
      ok: false,
      error: "book-available",
    });
  });

  it("refuses a second place in the same queue", async () => {
    await reserve("borrower-2", OCT_1);
    expect(await db.createReservation(BOOK, "borrower-2", OCT_2)).toEqual({
      ok: false,
      error: "already-reserved",
    });
  });

  it("refuses a fourth open reservation", async () => {
    // book-8 is out in the seed too. Lend out the rest of book-2 and book-6.
    await loans.borrowBook("book-2", "borrower-3", OCT_1);
    await loans.borrowBook("book-6", "borrower-3", OCT_1);
    await loans.borrowBook("book-6", "borrower-3", OCT_1);
    await reserve("borrower-2", OCT_1, "book-2");
    await reserve("borrower-2", OCT_1, "book-5");
    await reserve("borrower-4", OCT_1, "book-8");
    await reserve("borrower-4", OCT_1, "book-6");
    await reserve("borrower-4", OCT_1, "book-2");

    expect(await db.createReservation("book-5", "borrower-4", OCT_1)).toEqual({
      ok: false,
      error: "limit-reached",
    });
  });

  it("reports an unknown title", async () => {
    expect(await db.createReservation("bok-finnes-ikke", "borrower-2", OCT_1)).toEqual({
      ok: false,
      error: "book-not-found",
    });
  });
});

describe("holds", () => {
  it("sets a returned copy aside for the first in line", async () => {
    const first = await reserve("borrower-2", OCT_1);
    await reserve("borrower-3", OCT_2);

    const { heldFor } = await returnTheCopy();

    expect(heldFor?.id).toBe(first.id);
    expect(await reservation(first.id)).toMatchObject({ readyAt: OCT_3.toISOString() });
    expect(await loans.findBook(BOOK, OCT_3)).toMatchObject({
      available: 0,
      held: 1,
      waiting: 1,
    });
  });

  it("keeps a held copy from anyone else, and lets the holder take it", async () => {
    const first = await reserve("borrower-2", OCT_1);
    await returnTheCopy();

    expect(await loans.borrowBook(BOOK, "borrower-3", OCT_3)).toEqual({
      ok: false,
      error: "no-copies-available",
    });

    const borrowed = await loans.borrowBook(BOOK, "borrower-2", OCT_3);
    expect(borrowed.ok).toBe(true);
    expect(await reservation(first.id)).toMatchObject({ outcome: "collected" });
  });

  it("moves a hold on to the next in line once it runs out", async () => {
    const first = await reserve("borrower-2", OCT_1);
    const second = await reserve("borrower-3", OCT_2);
    await returnTheCopy();

    // Held from 3 October, so the last day is the 10th.
    const book = await loans.findBook(BOOK, new Date("2026-10-11T08:00:00.000Z"));
    expect(book).toMatchObject({ held: 1, waiting: 0 });

    const after = await db.getSettled(new Date("2026-10-11T08:00:00.000Z"));
    const settled = (id: string) => after.reservations.find((r) => r.id === id);
    expect(settled(first.id)).toMatchObject({ outcome: "expired", passedToId: second.id });
    expect(settled(second.id)?.readyAt).toBe("2026-10-11T00:00:00.000Z");
  });

  it("passes a cancelled hold on, and flags the copy for the desk", async () => {
    const first = await reserve("borrower-2", OCT_1);
    const second = await reserve("borrower-3", OCT_2);
    await returnTheCopy();

    const cancelled = await db.cancelReservation(first.id, "borrower-2", OCT_3);

    expect(cancelled).toMatchObject({ ok: true, passedTo: { id: second.id } });
    expect((await reservation(second.id))?.readyAt).toBe(OCT_3.toISOString());

    const handled = await db.markHoldHandled(first.id, OCT_3);
    expect(handled?.handledAt).toBe(OCT_3.toISOString());
    expect(await db.markHoldHandled(first.id, OCT_3)).toBeNull();
  });

  it("only lets people cancel their own place, while the desk can cancel any", async () => {
    const first = await reserve("borrower-2", OCT_1);

    expect(await db.cancelReservation(first.id, "borrower-3", OCT_2)).toEqual({
      ok: false,
      error: "reservation-not-found",
    });
    expect((await db.cancelReservation(first.id, null, OCT_2)).ok).toBe(true);
  });
});

describe("renewal while others wait", () => {
  it("is refused once someone is queueing for the title", async () => {
    // book-2's loan is due 7 September in the seed; renew it before then.
    // Its second copy goes out first, so there is something to queue for.
    const aug20 = new Date("2026-08-20T12:00:00.000Z");
    await loans.borrowBook("book-2", "borrower-3", aug20);
    await reserve("borrower-2", aug20, "book-2");

    expect(await db.renewLoan("loan-2", HOLDER, aug20)).toEqual({
      ok: false,
      error: "reserved",
    });
  });
});

describe("getSettled", () => {
  it("never writes to the data file", async () => {
    await reserve("borrower-2", OCT_1);
    await returnTheCopy();
    const file = path.join(scratch, "data/db.json");
    const before = await readFile(file, "utf8");

    await db.getSettled(new Date("2026-12-24T12:00:00.000Z"));

    expect(await readFile(file, "utf8")).toBe(before);
  });
});

describe("reservation views", () => {
  it("shows the queue place while waiting, and the deadline once held", async () => {
    await reserve("borrower-2", OCT_1);
    await reserve("borrower-3", OCT_2);

    const [waiting] = await loans.listReservationsForBorrower("borrower-3", OCT_2);
    expect(waiting).toMatchObject({ status: "waiting", position: 2, deadline: null });

    await returnTheCopy();
    const [held] = await loans.listReservationsForBorrower("borrower-2", OCT_3);
    expect(held).toMatchObject({
      status: "ready",
      position: null,
      deadline: "2026-10-10T12:00:00.000Z",
      book: { id: BOOK },
    });
    const [moved] = await loans.listReservationsForBorrower("borrower-3", OCT_3);
    expect(moved.position).toBe(1);
  });

  it("tells each reader where they stand with a title", async () => {
    await reserve("borrower-2", OCT_1);
    await returnTheCopy();

    const holder = await loans.findBook(BOOK, OCT_3, "borrower-2");
    expect(holder?.viewer).toMatchObject({
      canBorrow: true,
      reservation: { status: "ready" },
    });

    const other = await loans.findBook(BOOK, OCT_3, "borrower-3");
    expect(other?.viewer).toMatchObject({
      canBorrow: false,
      reservation: null,
      reservationBlock: null,
    });

    expect((await loans.findBook(BOOK, OCT_3))?.viewer).toBeNull();
  });

  it("leaves closed reservations out of a borrower's list", async () => {
    const first = await reserve("borrower-2", OCT_1);
    await db.cancelReservation(first.id, "borrower-2", OCT_2);

    expect(await loans.listReservationsForBorrower("borrower-2", OCT_2)).toEqual([]);
  });
});

describe("the desk's lists", () => {
  it("lists a given-up hold with where the copy goes, until it is handled", async () => {
    const first = await reserve("borrower-2", OCT_1);
    await reserve("borrower-3", OCT_2);
    await returnTheCopy();
    await db.cancelReservation(first.id, "borrower-2", OCT_3);

    expect(await loans.listHoldsToHandle(OCT_3)).toMatchObject([
      {
        id: first.id,
        outcome: "cancelled",
        borrower: { id: "borrower-2" },
        passedTo: { id: "borrower-3" },
      },
    ]);

    await loans.markHoldHandled(first.id, OCT_3);
    expect(await loans.listHoldsToHandle(OCT_3)).toEqual([]);
  });

  it("puts held copies above the queues", async () => {
    await loans.borrowBook("book-2", "borrower-3", OCT_1);
    await reserve("borrower-2", OCT_1, "book-2");
    await reserve("borrower-3", OCT_2);
    await returnTheCopy();

    const open = await loans.listOpenReservations(OCT_3);
    expect(open.map((r) => [r.bookId, r.status])).toEqual([
      [BOOK, "ready"],
      ["book-2", "waiting"],
    ]);
  });
});

describe("hold notices", () => {
  it("emails the first in line when a copy comes back", async () => {
    await reserve("borrower-2", OCT_1);
    await returnTheCopy();

    const outbox = await db.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      to: "jonas.berge@example.no",
      subject: "«The Little Prince» er klar til henting",
      createdAt: OCT_3.toISOString(),
    });
  });

  it("does not email someone who switched notices off", async () => {
    const jonas = (await db.getBorrower("borrower-2"))!;
    await db.updateBorrower(jonas.id, { ...jonas, notifyByEmail: false });
    await reserve("borrower-2", OCT_1);
    await returnTheCopy();

    expect(await db.getOutbox()).toEqual([]);
  });

  it("sends a hold passed on by expiry when the daily job runs, not on a read", async () => {
    await reserve("borrower-2", OCT_1);
    await reserve("borrower-3", OCT_2);
    await returnTheCopy();
    const later = new Date("2026-10-12T06:00:00.000Z");

    await loans.listOpenReservations(later);
    expect(await db.getOutbox()).toHaveLength(1);

    const sent = await db.settleAndNotify(later);
    expect(sent).toMatchObject([{ to: "aisha.rahman@example.no" }]);
    expect(await db.settleAndNotify(later)).toEqual([]);
  });
});

describe("updateBorrower", () => {
  it("saves a new name, address and notice choice", async () => {
    const result = await db.updateBorrower("borrower-2", {
      name: "Jonas B. Berge",
      email: "jonas@example.no",
      role: "borrower",
      notifyByEmail: false,
    });

    expect(result).toMatchObject({ ok: true, borrower: { name: "Jonas B. Berge" } });
    expect(await db.getBorrower("borrower-2")).toMatchObject({
      email: "jonas@example.no",
      notifyByEmail: false,
    });
  });

  it("refuses an address someone else has, whatever its case", async () => {
    const jonas = (await db.getBorrower("borrower-2"))!;
    expect(
      await db.updateBorrower(jonas.id, { ...jonas, email: "Marit.Hoel@example.no" })
    ).toEqual({ ok: false, error: "email-taken" });
  });

  it("will not leave the library without a librarian", async () => {
    const ingrid = (await db.getBorrower("borrower-4"))!;
    expect(await db.updateBorrower(ingrid.id, { ...ingrid, role: "borrower" })).toEqual({
      ok: false,
      error: "last-librarian",
    });

    const marit = (await db.getBorrower("borrower-1"))!;
    await db.updateBorrower(marit.id, { ...marit, role: "librarian" });
    expect((await db.updateBorrower(ingrid.id, { ...ingrid, role: "borrower" })).ok).toBe(true);
  });

  it("reports an unknown person", async () => {
    const marit = (await db.getBorrower("borrower-1"))!;
    expect(await db.updateBorrower("laaner-finnes-ikke", marit)).toEqual({
      ok: false,
      error: "borrower-not-found",
    });
  });
});
