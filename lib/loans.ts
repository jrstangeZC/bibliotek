import { countAvailableCopies, countHeldCopies, isActive } from "@/lib/availability";
import { addDays, daysBetween, type DateInput } from "@/lib/dates";
import * as db from "@/lib/db";
import { calculateLateFee, daysOverdue } from "@/lib/fees";
import { renewalBlock, type RenewalBlock, type RenewalResult } from "@/lib/renewals";
import {
  canBorrow,
  hasWaiting,
  holdDeadline,
  isOpen,
  openReservationFor,
  queuePosition,
  reservationBlock,
  waitingQueue,
  type CancelReservationResult,
  type ReservationBlock,
  type ReservationResult,
} from "@/lib/reservations";
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

/** Where one signed-in person stands with a title. */
export type ViewerStanding = {
  /** A copy is on the shelf for anyone, or one is held for them. */
  canBorrow: boolean;
  /** Their open reservation on the title, if they have one. */
  reservation: ReservationView | null;
  /** Why they cannot reserve it, or `null` when they can. */
  reservationBlock: ReservationBlock | null;
};

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
  /** Set when the book is described for a signed-in person. */
  viewer: ViewerStanding | null;
};

function toBookView(book: Book, database: Database, viewerId: string | null): BookView {
  const available = countAvailableCopies(book, database.loans, database.reservations);
  const held = countHeldCopies(database.reservations, book.id);
  const mine = viewerId
    ? openReservationFor(database.reservations, book.id, viewerId)
    : null;

  return {
    ...book,
    available,
    held,
    onLoan: book.copies - available - held,
    waiting: waitingQueue(database.reservations, book.id).length,
    viewer: viewerId
      ? {
          canBorrow: canBorrow(database, book, viewerId),
          reservation: mine ? toReservationView(mine, database) : null,
          reservationBlock: reservationBlock(database, book, viewerId),
        }
      : null,
  };
}

/** The whole collection. Pass `viewerId` to learn where that person stands with each title. */
export async function listBooks(
  today: DateInput = new Date(),
  viewerId: string | null = null
): Promise<BookView[]> {
  const database = await db.getSettled(today);
  return database.books.map((book) => toBookView(book, database, viewerId));
}

export async function findBook(
  id: string,
  today: DateInput = new Date(),
  viewerId: string | null = null
): Promise<BookView | null> {
  const database = await db.getSettled(today);
  const book = database.books.find((candidate) => candidate.id === id);
  return book ? toBookView(book, database, viewerId) : null;
}

/* ---------------------------------------------------------- reservations --- */

export type ReservationStatus = "waiting" | "ready";

/** An open reservation with everything a screen needs to describe it. */
export type ReservationView = Reservation & {
  /** `ready` once a copy is set aside. */
  status: ReservationStatus;
  /** Place in the queue, from 1; `null` once a copy is held. */
  position: number | null;
  /** The last day to collect a held copy; `null` while waiting. */
  deadline: string | null;
  book: Book | null;
  borrower: Borrower | null;
};

function toReservationView(reservation: Reservation, database: Database): ReservationView {
  return {
    ...reservation,
    status: reservation.readyAt === null ? "waiting" : "ready",
    position: queuePosition(database.reservations, reservation),
    deadline: reservation.readyAt ? holdDeadline(reservation.readyAt).toISOString() : null,
    book: database.books.find((book) => book.id === reservation.bookId) ?? null,
    borrower:
      database.borrowers.find((borrower) => borrower.id === reservation.borrowerId) ??
      null,
  };
}

/** Held copies first, soonest deadline on top; then the queue, by when people joined. */
function byUrgency(a: ReservationView, b: ReservationView): number {
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return a.reservedAt.localeCompare(b.reservedAt);
}

/** One person's open reservations. */
export async function listReservationsForBorrower(
  borrowerId: string,
  today: DateInput = new Date()
): Promise<ReservationView[]> {
  const database = await db.getSettled(today);
  return database.reservations
    .filter((reservation) => isOpen(reservation) && reservation.borrowerId === borrowerId)
    .map((reservation) => toReservationView(reservation, database))
    .sort(byUrgency);
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

/** Puts `borrowerId` in the queue for a title with every copy out. */
export async function reserveBook(
  bookId: string,
  borrowerId: string,
  now: Date = new Date()
): Promise<ReservationResult> {
  return db.createReservation(bookId, borrowerId, now);
}

/**
 * Gives up a reservation. With `borrowerId`, only that person's own; with
 * `null`, any — the desk acting. A held copy goes on to the next in line.
 */
export async function cancelReservation(
  reservationId: string,
  borrowerId: string | null,
  now: Date = new Date()
): Promise<CancelReservationResult> {
  return db.cancelReservation(reservationId, borrowerId, now);
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
