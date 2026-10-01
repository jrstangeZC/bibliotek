import { Badge } from "@/components/ui/badge";
import type { BookView } from "@/lib/loans";
import { MAX_OPEN_RESERVATIONS, type ReservationBlock } from "@/lib/reservations";

/**
 * Whether a title can be taken home right now. «Holdt av» is for a title with
 * nothing free but a copy on the pickup shelf — it is in the building, just
 * not for you.
 */
export function BookStatusBadge({ book }: { book: BookView }) {
  if (book.available > 0) return <Badge>Tilgjengelig</Badge>;
  if (book.held > 0) return <Badge variant="secondary">Holdt av</Badge>;
  return <Badge variant="secondary">Utlånt</Badge>;
}

/**
 * Said beside a reserve action that is not on offer, so the reader is never
 * left guessing why. `book-available` has no entry: then the action on offer is
 * borrowing, not reserving.
 */
export const reservationBlockReasons: Record<
  Exclude<ReservationBlock, "book-available">,
  string
> = {
  "already-borrowed": "Du har allerede boken",
  "already-reserved": "Du står allerede i køen",
  "limit-reached": `Du har nådd grensen på ${MAX_OPEN_RESERVATIONS} reservasjoner`,
};
