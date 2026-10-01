import { addDays, type DateInput } from "@/lib/dates";
import { daysOverdue } from "@/lib/fees";
import type { Loan } from "@/lib/types";

/** Days one renewal adds to the due date. */
export const RENEWAL_DAYS = 28;

/**
 * Why a loan cannot be renewed. A borrower gets one renewal per loan, and only
 * while the book is out and on time: the late fee is worked out from `dueAt`,
 * so renewing an overdue loan would quietly wipe the fee it had run up.
 */
export type RenewalBlock = "already-returned" | "already-renewed" | "overdue";

export type RenewalError = "loan-not-found" | RenewalBlock;

export type RenewalResult =
  | { ok: true; loan: Loan }
  | { ok: false; error: RenewalError };

/** What stops `loan` from being renewed today, or `null` when nothing does. */
export function renewalBlock(loan: Loan, today: DateInput): RenewalBlock | null {
  if (loan.returnedAt !== null) return "already-returned";
  if (loan.renewedAt !== null) return "already-renewed";
  if (daysOverdue(loan, today) > 0) return "overdue";
  return null;
}

/**
 * The due date after a renewal. Counted from the current due date, not from
 * today — renewing early neither costs days nor wins them.
 */
export function renewedDueDate(loan: Loan): Date {
  return addDays(loan.dueAt, RENEWAL_DAYS);
}
