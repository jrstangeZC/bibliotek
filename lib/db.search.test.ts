import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * `searchLibrary` against the seed. Same set-up as `db.reservations.test.ts`:
 * each run moves into a scratch copy of the seed before `lib/db.ts` is loaded,
 * so the real `data/db.json` is never touched.
 *
 * In the seed, Marit (`borrower-1`) has «The Little Prince» (`loan-1`) and «The
 * Lord of the Rings» (`loan-2`) out, and has returned «Harry Potter» (`loan-3`).
 * Ingrid Sæther (`borrower-4`) is the librarian. The seed has no reservations,
 * so Jonas (`borrower-2`) queues for «The Little Prince» before the tests run.
 */

const originalCwd = process.cwd();
let scratch: string;
let db: typeof import("@/lib/db");
let loans: typeof import("@/lib/loans");
let jonasReservation: string;

const OCT_1 = new Date("2026-10-01T12:00:00.000Z");

async function search(viewerId: string | null, q: string | string[] | undefined) {
  const viewer = viewerId ? await db.getBorrower(viewerId) : null;
  if (viewerId && !viewer) throw new Error(`no ${viewerId} in the seed`);
  return loans.searchLibrary(q, viewer, OCT_1);
}

/** Every group's ids, so a test states the whole result and nothing slips in. */
async function hits(viewerId: string | null, q: string) {
  const results = await search(viewerId, q);
  const ids = (records: { id: string }[]) => records.map((record) => record.id);

  return {
    books: ids(results.books),
    borrowers: ids(results.borrowers),
    loans: ids(results.loans),
    reservations: ids(results.reservations),
  };
}

const none = { books: [], borrowers: [], loans: [], reservations: [] };

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), "bibliotek-search-"));
  await mkdir(path.join(scratch, "data"));
  await cp(path.join(originalCwd, "data/seed.json"), path.join(scratch, "data/seed.json"));

  process.chdir(scratch);
  vi.resetModules();
  db = await import("@/lib/db");
  loans = await import("@/lib/loans");

  await db.resetDatabase();
  const reserved = await db.createReservation("book-5", "borrower-2", OCT_1);
  if (!reserved.ok) throw new Error(`expected a reservation, got ${reserved.error}`);
  jonasReservation = reserved.reservation.id;
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(scratch, { recursive: true, force: true });
});

describe("searchLibrary at the desk", () => {
  it("finds a person, and the loans they have out", async () => {
    expect(await hits("borrower-4", "marit")).toEqual({
      ...none,
      borrowers: ["borrower-1"],
      loans: ["loan-1", "loan-2"],
    });
  });

  it("needs every word on the same loan", async () => {
    expect(await hits("borrower-4", "marit tolkien")).toEqual({ ...none, loans: ["loan-2"] });
  });

  it("finds Sæther however the name is typed", async () => {
    const ingrid = { ...none, borrowers: ["borrower-4"] };
    expect(await hits("borrower-4", "saether")).toEqual(ingrid);
    expect(await hits("borrower-4", "Sæther")).toEqual(ingrid);
    // Through the address, ingrid.sather@example.no.
    expect(await hits("borrower-4", "sather")).toEqual(ingrid);
  });

  it("finds a book by its ISBN-10, with its loan, and stays on the page", async () => {
    expect(await hits("borrower-4", "0-618-64015-0")).toEqual({
      ...none,
      books: ["book-2"],
      loans: ["loan-2"],
    });
    expect((await search("borrower-4", "0-618-64015-0")).isbnTarget).toBeNull();
  });

  it("finds a reservation through its borrower and its book together", async () => {
    expect(await hits("borrower-4", "jonas prince")).toEqual({
      ...none,
      reservations: [jonasReservation],
    });
  });

  it("counts what a person has out", async () => {
    const { borrowers } = await search("borrower-4", "marit");
    expect(borrowers).toMatchObject([{ id: "borrower-1", onLoan: 2 }]);
  });
});

describe("searchLibrary for a borrower", () => {
  it("cannot look up other people", async () => {
    const results = await search("borrower-2", "marit");
    expect(results).toMatchObject({ scope: "own", searched: true, total: 0 });
  });

  it("finds the book and their own reservation, not someone else's loan", async () => {
    expect(await hits("borrower-2", "prince")).toEqual({
      ...none,
      books: ["book-5"],
      reservations: [jonasReservation],
    });
  });

  it("finds the book and their own loan, not someone else's reservation", async () => {
    expect(await hits("borrower-1", "prince")).toEqual({
      ...none,
      books: ["book-5"],
      loans: ["loan-1"],
    });
  });

  it("leaves returned loans out", async () => {
    expect(await hits("borrower-1", "harry")).toEqual({ ...none, books: ["book-1"] });
  });
});

describe("searchLibrary signed out", () => {
  it("finds no people", async () => {
    const results = await search(null, "marit");
    expect(results).toMatchObject({ scope: "public", searched: true, total: 0 });
  });

  it("sends a complete ISBN with one match straight to the book", async () => {
    const results = await search(null, "978 0 618 64015 7");
    expect(results.books.map((book) => book.id)).toEqual(["book-2"]);
    expect(results).toMatchObject({ total: 1, isbnTarget: "book-2" });
  });

  it("does not send a plain word with one match anywhere", async () => {
    const results = await search(null, "1984");
    expect(results).toMatchObject({ total: 1, isbnTarget: null });
  });

  it("reads punctuation or a repeated parameter as no search", async () => {
    expect(await search(null, "---")).toMatchObject({ query: "---", searched: false, total: 0 });
    expect(await search(null, ["a", "b"])).toMatchObject({ query: "", searched: false });
  });
});
