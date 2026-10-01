import { countAvailableCopies, isActive, isBookAvailable } from "@/lib/availability";
import { addDays, daysBetween, type DateInput } from "@/lib/dates";
import * as db from "@/lib/db";
import { calculateLateFee, daysOverdue } from "@/lib/fees";
import { renewalBlock, type RenewalBlock, type RenewalResult } from "@/lib/renewals";
import type { Book, Borrower, Loan } from "@/lib/types";

/** How long a loan runs, from the day it is taken out. */
export const LOAN_PERIOD_DAYS = 28;

export function dueDateFor(borrowedAt: DateInput): Date {
  return addDays(borrowedAt, LOAN_PERIOD_DAYS);
}

/* --------------------------------------------------------------- status --- */

export type LoanStatus = "active" | "overdue" | "returned";

export function getLoanStatus(loan: Loan, today: DateInput): LoanStatus {
  if (!isActive(loan)) return "returned";
  return daysOverdue(loan, today) > 0 ? "overdue" : "active";
}

/** A loan with everything a screen or an API response needs to describe it. */
export type LoanView = Loan & {
  status: LoanStatus;
  daysOverdue: number;
  daysRemaining: number;
  lateFee: number;
  /** What stops the borrower renewing this loan today; `null` when nothing does. */
  renewalBlock: RenewalBlock | null;
  book: Book | null;
  borrower: Borrower | null;
};

function toLoanView(
  loan: Loan,
  today: DateInput,
  books: Book[],
  borrowers: Borrower[]
): LoanView {
  return {
    ...loan,
    status: getLoanStatus(loan, today),
    daysOverdue: daysOverdue(loan, today),
    daysRemaining: Math.max(0, daysBetween(today, loan.dueAt)),
    lateFee: calculateLateFee(loan, today),
    renewalBlock: renewalBlock(loan, today),
    book: books.find((book) => book.id === loan.bookId) ?? null,
    borrower: borrowers.find((borrower) => borrower.id === loan.borrowerId) ?? null,
  };
}

async function describe(loans: Loan[], today: DateInput): Promise<LoanView[]> {
  const [books, borrowers] = await Promise.all([db.getBooks(), db.getBorrowers()]);
  return loans.map((loan) => toLoanView(loan, today, books, borrowers));
}

/* --------------------------------------------------------- availability --- */

/** A book plus how many copies are on the shelf right now. */
export type BookView = Book & {
  available: number;
  onLoan: number;
};

function toBookView(book: Book, loans: Loan[]): BookView {
  const available = countAvailableCopies(book, loans);
  return { ...book, available, onLoan: book.copies - available };
}

export async function listBooks(): Promise<BookView[]> {
  const [books, loans] = await Promise.all([db.getBooks(), db.getLoans()]);
  return books.map((book) => toBookView(book, loans));
}

export async function findBook(id: string): Promise<BookView | null> {
  const book = await db.getBook(id);
  if (!book) return null;

  return toBookView(book, await db.getLoans());
}

/** The active loans on one title, so a detail page can say when a copy is back. */
export async function listActiveLoansForBook(
  id: string,
  today: DateInput = new Date()
): Promise<LoanView[]> {
  const loans = await db.getActiveLoans();
  return describe(
    loans.filter((loan) => loan.bookId === id),
    today
  );
}

/* --------------------------------------------------------------- queries --- */

export async function listLoansForBorrower(
  borrowerId: string,
  today: DateInput = new Date()
): Promise<LoanView[]> {
  return describe(await db.getLoansForBorrower(borrowerId), today);
}

export async function listActiveLoans(today: DateInput = new Date()): Promise<LoanView[]> {
  return describe(await db.getActiveLoans(), today);
}

/* -------------------------------------------------------------- commands --- */

export type LoanError =
  | "book-not-found"
  | "no-copies-available"
  | "loan-not-found"
  | "already-returned";

export type LoanResult =
  | { ok: true; loan: Loan }
  | { ok: false; error: LoanError };

/**
 * Lends out a copy of `bookId` to `borrowerId` for the standard loan period.
 * Fails when the title is unknown or every copy is already out.
 */
export async function borrowBook(
  bookId: string,
  borrowerId: string,
  now: Date = new Date()
): Promise<LoanResult> {
  const book = await db.getBook(bookId);
  if (!book) return { ok: false, error: "book-not-found" };

  const loan = await db.createLoan(
    {
      bookId,
      borrowerId,
      borrowedAt: now.toISOString(),
      dueAt: dueDateFor(now).toISOString(),
    },
    // Re-checked against the state the write itself sees, so two borrowers
    // cannot take the last copy at the same moment.
    (database) => {
      const current = database.books.find((candidate) => candidate.id === bookId);
      return current !== undefined && isBookAvailable(current, database.loans);
    }
  );

  if (!loan) return { ok: false, error: "no-copies-available" };
  return { ok: true, loan };
}

/** Takes a book back into the collection. */
export async function registerReturn(
  loanId: string,
  now: Date = new Date()
): Promise<LoanResult> {
  const existing = await db.getLoan(loanId);
  if (!existing) return { ok: false, error: "loan-not-found" };
  if (!isActive(existing)) return { ok: false, error: "already-returned" };

  const loan = await db.markLoanReturned(loanId, now.toISOString());
  if (!loan) return { ok: false, error: "loan-not-found" };

  return { ok: true, loan };
}

/**
 * Extends `borrowerId`'s own loan by one renewal period. Allowed once per loan,
 * and not once it is overdue or returned — see `lib/renewals.ts`.
 */
export async function renewLoan(
  loanId: string,
  borrowerId: string,
  now: Date = new Date()
): Promise<RenewalResult> {
  return db.renewLoan(loanId, borrowerId, now);
}
