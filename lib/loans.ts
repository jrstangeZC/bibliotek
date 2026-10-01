import { countAvailableCopies, countHeldCopies, isActive } from "@/lib/availability";
import { addDays, daysBetween, type DateInput } from "@/lib/dates";
import * as db from "@/lib/db";
import { calculateLateFee, daysOverdue } from "@/lib/fees";
import { renewalBlock, type RenewalBlock, type RenewalResult } from "@/lib/renewals";
import { canBorrow, hasWaiting, waitingQueue } from "@/lib/reservations";
import type { Book, Borrower, Database, Loan, Reservation } from "@/lib/types";

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

function toLoanView(loan: Loan, today: DateInput, database: Database): LoanView {
  return {
    ...loan,
    status: getLoanStatus(loan, today),
    daysOverdue: daysOverdue(loan, today),
    daysRemaining: Math.max(0, daysBetween(today, loan.dueAt)),
    lateFee: calculateLateFee(loan, today),
    renewalBlock: renewalBlock(
      loan,
      today,
      hasWaiting(database.reservations, loan.bookId)
    ),
    book: database.books.find((book) => book.id === loan.bookId) ?? null,
    borrower:
      database.borrowers.find((borrower) => borrower.id === loan.borrowerId) ?? null,
  };
}

async function describe(loans: Loan[], today: DateInput): Promise<LoanView[]> {
  const database = await db.getSettled(today);
  return loans.map((loan) => toLoanView(loan, today, database));
}

/* --------------------------------------------------------- availability --- */

/** A book plus where its copies are right now, and who is queueing for it. */
export type BookView = Book & {
  /** On the shelf, free for anyone to borrow. */
  available: number;
  /** In someone's bag. */
  onLoan: number;
  /** On the pickup shelf, set aside for someone in the queue. */
  held: number;
  /** People in the queue without a copy set aside yet. */
  waiting: number;
};

function toBookView(book: Book, database: Database): BookView {
  const available = countAvailableCopies(book, database.loans, database.reservations);
  const held = countHeldCopies(database.reservations, book.id);
  return {
    ...book,
    available,
    held,
    onLoan: book.copies - available - held,
    waiting: waitingQueue(database.reservations, book.id).length,
  };
}

export async function listBooks(today: DateInput = new Date()): Promise<BookView[]> {
  const database = await db.getSettled(today);
  return database.books.map((book) => toBookView(book, database));
}

export async function findBook(
  id: string,
  today: DateInput = new Date()
): Promise<BookView | null> {
  const database = await db.getSettled(today);
  const book = database.books.find((candidate) => candidate.id === id);
  return book ? toBookView(book, database) : null;
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

export type ReturnResult =
  | {
      ok: true;
      loan: Loan;
      /** Who the returned copy was set aside for, if anyone was queueing. */
      heldFor: Reservation | null;
    }
  | { ok: false; error: LoanError };

/**
 * Lends out a copy of `bookId` to `borrowerId` for the standard loan period.
 * Fails when the title is unknown, or every copy is out or held for someone
 * else. A copy held for `borrowerId` is theirs to take.
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
      return current !== undefined && canBorrow(database, current, borrowerId);
    }
  );

  if (!loan) return { ok: false, error: "no-copies-available" };
  return { ok: true, loan };
}

/**
 * Takes a book back into the collection — or, if anyone is queueing for it,
 * onto the pickup shelf for the first in line.
 */
export async function registerReturn(
  loanId: string,
  now: Date = new Date()
): Promise<ReturnResult> {
  const existing = await db.getLoan(loanId);
  if (!existing) return { ok: false, error: "loan-not-found" };
  if (!isActive(existing)) return { ok: false, error: "already-returned" };

  const returned = await db.markLoanReturned(loanId, now.toISOString());
  if (!returned) return { ok: false, error: "loan-not-found" };

  return { ok: true, ...returned };
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
