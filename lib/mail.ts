import { randomUUID } from "node:crypto";

import { isActiveHold } from "@/lib/availability";
import { toDate, type DateInput } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { holdDeadline } from "@/lib/reservations";
import type { Book, Borrower, Database, OutboxMessage, Reservation } from "@/lib/types";

/**
 * Everything the app emails. There is no mail server in the demo: a message is
 * "sent" by adding it to `database.outbox`, where the desk can read it.
 *
 * To send for real, keep `queueHoldNotices` as it is — it decides *what* goes
 * out, exactly once — and have a delivery step read the outbox and hand each
 * new message to a provider.
 */

export type MailContent = Pick<OutboxMessage, "to" | "toName" | "subject" | "body">;

/** «Your book is ready»: what was set aside, until when, and what happens after. */
export function composeHoldReadyMessage(
  reservation: Reservation,
  book: Book,
  borrower: Borrower
): MailContent {
  const deadline = formatDate(holdDeadline(reservation.readyAt ?? reservation.reservedAt));

  return {
    to: borrower.email,
    toName: borrower.name,
    subject: `«${book.title}» er klar til henting`,
    body: [
      `Hei ${borrower.name},`,
      `«${book.title}» av ${book.author} er kommet inn og holdt av til deg. Hent den i skranken innen ${deadline}.`,
      "Henter du den ikke innen fristen, går eksemplaret videre til neste i køen. Du ser reservasjonen under Mine lån, og kan avbestille den der hvis du ikke trenger boken lenger.",
      "Vil du ikke ha slike e-poster, kan du slå dem av under Min profil.",
      "Hilsen\nBiblioteket",
    ].join("\n\n"),
  };
}

/**
 * Sends the «ready» notice for every held copy that has not had one, and marks
 * each hold as dealt with — whether or not its borrower wanted the email, so
 * switching notices on later does not send a burst of old news.
 *
 * Runs inside a write, after the reservations are settled, so each hold is
 * noticed exactly once however many writes follow. Changes `database` in
 * place and returns what it queued.
 */
export function queueHoldNotices(database: Database, now: DateInput): OutboxMessage[] {
  const createdAt = toDate(now).toISOString();
  const queued: OutboxMessage[] = [];

  for (const reservation of database.reservations) {
    if (!isActiveHold(reservation) || reservation.notifiedAt !== null) continue;
    reservation.notifiedAt = createdAt;

    const borrower = database.borrowers.find((person) => person.id === reservation.borrowerId);
    const book = database.books.find((candidate) => candidate.id === reservation.bookId);
    if (!borrower?.notifyByEmail || !book) continue;

    const message: OutboxMessage = {
      id: `epost-${randomUUID()}`,
      ...composeHoldReadyMessage(reservation, book, borrower),
      createdAt,
      reservationId: reservation.id,
    };
    database.outbox.push(message);
    queued.push(message);
  }

  return queued;
}
