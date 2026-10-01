import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/db.ts` resolves its data directory from the working directory when it is
 * first imported, so each test run moves into a scratch copy of the seed before
 * loading it. The real `data/db.json` is never touched.
 */

const originalCwd = process.cwd();
let scratch: string;
let db: typeof import("@/lib/db");

/** A loan due at noon on 1 March 2026. */
async function lend(borrowerId = "borrower-1") {
  const loan = await db.createLoan({
    bookId: "book-1",
    borrowerId,
    borrowedAt: "2026-02-01T12:00:00.000Z",
    dueAt: "2026-03-01T12:00:00.000Z",
  });
  if (!loan) throw new Error("expected the loan to be created");
  return loan;
}

const FEB_20 = new Date("2026-02-20T12:00:00.000Z");

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), "bibliotek-renewals-"));
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

describe("renewLoan", () => {
  it("moves the due date 28 days and stamps when it happened", async () => {
    const loan = await lend();

    const result = await db.renewLoan(loan.id, "borrower-1", FEB_20);

    expect(result).toMatchObject({
      ok: true,
      loan: {
        dueAt: "2026-03-29T12:00:00.000Z",
        renewedAt: FEB_20.toISOString(),
        returnedAt: null,
      },
    });
    expect(await db.getLoan(loan.id)).toMatchObject({ dueAt: "2026-03-29T12:00:00.000Z" });
  });

  it("starts every new loan as never renewed", async () => {
    expect((await lend()).renewedAt).toBeNull();
  });

  it("allows one renewal per loan, not two", async () => {
    const loan = await lend();
    await db.renewLoan(loan.id, "borrower-1", FEB_20);

    const second = await db.renewLoan(loan.id, "borrower-1", new Date("2026-02-21T12:00:00.000Z"));

    expect(second).toEqual({ ok: false, error: "already-renewed" });
    expect((await db.getLoan(loan.id))?.dueAt).toBe("2026-03-29T12:00:00.000Z");
  });

  it("renews only once when two requests land at the same moment", async () => {
    const loan = await lend();

    const results = await Promise.all([
      db.renewLoan(loan.id, "borrower-1", FEB_20),
      db.renewLoan(loan.id, "borrower-1", FEB_20),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect((await db.getLoan(loan.id))?.dueAt).toBe("2026-03-29T12:00:00.000Z");
  });

  it("refuses an overdue loan and leaves the due date alone", async () => {
    const loan = await lend();

    const result = await db.renewLoan(loan.id, "borrower-1", new Date("2026-03-05T12:00:00.000Z"));

    expect(result).toEqual({ ok: false, error: "overdue" });
    expect(await db.getLoan(loan.id)).toMatchObject({
      dueAt: "2026-03-01T12:00:00.000Z",
      renewedAt: null,
    });
  });

  it("refuses a loan that has been returned", async () => {
    const loan = await lend();
    await db.markLoanReturned(loan.id, "2026-02-18T09:00:00.000Z");

    expect(await db.renewLoan(loan.id, "borrower-1", FEB_20)).toEqual({
      ok: false,
      error: "already-returned",
    });
  });

  it("treats someone else's loan as not found, and changes nothing", async () => {
    const loan = await lend("borrower-1");

    const result = await db.renewLoan(loan.id, "borrower-2", FEB_20);

    expect(result).toEqual({ ok: false, error: "loan-not-found" });
    expect(await db.getLoan(loan.id)).toMatchObject({
      dueAt: "2026-03-01T12:00:00.000Z",
      renewedAt: null,
    });
  });

  it("treats an unknown id as not found", async () => {
    expect(await db.renewLoan("loan-finnes-ikke", "borrower-1", FEB_20)).toEqual({
      ok: false,
      error: "loan-not-found",
    });
  });
});
