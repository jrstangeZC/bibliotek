import type { Book, Loan, Reservation } from "@/lib/types";

/** A loan is active until the book is handed back. */
export function isActive(loan: Loan): boolean {
  return loan.returnedAt === null;
}

/** How many copies of `bookId` are out right now. */
export function countActiveLoans(loans: Loan[], bookId: string): number {
  return loans.filter((loan) => isActive(loan) && loan.bookId === bookId).length;
}

/** A reservation with a copy set aside that has not been collected or given up. */
export function isActiveHold(reservation: Reservation): boolean {
  return reservation.closedAt === null && reservation.readyAt !== null;
}

/** How many copies of `bookId` sit on the pickup shelf for someone in the queue. */
export function countHeldCopies(reservations: Reservation[], bookId: string): number {
  return reservations.filter(
    (reservation) => isActiveHold(reservation) && reservation.bookId === bookId
  ).length;
}

/**
 * Copies anyone may borrow: the total minus the ones on loan and the ones held
 * for someone in the queue. Clamped at zero so a catalogue error (more loans
 * than copies) never reads as negative stock.
 */
export function countAvailableCopies(
  book: Book,
  loans: Loan[],
  reservations: Reservation[] = []
): number {
  return Math.max(
    0,
    book.copies - countActiveLoans(loans, book.id) - countHeldCopies(reservations, book.id)
  );
}

/** Whether the book can be borrowed by someone without a hold on it. */
export function isBookAvailable(
  book: Book,
  loans: Loan[],
  reservations: Reservation[] = []
): boolean {
  return countAvailableCopies(book, loans, reservations) > 0;
}
