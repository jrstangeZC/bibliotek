import { describe, expect, it } from "vitest";

import { calculateLateFee, LATE_FEE_CAP, LATE_FEE_PER_DAY } from "@/lib/fees";
import type { Loan } from "@/lib/types";

/** A loan due at noon on 1 March 2026, so clock time can be varied around it. */
function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-test",
    bookId: "book-1",
    borrowerId: "borrower-1",
    borrowedAt: "2026-02-01T12:00:00.000Z",
    dueAt: "2026-03-01T12:00:00.000Z",
    returnedAt: null,
    renewedAt: null,
    ...overrides,
  };
}

describe("calculateLateFee", () => {
  it("is nothing before the due date", () => {
    expect(calculateLateFee(loan(), "2026-02-20T12:00:00.000Z")).toBe(0);
  });

  it("is nothing on the due date itself", () => {
    expect(calculateLateFee(loan(), "2026-03-01T12:00:00.000Z")).toBe(0);
  });

  it("ignores the clock — a loan due at noon is not late at 23:59 that day", () => {
    expect(calculateLateFee(loan(), "2026-03-01T23:59:00.000Z")).toBe(0);
  });

  it("charges 10 kr the first day past the due date", () => {
    expect(calculateLateFee(loan(), "2026-03-02T00:01:00.000Z")).toBe(
      LATE_FEE_PER_DAY
    );
  });

  it("charges 10 kr per day", () => {
    expect(calculateLateFee(loan(), "2026-03-08T12:00:00.000Z")).toBe(70);
  });

  it("reaches the cap after 20 days", () => {
    expect(calculateLateFee(loan(), "2026-03-21T12:00:00.000Z")).toBe(LATE_FEE_CAP);
  });

  it("never exceeds the cap, however long the book is kept", () => {
    expect(calculateLateFee(loan(), "2027-03-01T12:00:00.000Z")).toBe(LATE_FEE_CAP);
  });

  it("accepts a Date as well as a string", () => {
    expect(calculateLateFee(loan(), new Date("2026-03-04T12:00:00.000Z"))).toBe(30);
  });

  describe("returned loans", () => {
    it("costs nothing when returned in time", () => {
      const returned = loan({ returnedAt: "2026-02-25T09:00:00.000Z" });
      expect(calculateLateFee(returned, "2026-06-01T12:00:00.000Z")).toBe(0);
    });

    it("freezes the fee at the return date instead of growing with today", () => {
      const returned = loan({ returnedAt: "2026-03-06T09:00:00.000Z" });

      expect(calculateLateFee(returned, "2026-03-06T09:00:00.000Z")).toBe(50);
      expect(calculateLateFee(returned, "2026-12-31T09:00:00.000Z")).toBe(50);
    });

    it("caps a very late return too", () => {
      const returned = loan({ returnedAt: "2026-09-01T09:00:00.000Z" });
      expect(calculateLateFee(returned, "2026-09-02T09:00:00.000Z")).toBe(
        LATE_FEE_CAP
      );
    });
  });
});
