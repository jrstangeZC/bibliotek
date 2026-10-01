import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  BookmarkRemove01Icon,
  BookOpen01Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { borrowBookAction, cancelOwnReservationAction } from "@/lib/actions";
import type { ReservationView } from "@/lib/loans";

/**
 * The row action on a borrower's own reservation: borrow the held copy when
 * there is one, open the title, and — after a separator, because a place in
 * the queue cannot be got back — give the reservation up.
 */
export function ReservationMenu({ reservation }: { reservation: ReservationView }) {
  const borrowForm = `laan-${reservation.id}`;
  const cancelForm = `avbestill-${reservation.id}`;
  const title = reservation.book?.title ?? "ukjent tittel";

  return (
    <>
      {/* Outside the popup: the menu closes the instant an item is pressed,
          and a form torn out of the tree mid-submit never completes. */}
      {reservation.status === "ready" ? (
        <form id={borrowForm} action={borrowBookAction} className="hidden">
          <input type="hidden" name="bookId" value={reservation.bookId} />
        </form>
      ) : null}
      <form id={cancelForm} action={cancelOwnReservationAction} className="hidden">
        <input type="hidden" name="reservationId" value={reservation.id} />
      </form>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label={`Handlinger for reservasjonen på «${title}»`}
        >
          <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {reservation.status === "ready" ? (
            <DropdownMenuItem
              nativeButton
              render={<button type="submit" form={borrowForm} />}
            >
              <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
              Lån boken
            </DropdownMenuItem>
          ) : null}
          {reservation.book ? (
            <DropdownMenuItem render={<Link href={`/boker/${reservation.book.id}`} />}>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              Åpne boken
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={<button type="submit" form={cancelForm} />}
          >
            <HugeiconsIcon icon={BookmarkRemove01Icon} strokeWidth={2} />
            Avbestill reservasjonen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
