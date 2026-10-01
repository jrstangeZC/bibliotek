import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { countActiveLoans, countHeldCopies, isActive, isActiveHold } from "@/lib/availability";
import { normalizeIsbn, type BookInput } from "@/lib/books";
import { renewalBlock, renewedDueDate, type RenewalResult } from "@/lib/renewals";
import {
  closeReservation,
  hasWaiting,
  isOpen,
  needsHandling,
  openReservationFor,
  reservationBlock,
  settleReservations,
  type CancelReservationResult,
  type ReservationResult,
} from "@/lib/reservations";
import type { Book, Borrower, Database, Loan, Reservation } from "@/lib/types";

/**
 * The only module that touches disk. Everything else goes through these
 * functions.
 *
 * `data/seed.json` is committed and never written to. `data/db.json` is the
 * working copy: it is created from the seed the first time anything is read,
 * and is the file every write lands in.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_FILE = path.join(DATA_DIR, "seed.json");
const DB_FILE = path.join(DATA_DIR, "db.json");

/**
 * Writes are read-modify-write, so two overlapping borrows would otherwise be
 * able to lose one another. Chaining every operation onto one promise keeps
 * them strictly sequential.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  // Keep the chain alive even if this operation rejects.
  queue = result.catch(() => undefined);
  return result;
}

async function read(): Promise<Database> {
  try {
    const database = JSON.parse(await readFile(DB_FILE, "utf8")) as Database;
    // A working copy written before roles existed would otherwise leave every
    // person role-less. Reading it as a plain borrower keeps it usable.
    for (const borrower of database.borrowers) borrower.role ??= "borrower";
    // Likewise a loan written before renewals existed has never been renewed.
    for (const loan of database.loans) loan.renewedAt ??= null;
    // And a working copy from before reservations has an empty queue.
    database.reservations ??= [];
    return database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;

    const seed = JSON.parse(await readFile(SEED_FILE, "utf8")) as Database;
    await write(seed);
    return seed;
  }
}

async function write(database: Database): Promise<void> {
  await writeFile(DB_FILE, `${JSON.stringify(database, null, 2)}\n`, "utf8");
}

/**
 * The database as of `now`, with reservations settled (see
 * `settleReservations`), so a rule never acts on a hold that has already run
 * out. A write that loads through this stores the settled state with it.
 */
async function load(now: Date | string): Promise<Database> {
  const database = await read();
  settleReservations(database, now);
  return database;
}

/* ---------------------------------------------------------------- reads ---
   Reads go through the same queue as writes so that nothing ever reads a file
   that is half-written. */

export async function getBooks(): Promise<Book[]> {
  return enqueue(async () => (await read()).books);
}

export async function getBook(id: string): Promise<Book | null> {
  const books = await getBooks();
  return books.find((book) => book.id === id) ?? null;
}

export async function getBorrowers(): Promise<Borrower[]> {
  return enqueue(async () => (await read()).borrowers);
}

export async function getBorrower(id: string): Promise<Borrower | null> {
  const borrowers = await getBorrowers();
  return borrowers.find((borrower) => borrower.id === id) ?? null;
}

/** Every loan ever registered — needed to work out availability. */
export async function getLoans(): Promise<Loan[]> {
  return enqueue(async () => (await read()).loans);
}

/** One borrower's loans, current and historic, newest first. */
export async function getLoansForBorrower(borrowerId: string): Promise<Loan[]> {
  const loans = await getLoans();
  return loans
    .filter((loan) => loan.borrowerId === borrowerId)
    .sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt));
}

/** Every loan that has not been returned yet, oldest due date first. */
export async function getActiveLoans(): Promise<Loan[]> {
  const loans = await getLoans();
  return loans.filter(isActive).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function getLoan(id: string): Promise<Loan | null> {
  const loans = await getLoans();
  return loans.find((loan) => loan.id === id) ?? null;
}

/** Every reservation ever made, open and closed, unsettled. */
export async function getReservations(): Promise<Reservation[]> {
  return enqueue(async () => (await read()).reservations);
}

/**
 * The whole database with reservations settled as of `now` — holds that ran
 * out are closed and their copies passed on. This is how the screens read
 * availability and queues.
 *
 * It never writes. Settling gives the same answer whenever it runs, so the
 * next write stores exactly what this showed; a page view leaves the data
 * file alone.
 */
export async function getSettled(now: Date | string): Promise<Database> {
  return enqueue(() => load(now));
}

/* --------------------------------------------------------------- writes --- */

export type NewLoan = Omit<Loan, "id" | "returnedAt" | "renewedAt">;

/**
 * Registers a loan and returns it.
 *
 * `precondition` is checked against the database inside the same queued
 * operation as the write, so a rule that depends on the current state — such as
 * "a copy must still be on the shelf" — cannot be overtaken by a loan
 * registered a moment earlier. Returns `null` when it fails.
 */
export async function createLoan(
  input: NewLoan,
  precondition: (database: Database) => boolean = () => true
): Promise<Loan | null> {
  return enqueue(async () => {
    const database = await load(input.borrowedAt);
    if (!precondition(database)) return null;

    const loan: Loan = {
      id: `loan-${randomUUID()}`,
      ...input,
      returnedAt: null,
      renewedAt: null,
    };

    database.loans.push(loan);

    // Borrowing the book is what a reservation was waiting for: it ends here,
    // whether a copy had been set aside or one was simply on the shelf.
    const reservation = openReservationFor(
      database.reservations,
      input.bookId,
      input.borrowerId
    );
    if (reservation) closeReservation(database, reservation, "collected", input.borrowedAt);

    await write(database);
    return loan;
  });
}

export type NewBorrower = Omit<Borrower, "id">;

/**
 * Enrols a person in the register. Returns `null` when the email is already
 * taken — checked inside the queued write, so two enrolments cannot slip past
 * one another.
 */
export async function createBorrower(input: NewBorrower): Promise<Borrower | null> {
  return enqueue(async () => {
    const database = await read();
    const taken = database.borrowers.some(
      (borrower) => borrower.email.toLowerCase() === input.email.toLowerCase()
    );
    if (taken) return null;

    // "laaner-", not "borrower-": this id lands in a URL after enrolment, and
    // URLs in this app are Norwegian.
    const borrower: Borrower = { id: `laaner-${randomUUID()}`, ...input };

    database.borrowers.push(borrower);
    await write(database);
    return borrower;
  });
}

export type NewBook = BookInput;

export type BookError =
  | "isbn-taken"
  | "book-not-found"
  | "copies-below-loans"
  | "book-on-loan";

export type BookResult =
  | { ok: true; book: Book }
  | {
      ok: false;
      error: BookError;
      /** Copies out right now — set when that is what blocked the write. */
      onLoan?: number;
      /** Copies set aside for the queue — set alongside `onLoan`. */
      held?: number;
    };

export type DeleteBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: "book-not-found" | "book-on-loan"; onLoan?: number };

function isbnTaken(database: Database, isbn: string, exceptId?: string): boolean {
  const wanted = normalizeIsbn(isbn);
  return database.books.some(
    (book) => book.id !== exceptId && normalizeIsbn(book.isbn) === wanted
  );
}

/**
 * Adds a title to the catalogue. Fails when another title already carries the
 * ISBN — a second copy of the same book is `copies`, not a second row.
 */
export async function createBook(input: NewBook): Promise<BookResult> {
  return enqueue(async () => {
    const database = await read();
    if (isbnTaken(database, input.isbn)) return { ok: false, error: "isbn-taken" };

    // "bok-", not "book-": this id lands in a URL, and URLs in this app are Norwegian.
    const book: Book = { id: `bok-${randomUUID()}`, ...input };

    database.books.push(book);
    await write(database);
    return { ok: true, book };
  });
}

/**
 * Rewrites a title's catalogue entry. The stock cannot drop below what is out
 * on loan plus what is held for the queue: availability is worked out as copies
 * minus both, so that would leave a book on the shelf that is in someone's bag.
 * Raising the stock sets the new copies aside for anyone waiting.
 */
export async function updateBook(
  id: string,
  input: NewBook,
  now: Date = new Date()
): Promise<BookResult> {
  return enqueue(async () => {
    const database = await load(now);
    const book = database.books.find((candidate) => candidate.id === id);
    if (!book) return { ok: false, error: "book-not-found" };

    if (isbnTaken(database, input.isbn, id)) return { ok: false, error: "isbn-taken" };

    const onLoan = countActiveLoans(database.loans, id);
    const held = countHeldCopies(database.reservations, id);
    if (input.copies < onLoan + held) {
      return { ok: false, error: "copies-below-loans", onLoan, held };
    }

    Object.assign(book, input);
    settleReservations(database, now);
    await write(database);
    return { ok: true, book };
  });
}

/**
 * Removes a title. Refused while any copy is out — the loan would be left
 * pointing at nothing, with no way to take it back in. Returned loans stay in
 * the history; the screens already show a loan whose book is gone as
 * «Ukjent tittel».
 *
 * The queue for the title goes with it. A held copy is counted as dealt with:
 * whoever removes the title from the catalogue is taking it off the shelf too.
 */
export async function deleteBook(
  id: string,
  now: Date = new Date()
): Promise<DeleteBookResult> {
  return enqueue(async () => {
    const database = await load(now);
    const index = database.books.findIndex((candidate) => candidate.id === id);
    if (index === -1) return { ok: false, error: "book-not-found" };

    const onLoan = countActiveLoans(database.loans, id);
    if (onLoan > 0) return { ok: false, error: "book-on-loan", onLoan };

    const at = now.toISOString();
    for (const reservation of database.reservations) {
      if (reservation.bookId !== id || !isOpen(reservation)) continue;
      if (isActiveHold(reservation)) reservation.handledAt = at;
      reservation.closedAt = at;
      reservation.outcome = "cancelled";
    }

    const [book] = database.books.splice(index, 1);
    await write(database);
    return { ok: true, book };
  });
}

/**
 * Whether the demo data may be reset from the interface.
 *
 * On in development. Off in production unless deliberately switched on with
 * `ALLOW_DEMO_RESET=true` — deployed, this button lets any visitor wipe the
 * demo for everyone else, so it is not something to ship by accident.
 */
export const DEMO_RESET_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DEMO_RESET === "true";

/**
 * Puts the working copy back to `data/seed.json`.
 *
 * `scripts/reset-data.mjs` deletes the file and lets the next read rebuild it.
 * That is fine from a cold terminal, but not from a running server: it goes
 * through the same queue as everything else here, so a reset cannot land in the
 * middle of a borrow and leave it writing into a database that no longer
 * matches what its precondition saw.
 */
export async function resetDatabase(): Promise<void> {
  return enqueue(async () => {
    const seed = JSON.parse(await readFile(SEED_FILE, "utf8")) as Database;
    await write(seed);
  });
}

export type ReturnedLoan = {
  loan: Loan;
  /** The reservation the returned copy was set aside for, if anyone was waiting. */
  heldFor: Reservation | null;
};

/**
 * Stamps a loan as returned. Returns the updated loan, or `null` if no loan has
 * that id. A loan that was already returned keeps its original return date.
 *
 * If anyone is queueing for the title, the copy is set aside for the first in
 * line on the spot — the desk needs to know before it goes back on the shelf.
 */
export async function markLoanReturned(
  id: string,
  returnedAt: string
): Promise<ReturnedLoan | null> {
  return enqueue(async () => {
    const database = await load(returnedAt);
    const loan = database.loans.find((candidate) => candidate.id === id);

    if (!loan) return null;
    if (loan.returnedAt !== null) return { loan, heldFor: null };

    loan.returnedAt = returnedAt;
    const readied = settleReservations(database, returnedAt);
    await write(database);
    return {
      loan,
      heldFor: readied.find((reservation) => reservation.bookId === loan.bookId) ?? null,
    };
  });
}

/**
 * Extends a borrower's own loan by one renewal period (see `lib/renewals.ts`).
 *
 * The rules are checked against the loan as the queued write sees it, so a
 * double click or two open tabs cannot renew the same loan twice. A loan that
 * belongs to someone else is reported as not found — the caller learns nothing
 * about loans that are not theirs.
 */
export async function renewLoan(
  id: string,
  borrowerId: string,
  now: Date
): Promise<RenewalResult> {
  return enqueue(async () => {
    const database = await load(now);
    const loan = database.loans.find(
      (candidate) => candidate.id === id && candidate.borrowerId === borrowerId
    );
    if (!loan) return { ok: false, error: "loan-not-found" };

    const block = renewalBlock(loan, now, hasWaiting(database.reservations, loan.bookId));
    if (block) return { ok: false, error: block };

    loan.dueAt = renewedDueDate(loan).toISOString();
    loan.renewedAt = now.toISOString();
    await write(database);
    return { ok: true, loan };
  });
}

/* ---------------------------------------------------------- reservations --- */

/**
 * Puts `borrowerId` in the queue for `bookId`. The rules (see
 * `reservationBlock`) are checked inside the queued write, so a double click
 * cannot reserve twice, and a copy returned a moment earlier is borrowed
 * rather than queued for.
 */
export async function createReservation(
  bookId: string,
  borrowerId: string,
  now: Date
): Promise<ReservationResult> {
  return enqueue(async () => {
    const database = await load(now);
    const book = database.books.find((candidate) => candidate.id === bookId);
    if (!book) return { ok: false, error: "book-not-found" };

    const block = reservationBlock(database, book, borrowerId);
    if (block) return { ok: false, error: block };

    // "reservasjon-", not "reservation-": URLs in this app are Norwegian.
    const reservation: Reservation = {
      id: `reservasjon-${randomUUID()}`,
      bookId,
      borrowerId,
      reservedAt: now.toISOString(),
      readyAt: null,
      closedAt: null,
      outcome: null,
      passedToId: null,
      handledAt: null,
      notifiedAt: null,
    };

    database.reservations.push(reservation);
    await write(database);
    return { ok: true, reservation };
  });
}

/**
 * Gives up a place in the queue. With `borrowerId`, only that person's own
 * reservations are found — anyone else's is reported as not found, as with
 * `renewLoan`. With `null`, it is the desk acting, and any reservation goes.
 *
 * A held copy passes straight to the next in line.
 */
export async function cancelReservation(
  id: string,
  borrowerId: string | null,
  now: Date
): Promise<CancelReservationResult> {
  return enqueue(async () => {
    const database = await load(now);
    const reservation = database.reservations.find(
      (candidate) =>
        candidate.id === id &&
        isOpen(candidate) &&
        (borrowerId === null || candidate.borrowerId === borrowerId)
    );
    if (!reservation) return { ok: false, error: "reservation-not-found" };

    const passedTo = closeReservation(database, reservation, "cancelled", now);
    await write(database);
    return { ok: true, reservation, passedTo };
  });
}

/**
 * Records that the desk has moved the copy of a hold that ended uncollected —
 * on to the next person's shelf, or back among the rest. Returns `null` when
 * there is no such hold left to deal with.
 */
export async function markHoldHandled(id: string, now: Date): Promise<Reservation | null> {
  return enqueue(async () => {
    const database = await load(now);
    const reservation = database.reservations.find((candidate) => candidate.id === id);
    if (!reservation || !needsHandling(reservation)) return null;

    reservation.handledAt = now.toISOString();
    await write(database);
    return reservation;
  });
}
