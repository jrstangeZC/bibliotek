import { describe, expect, it } from "vitest";

import { RENEWAL_DAYS, renewalBlock, renewedDueDate } from "@/lib/renewals";
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

describe("renewalBlock", () => {
  it("lets a loan that is out and on time be renewed", () => {
    expect(renewalBlock(loan(), "2026-02-20T12:00:00.000Z")).toBeNull();
  });

  it("still allows it on the due date itself, whatever the clock says", () => {
    expect(renewalBlock(loan(), "2026-03-01T23:59:00.000Z")).toBeNull();
  });

  it("blocks a loan that is a day past its due date", () => {
    expect(renewalBlock(loan(), "2026-03-02T00:01:00.000Z")).toBe("overdue");
  });

  it("blocks a loan that has been renewed once", () => {
    const renewed = loan({ renewedAt: "2026-02-20T12:00:00.000Z" });
    expect(renewalBlock(renewed, "2026-02-21T12:00:00.000Z")).toBe("already-renewed");
  });

  it("blocks a loan that is back on the shelf", () => {
    const returned = loan({ returnedAt: "2026-02-25T09:00:00.000Z" });
    expect(renewalBlock(returned, "2026-02-26T12:00:00.000Z")).toBe("already-returned");
  });

  it("blocks a loan on a title someone is waiting for", () => {
    expect(renewalBlock(loan(), "2026-02-20T12:00:00.000Z", true)).toBe("reserved");
  });

  it("names the overdue loan before the queue", () => {
    expect(renewalBlock(loan(), "2026-03-05T12:00:00.000Z", true)).toBe("overdue");
  });

  it("names the return first when a loan is both returned and renewed", () => {
    const both = loan({
      renewedAt: "2026-02-20T12:00:00.000Z",
      returnedAt: "2026-02-25T09:00:00.000Z",
    });
    expect(renewalBlock(both, "2026-02-26T12:00:00.000Z")).toBe("already-returned");
  });
});

describe("renewedDueDate", () => {
  it("adds 28 days to the current due date, keeping the time of day", () => {
    expect(RENEWAL_DAYS).toBe(28);
    expect(renewedDueDate(loan()).toISOString()).toBe("2026-03-29T12:00:00.000Z");
  });
});
