import {
  countAvailableCopies,
  isActive,
  isActiveHold,
  isBookAvailable,
} from "@/lib/availability";
import { addDays, startOfDay, toDate, type DateInput } from "@/lib/dates";
import type { Book, Database, Reservation, ReservationOutcome } from "@/lib/types";

/**
 * Reservations: a queue per title, first come first served. When a copy comes
 * back it is set aside — *held* — for the first person in line, who then has
 * `HOLD_DAYS` to collect it before it moves on to the next.
 */

/** Days a held copy waits on the pickup shelf. */
export const HOLD_DAYS = 7;

/** Open reservations one person may have at once, held copies included. */
export const MAX_OPEN_RESERVATIONS = 3;

export function isOpen(reservation: Reservation): boolean {
  return reservation.closedAt === null;
}

/** In the queue with no copy set aside yet. */
export function isWaiting(reservation: Reservation): boolean {
  return isOpen(reservation) && reservation.readyAt === null;
}

/**
 * The last day a held copy can be collected — the date the screens show as
 * «Hent innen». Counted in whole UTC days like every other deadline here.
 */
export function holdDeadline(readyAt: DateInput): Date {
  return addDays(readyAt, HOLD_DAYS);
}

/**
 * The instant a hold runs out: midnight UTC after the deadline day, so the
 * whole of that day counts, whatever the clock said when the copy came in.
 */
export function holdEndsAt(readyAt: DateInput): Date {
  return addDays(new Date(startOfDay(holdDeadline(readyAt))), 1);
}

function isHoldExpired(reservation: Reservation, now: DateInput): boolean {
  return (
    isActiveHold(reservation) &&
    toDate(now).getTime() >= holdEndsAt(reservation.readyAt!).getTime()
  );
}

function byQueueOrder(a: Reservation, b: Reservation): number {
  return a.reservedAt.localeCompare(b.reservedAt) || a.id.localeCompare(b.id);
}

/** The people still waiting for `bookId`, first in line first. */
export function waitingQueue(reservations: Reservation[], bookId: string): Reservation[] {
  return reservations
    .filter((reservation) => isWaiting(reservation) && reservation.bookId === bookId)
    .sort(byQueueOrder);
}

/** Whether anyone is queueing for `bookId` without a copy set aside. */
export function hasWaiting(reservations: Reservation[], bookId: string): boolean {
  return reservations.some(
    (reservation) => isWaiting(reservation) && reservation.bookId === bookId
  );
}

/** 1 for the front of the queue. `null` for a reservation that is not waiting. */
export function queuePosition(
  reservations: Reservation[],
  reservation: Reservation
): number | null {
  if (!isWaiting(reservation)) return null;

  const index = waitingQueue(reservations, reservation.bookId).findIndex(
    (candidate) => candidate.id === reservation.id
  );
  return index === -1 ? null : index + 1;
}

/**
 * A hold that ended without the book being collected. The copy is still
 * physically on the pickup shelf under the wrong name until the desk moves it —
 * on to the next person, or back on the shelf.
 */
export function needsHandling(reservation: Reservation): boolean {
  return (
    reservation.closedAt !== null &&
    reservation.readyAt !== null &&
    (reservation.outcome === "expired" || reservation.outcome === "cancelled") &&
    reservation.handledAt === null
  );
}

/* ------------------------------------------------------------- settling --- */

/**
 * Ends `reservation` and, if it held a copy, hands that copy straight to the
 * next person in line — their hold starting at `at`, the moment it came free.
 * Returns the reservation that got the copy, if any.
 *
 * Only someone who was already queueing at `at` qualifies: a copy that came
 * free with nobody waiting went back on the shelf, whoever reserved later.
 */
export function closeReservation(
  database: Database,
  reservation: Reservation,
  outcome: ReservationOutcome,
  at: DateInput
): Reservation | null {
  const instant = toDate(at).toISOString();
  const held = isActiveHold(reservation);

  reservation.closedAt = instant;
  reservation.outcome = outcome;
  if (!held || outcome === "collected") return null;

  const next = waitingQueue(database.reservations, reservation.bookId).find(
    (candidate) => candidate.reservedAt <= instant
  );
  reservation.passedToId = next?.id ?? null;
  if (!next) return null;

  next.readyAt = instant;
  return next;
}

/**
 * Brings the reservations up to date with the rest of the database at `now`,
 * changing `database` in place. Returns the reservations that were given a
 * held copy along the way.
 *
 * 1. A reservation for a title or person no longer in the register is closed.
 * 2. Holds that ran out are closed, oldest first, each passing its copy on to
 *    the next in line from the instant it ran out — not from `now`.
 * 3. Any copy left free while someone is waiting is set aside for them now.
 *
 * Step 2 is why reads never have to write: it gives the same answer whenever
 * it runs, so a page can settle a copy in memory and a later write will store
 * exactly that. Step 3 only finds work right after a write that freed a copy —
 * a return, a cancellation, more copies — and such a write settles before it
 * stores. (A person vanishing from the register is the exception, and can only
 * happen by editing the data file by hand.)
 */
export function settleReservations(database: Database, now: DateInput): Reservation[] {
  const readied: Reservation[] = [];
  const books = new Map(database.books.map((book) => [book.id, book]));
  const people = new Set(database.borrowers.map((borrower) => borrower.id));

  for (const reservation of database.reservations) {
    if (!isOpen(reservation)) continue;
    if (books.has(reservation.bookId) && people.has(reservation.borrowerId)) continue;

    const next = closeReservation(database, reservation, "cancelled", now);
    if (next) readied.push(next);
  }

  for (;;) {
    const lapsed = database.reservations
      .filter((reservation) => isHoldExpired(reservation, now))
      .sort((a, b) => a.readyAt!.localeCompare(b.readyAt!))
      .at(0);
    if (!lapsed) break;

    const next = closeReservation(database, lapsed, "expired", holdEndsAt(lapsed.readyAt!));
    if (next) readied.push(next);
  }

  for (const book of database.books) {
    let free = countAvailableCopies(book, database.loans, database.reservations);
    for (const reservation of waitingQueue(database.reservations, book.id)) {
      if (free === 0) break;
      reservation.readyAt = toDate(now).toISOString();
      readied.push(reservation);
      free -= 1;
    }
  }

  // A hold that was passed on and then ran out itself is not "ready" any more.
  return readied.filter(isActiveHold);
}

/* ------------------------------------------------------------- reserving --- */

/**
 * Why `borrowerId` cannot reserve `book`. Checked against a settled database.
 *
 * - `already-borrowed`: they have a copy at home already.
 * - `already-reserved`: they are in the queue, or a copy is waiting for them.
 * - `book-available`: a copy is on the shelf — borrow it instead.
 * - `limit-reached`: they have `MAX_OPEN_RESERVATIONS` open already.
 */
export type ReservationBlock =
  | "already-borrowed"
  | "already-reserved"
  | "book-available"
  | "limit-reached";

export function reservationBlock(
  database: Database,
  book: Book,
  borrowerId: string
): ReservationBlock | null {
  const hasLoan = database.loans.some(
    (loan) => isActive(loan) && loan.bookId === book.id && loan.borrowerId === borrowerId
  );
  if (hasLoan) return "already-borrowed";

  const mine = database.reservations.filter(
    (reservation) => isOpen(reservation) && reservation.borrowerId === borrowerId
  );
  if (mine.some((reservation) => reservation.bookId === book.id)) return "already-reserved";

  if (isBookAvailable(book, database.loans, database.reservations)) return "book-available";

  if (mine.length >= MAX_OPEN_RESERVATIONS) return "limit-reached";

  return null;
}

export type ReservationError = "book-not-found" | ReservationBlock;

export type ReservationResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; error: ReservationError };

export type CancelReservationResult =
  | {
      ok: true;
      reservation: Reservation;
      /** Who the held copy went on to, when the cancelled reservation had one. */
      passedTo: Reservation | null;
    }
  | { ok: false; error: "reservation-not-found" };

/**
 * Whether `borrowerId` may take a copy of `book` home: one is set aside for
 * them, or one is on the shelf that nobody in the queue is owed.
 */
export function canBorrow(database: Database, book: Book, borrowerId: string): boolean {
  const mine = openReservationFor(database.reservations, book.id, borrowerId);
  if (mine && isActiveHold(mine)) return true;
  return isBookAvailable(book, database.loans, database.reservations);
}

/** The open reservation `borrowerId` has on `bookId`, if any. */
export function openReservationFor(
  reservations: Reservation[],
  bookId: string,
  borrowerId: string
): Reservation | null {
  return (
    reservations.find(
      (reservation) =>
        isOpen(reservation) &&
        reservation.bookId === bookId &&
        reservation.borrowerId === borrowerId
    ) ?? null
  );
}
