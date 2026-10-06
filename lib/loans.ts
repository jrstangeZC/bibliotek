import { isLibrarian } from "@/lib/auth";
import { countAvailableCopies, countHeldCopies, isActive } from "@/lib/availability";
import { byTitle } from "@/lib/books";
import { addDays, daysBetween, type DateInput } from "@/lib/dates";
import * as db from "@/lib/db";
import { calculateLateFee, daysOverdue } from "@/lib/fees";
import { renewalBlock, type RenewalBlock, type RenewalResult } from "@/lib/renewals";
import {
  canBorrow,
  hasWaiting,
  holdDeadline,
  isOpen,
  needsHandling,
  openReservationFor,
  queuePosition,
  reservationBlock,
  waitingQueue,
  type CancelReservationResult,
  type ReservationBlock,
  type ReservationResult,
} from "@/lib/reservations";
import {
  bookHaystack,
  matchesQuery,
  parseQuery,
  personHaystack,
  type Haystack,
} from "@/lib/search";
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

/** One person's open reservations, held copies first. */
function openReservationsOf(database: Database, borrowerId: string): ReservationView[] {
  return database.reservations
    .filter((reservation) => isOpen(reservation) && reservation.borrowerId === borrowerId)
    .map((reservation) => toReservationView(reservation, database))
    .sort(byUrgency);
}

/** One person's open reservations. */
export async function listReservationsForBorrower(
  borrowerId: string,
  today: DateInput = new Date()
): Promise<ReservationView[]> {
  return openReservationsOf(await db.getSettled(today), borrowerId);
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

/** One person's loans, current and historic, in no particular order. */
function loansOf(database: Database, borrowerId: string, today: DateInput): LoanView[] {
  return database.loans
    .filter((loan) => loan.borrowerId === borrowerId)
    .map((loan) => toLoanView(loan, today, database));
}

/** Latest loan first. */
function newestFirst(a: LoanView, b: LoanView): number {
  return b.borrowedAt.localeCompare(a.borrowedAt);
}

/** One person's loans, current and historic, newest first. */
export async function listLoansForBorrower(
  borrowerId: string,
  today: DateInput = new Date()
): Promise<LoanView[]> {
  return loansOf(await db.getSettled(today), borrowerId, today).sort(newestFirst);
}

/** A person's own view: loans newest first and open reservations, from one read. */
export async function listBorrowerActivity(
  borrowerId: string,
  today: DateInput = new Date()
): Promise<{ loans: LoanView[]; reservations: ReservationView[] }> {
  const database = await db.getSettled(today);
  return {
    loans: loansOf(database, borrowerId, today).sort(newestFirst),
    reservations: openReservationsOf(database, borrowerId),
  };
}

/**
 * Late fees still owed: those on loans that are out. A returned loan keeps the
 * fee it ran up (see `calculateLateFee`), but nothing records it being paid, so
 * it is shown on the loan in the history rather than counted as owing.
 */
export function outstandingFees(loans: LoanView[]): number {
  return loans
    .filter((loan) => loan.status !== "returned")
    .reduce((sum, loan) => sum + loan.lateFee, 0);
}

/** Everything the desk's page about one person shows, each list in its display order. */
export type BorrowerOverview = {
  borrower: Borrower;
  /** Out now, the one due first on top. */
  active: LoanView[];
  /** Back on the shelf, the latest return on top. */
  returned: LoanView[];
  /** Open only, held copies first. */
  reservations: ReservationView[];
};

/**
 * One person with their loans and open reservations, read in a single pass —
 * every read waits its turn in the database queue, so one load beats several.
 */
export async function findBorrowerOverview(
  borrowerId: string,
  today: DateInput = new Date()
): Promise<BorrowerOverview | null> {
  const database = await db.getSettled(today);
  const borrower = database.borrowers.find((candidate) => candidate.id === borrowerId);
  if (!borrower) return null;

  const loans = loansOf(database, borrowerId, today);

  return {
    borrower,
    active: loans
      .filter((loan) => loan.status !== "returned")
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    returned: loans
      .filter((loan) => loan.status === "returned")
      .sort((a, b) => (b.returnedAt ?? "").localeCompare(a.returnedAt ?? "")),
    reservations: openReservationsOf(database, borrowerId),
  };
}

export async function listActiveLoans(today: DateInput = new Date()): Promise<LoanView[]> {
  return describe(await db.getActiveLoans(), today);
}

/* ---------------------------------------------------------------- search --- */

/**
 * How far a search reaches. It follows from who is searching, never from the
 * page: `public` when signed out, `own` for a borrower, `desk` for a librarian.
 */
export type SearchScope = "public" | "own" | "desk";

/** A person the desk's search found, with how many books they have out. */
export type BorrowerHit = Borrower & { onLoan: number };

export type SearchResults = {
  /** The search as typed, trimmed. `""` when it is missing. */
  query: string;
  scope: SearchScope;
  /** `false` for an empty search, including one that was only punctuation. */
  searched: boolean;
  books: BookView[];
  /** Always empty outside `desk`. */
  borrowers: BorrowerHit[];
  /** Active loans only, and only the viewer's own outside `desk`. */
  loans: LoanView[];
  /** Open reservations only, and only the viewer's own outside `desk`. */
  reservations: ReservationView[];
  total: number;
  /** The book's id when the search is a complete ISBN and that book is the only match. */
  isbnTarget: string | null;
};

function scopeFor(viewer: Borrower | null): SearchScope {
  if (viewer === null) return "public";
  return isLibrarian(viewer) ? "desk" : "own";
}

/**
 * What a loan or reservation answers to. It has no text of its own, so it
 * matches through its book, and at the desk through its borrower too. Never
 * through the viewer's own name: a search for it would list everything they have.
 */
function activityHaystack(
  record: { book: Book | null; borrower: Borrower | null },
  scope: SearchScope
): Haystack {
  const book = record.book ? bookHaystack(record.book) : { text: [] };
  const person =
    scope === "desk" && record.borrower ? personHaystack(record.borrower).text : [];

  return { text: [...book.text, ...person], isbn: book.isbn };
}

/**
 * One search across the catalogue, the register, active loans and open
 * reservations, cut to what `viewer` may see. The scope is settled here rather
 * than on the page, so a page never holds rows it must not show. Each group
 * keeps the order of the register it comes from; there is no ranking.
 */
export async function searchLibrary(
  q: string | string[] | undefined,
  viewer: Borrower | null,
  today: DateInput = new Date()
): Promise<SearchResults> {
  const scope = scopeFor(viewer);
  const parsed = parseQuery(q);
  const empty: SearchResults = {
    query: typeof q === "string" ? q.trim() : "",
    scope,
    searched: parsed !== null,
    books: [],
    borrowers: [],
    loans: [],
    reservations: [],
    total: 0,
    isbnTarget: null,
  };
  if (parsed === null) return empty;

  const database = await db.getSettled(today);
  const matches = (haystack: Haystack) => matchesQuery(parsed, haystack);
  // Other people's loans and reservations are gone before anything is matched,
  // so «marit» finds exactly as little for a borrower as «xyz» does.
  const visible = (record: { borrowerId: string }) =>
    scope === "desk" || (scope === "own" && record.borrowerId === viewer?.id);

  const books = database.books
    .filter((book) => matches(bookHaystack(book)))
    .sort(byTitle)
    .map((book) => toBookView(book, database, null));

  const borrowers =
    scope === "desk"
      ? database.borrowers
          .filter((person) => matches(personHaystack(person)))
          .sort((a, b) => a.name.localeCompare(b.name, "nb"))
          .map((person) => ({
            ...person,
            onLoan: database.loans.filter(
              (loan) => loan.borrowerId === person.id && isActive(loan)
            ).length,
          }))
      : [];

  const loans = database.loans
    .filter((loan) => isActive(loan) && visible(loan))
    .map((loan) => toLoanView(loan, today, database))
    .filter((loan) => matches(activityHaystack(loan, scope)))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const reservations = database.reservations
    .filter((reservation) => isOpen(reservation) && visible(reservation))
    .map((reservation) => toReservationView(reservation, database))
    .filter((reservation) => matches(activityHaystack(reservation, scope)))
    .sort(byDeskOrder);

  const total = books.length + borrowers.length + loans.length + reservations.length;

  return {
    ...empty,
    books,
    borrowers,
    loans,
    reservations,
    total,
    // A scanned or pasted ISBN means «open this book». At the desk, an ISBN with
    // copies out also finds the loans, and then who has them is the answer.
    isbnTarget:
      parsed.completeIsbn !== null && total === 1 && books.length === 1
        ? books[0].id
        : null,
  };
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

/** The desk's order: held copies first, then the queues, title by title, in queue order. */
function byDeskOrder(a: ReservationView, b: ReservationView): number {
  return (
    byUrgency(a, b) ||
    (a.book?.title ?? "").localeCompare(b.book?.title ?? "", "nb") ||
    (a.position ?? 0) - (b.position ?? 0)
  );
}

/** Every open reservation in the library: held copies first, then the queues. */
export async function listOpenReservations(
  today: DateInput = new Date()
): Promise<ReservationView[]> {
  const database = await db.getSettled(today);
  return database.reservations
    .filter(isOpen)
    .map((reservation) => toReservationView(reservation, database))
    .sort(byDeskOrder);
}

/** One open reservation, or `null` once it has been collected, cancelled or run out. */
export async function findOpenReservation(
  id: string,
  today: DateInput = new Date()
): Promise<ReservationView | null> {
  const database = await db.getSettled(today);
  const reservation = database.reservations.find(
    (candidate) => candidate.id === id && isOpen(candidate)
  );
  return reservation ? toReservationView(reservation, database) : null;
}

/**
 * A copy on the pickup shelf under the wrong name: its hold ran out or was
 * cancelled, and the desk has not moved it yet.
 */
export type HoldToHandle = {
  id: string;
  outcome: "expired" | "cancelled";
  closedAt: string;
  /** The last day the copy could have been collected. */
  deadline: string;
  book: Book | null;
  /** Who the copy was set aside for. */
  borrower: Borrower | null;
  /** Who it is set aside for now — `null` means back on the shelf. */
  passedTo: Borrower | null;
};

/** Copies the desk has to move, the longest-standing first. */
export async function listHoldsToHandle(
  today: DateInput = new Date()
): Promise<HoldToHandle[]> {
  const database = await db.getSettled(today);
  const person = (id: string | undefined) =>
    database.borrowers.find((borrower) => borrower.id === id) ?? null;

  return database.reservations
    .filter(needsHandling)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!))
    .map((reservation) => ({
      id: reservation.id,
      outcome: reservation.outcome as HoldToHandle["outcome"],
      closedAt: reservation.closedAt!,
      deadline: holdDeadline(reservation.readyAt!).toISOString(),
      book: database.books.find((book) => book.id === reservation.bookId) ?? null,
      borrower: person(reservation.borrowerId),
      passedTo: person(
        database.reservations.find((next) => next.id === reservation.passedToId)
          ?.borrowerId
      ),
    }));
}

/** Records that the desk has moved the copy of a hold that ended uncollected. */
export async function markHoldHandled(
  reservationId: string,
  now: Date = new Date()
): Promise<Reservation | null> {
  return db.markHoldHandled(reservationId, now);
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
