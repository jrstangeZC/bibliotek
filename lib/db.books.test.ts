import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookInput } from "@/lib/books";

/**
 * `lib/db.ts` resolves its data directory from the working directory when it is
 * first imported, so each test run moves into a scratch copy of the seed before
 * loading it. The real `data/db.json` is never touched.
 */

const originalCwd = process.cwd();
let scratch: string;
let db: typeof import("@/lib/db");

const sult: BookInput = {
  title: "Sult",
  author: "Knut Hamsun",
  isbn: "978-82-05-39001-4",
  year: 1890,
  copies: 2,
};

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), "bibliotek-books-"));
  await mkdir(path.join(scratch, "data"));
  await cp(path.join(originalCwd, "data/seed.json"), path.join(scratch, "data/seed.json"));

  process.chdir(scratch);
  vi.resetModules();
  db = await import("@/lib/db");
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(scratch, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.resetDatabase();
});

async function addSult() {
  const result = await db.createBook(sult);
  if (!result.ok) throw new Error("expected the book to be created");
  return result.book;
}

async function lend(bookId: string) {
  const loan = await db.createLoan({
    bookId,
    borrowerId: "borrower-1",
    borrowedAt: "2026-02-01T12:00:00.000Z",
    dueAt: "2026-03-01T12:00:00.000Z",
  });
  if (!loan) throw new Error("expected the loan to be created");
  return loan;
}

describe("createBook", () => {
  it("adds the title with a fresh id", async () => {
    const before = (await db.getBooks()).length;
    const book = await addSult();

    expect(book.id).toMatch(/^bok-/);
    expect(await db.getBooks()).toHaveLength(before + 1);
    expect(await db.getBook(book.id)).toMatchObject(sult);
  });

  it("refuses an ISBN already in the catalogue, however it is punctuated", async () => {
    await addSult();

    const again = await db.createBook({ ...sult, isbn: "9788205390014" });
    expect(again).toEqual({ ok: false, error: "isbn-taken" });
  });
});

describe("updateBook", () => {
  it("rewrites the entry in place", async () => {
    const book = await addSult();

    const result = await db.updateBook(book.id, { ...sult, title: "Sult (1890)", copies: 5 });

    expect(result).toMatchObject({ ok: true, book: { id: book.id, title: "Sult (1890)", copies: 5 } });
    expect(await db.getBook(book.id)).toMatchObject({ title: "Sult (1890)", copies: 5 });
  });

  it("lets a title keep its own ISBN but not take another's", async () => {
    const book = await addSult();
    const [other] = await db.getBooks();

    expect((await db.updateBook(book.id, sult)).ok).toBe(true);
    expect(await db.updateBook(book.id, { ...sult, isbn: other.isbn })).toEqual({
      ok: false,
      error: "isbn-taken",
    });
  });

  it("will not cut the stock below what is out on loan", async () => {
    const book = await addSult();
    await lend(book.id);
    await lend(book.id);

    expect(await db.updateBook(book.id, { ...sult, copies: 1 })).toEqual({
      ok: false,
      error: "copies-below-loans",
      onLoan: 2,
    });
    expect((await db.updateBook(book.id, { ...sult, copies: 2 })).ok).toBe(true);
  });

  it("reports an unknown id", async () => {
    expect(await db.updateBook("bok-finnes-ikke", sult)).toEqual({
      ok: false,
      error: "book-not-found",
    });
  });
});

describe("deleteBook", () => {
  it("removes the title", async () => {
    const book = await addSult();

    expect((await db.deleteBook(book.id)).ok).toBe(true);
    expect(await db.getBook(book.id)).toBeNull();
  });

  it("refuses while a copy is out, and works once it is back", async () => {
    const book = await addSult();
    const loan = await lend(book.id);

    expect(await db.deleteBook(book.id)).toEqual({
      ok: false,
      error: "book-on-loan",
      onLoan: 1,
    });
    expect(await db.getBook(book.id)).not.toBeNull();

    await db.markLoanReturned(loan.id, "2026-02-10T12:00:00.000Z");
    expect((await db.deleteBook(book.id)).ok).toBe(true);
  });

  it("reports an unknown id", async () => {
    expect(await db.deleteBook("bok-finnes-ikke")).toEqual({
      ok: false,
      error: "book-not-found",
    });
  });
});
