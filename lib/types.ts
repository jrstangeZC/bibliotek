/** The domain model. Every date is a full ISO 8601 timestamp in UTC. */

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  year: number;
  copies: number;
};

/**
 * What a person is allowed to do. A librarian is still a borrower — the role
 * only adds the desk work on top, so both live in the same register.
 */
export type Role = "borrower" | "librarian";

export type Borrower = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Whether to email this person when a reserved copy is held for them. */
  notifyByEmail: boolean;
};

export type Loan = {
  id: string;
  bookId: string;
  borrowerId: string;
  borrowedAt: string;
  dueAt: string;
  /** `null` while the book is still out. */
  returnedAt: string | null;
  /**
   * When the loan was extended, or `null` if it never has been. A loan can be
   * extended once, so this doubles as the used-up marker. `dueAt` already
   * includes the extension — there is only ever one due date.
   */
  renewedAt: string | null;
};

/** How a reservation ended: the book was borrowed, the place was given up, or the hold ran out. */
export type ReservationOutcome = "collected" | "cancelled" | "expired";

/**
 * A place in the queue for a title with every copy out. The rules live in
 * `lib/reservations.ts`.
 */
export type Reservation = {
  id: string;
  bookId: string;
  borrowerId: string;
  /** The queue is first come, first served on this. */
  reservedAt: string;
  /** When a copy was set aside for this person, or `null` while they wait in line. */
  readyAt: string | null;
  /** When the reservation ended, or `null` while it is open. */
  closedAt: string | null;
  /** Why it ended — `null` while it is open. */
  outcome: ReservationOutcome | null;
  /**
   * For a hold that ran out or was cancelled with the copy set aside: the
   * reservation the copy went on to, or `null` when it went back on the shelf.
   */
  passedToId: string | null;
  /**
   * When the desk confirmed it dealt with the copy of a hold that ended without
   * being collected. Until then the book is sitting on the pickup shelf for no one.
   */
  handledAt: string | null;
  /** When the "your book is ready" notice was dealt with, or `null` until then. */
  notifiedAt: string | null;
};

/**
 * An email the app has sent. There is no mail server: messages land here and
 * the desk can read them under «Utboks». `lib/mail.ts` is where a real
 * provider would plug in.
 */
export type OutboxMessage = {
  id: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  createdAt: string;
  /** The hold the message is about. */
  reservationId: string;
};

/** The shape of `data/seed.json` and `data/db.json`. */
export type Database = {
  books: Book[];
  borrowers: Borrower[];
  loans: Loan[];
  reservations: Reservation[];
  outbox: OutboxMessage[];
};
