import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Book02Icon,
  Bookmark01Icon,
  BookmarkRemove01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import {
  BookRecordCell,
  ColumnHead,
  IDENTITY_CELL,
  RecordCell,
  SECONDARY_CELL,
} from "@/components/record-cell";
import { ReservationStatusCell } from "@/components/reservation-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cancelReservationAction, markHoldHandledAction } from "@/lib/actions";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { borrowerEditHref } from "@/lib/borrowers";
import { describeError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import {
  listHoldsToHandle,
  listOpenReservations,
  type HoldToHandle,
} from "@/lib/loans";
import { HOLD_DAYS } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservasjoner – Bibliotek",
  description: "Køene for utlånte bøker, og eksemplarer på hentehylla som må flyttes",
};

/** What the desk should do with the copy. */
function handlingAdvice(hold: HoldToHandle): string {
  return hold.passedTo
    ? `Flytt til hentehylla for ${hold.passedTo.name}`
    : "Sett tilbake i hyllen";
}

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/admin/reservasjoner">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Reservasjoner" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const [reservations, toHandle, { feil, avbestilt, handtert }] = await Promise.all([
    listOpenReservations(),
    listHoldsToHandle(),
    searchParams,
  ]);
  const error = describeError(feil);
  const ready = reservations.filter((reservation) => reservation.status === "ready").length;

  return (
    <>
      <PageHeading title="Reservasjoner">
        Køene for titler der alle eksemplarer er ute. Et eksemplar som kommer
        inn, holdes av for den første i køen i {HOLD_DAYS} dager.
      </PageHeading>
      <AdminNav />

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      {avbestilt ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Reservasjonen er avbestilt</AlertTitle>
          <AlertDescription>
            Var et eksemplar holdt av, er det gått videre til neste i køen. Se
            listen over eksemplarer som må flyttes.
          </AlertDescription>
        </Alert>
      ) : null}

      {handtert ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Eksemplaret er håndtert</AlertTitle>
          <AlertDescription>
            Det er fjernet fra listen over eksemplarer som må flyttes.
          </AlertDescription>
        </Alert>
      ) : null}

      {toHandle.length > 0 ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Må håndteres</CardTitle>
            <CardDescription>
              Eksemplarer på hentehylla som står under feil navn. Flytt dem, og
              marker dem som håndtert.
            </CardDescription>
            <CardAction>
              <Badge variant="destructive">{toHandle.length} å flytte</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Bok</ColumnHead>
                  <ColumnHead>Årsak</ColumnHead>
                  <ColumnHead className="pr-(--card-spacing) text-right">
                    Handling
                  </ColumnHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toHandle.map((hold) => {
                  const formId = `handtert-${hold.id}`;
                  const title = hold.book?.title ?? "Ukjent tittel";

                  return (
                    <TableRow key={hold.id}>
                      <TableCell
                        className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                      >
                        <RecordCell
                          icon={Book02Icon}
                          name={title}
                          href={hold.book ? `/boker/${hold.book.id}` : undefined}
                        >
                          {handlingAdvice(hold)}
                        </RecordCell>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col items-start gap-1.5 leading-snug">
                          <Badge variant="secondary">
                            {hold.outcome === "expired" ? "Ikke hentet" : "Avbestilt"}
                          </Badge>
                          <span className="text-muted-foreground tabular-nums">
                            {hold.outcome === "expired"
                              ? `Frist ${formatDate(hold.deadline)}`
                              : formatDate(hold.closedAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing) text-right">
                        {/* Outside the popup: the menu closes the instant an
                            item is pressed, and a form torn out of the tree
                            mid-submit never completes. */}
                        <form id={formId} action={markHoldHandledAction} className="hidden">
                          <input type="hidden" name="reservationId" value={hold.id} />
                        </form>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                            aria-label={`Handlinger for eksemplaret av «${title}»`}
                          >
                            <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              nativeButton
                              render={<button type="submit" form={formId} />}
                            >
                              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                              Marker som håndtert
                            </DropdownMenuItem>
                            {hold.book ? (
                              <DropdownMenuItem
                                render={<Link href={`/boker/${hold.book.id}`} />}
                              >
                                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                                Se boken
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {reservations.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Bookmark01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen reservasjoner</EmptyTitle>
            <EmptyDescription>
              Ingen står i kø akkurat nå. Når alle eksemplarer av en tittel er
              ute, kan lånerne reservere den, og køen dukker opp her.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Aktive reservasjoner</CardTitle>
            <CardDescription>
              Eksemplarer som er holdt av står øverst, den som må hentes først
              på toppen. Deretter køene, i rekkefølge.
            </CardDescription>
            <CardAction>
              {ready > 0 ? (
                <Badge>{ready} klar til henting</Badge>
              ) : (
                <Badge variant="secondary">{reservations.length} i kø</Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Bok</ColumnHead>
                  <ColumnHead>Låner</ColumnHead>
                  <ColumnHead>Status</ColumnHead>
                  <ColumnHead className="pr-(--card-spacing) text-right">
                    Handling
                  </ColumnHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => {
                  const formId = `avbestill-${reservation.id}`;
                  const title = reservation.book?.title ?? "Ukjent tittel";

                  return (
                    <TableRow key={reservation.id}>
                      <TableCell
                        className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                      >
                        <BookRecordCell book={reservation.book} icon={Bookmark01Icon} />
                      </TableCell>
                      <TableCell className={`py-3 ${SECONDARY_CELL}`}>
                        <RecordCell
                          name={reservation.borrower?.name ?? "Ukjent låner"}
                          href={
                            reservation.borrower
                              ? borrowerEditHref(reservation.borrower.id)
                              : undefined
                          }
                        >
                          {reservation.borrower?.email}
                        </RecordCell>
                      </TableCell>
                      <TableCell className="py-3">
                        <ReservationStatusCell reservation={reservation} />
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing) text-right">
                        <form id={formId} action={cancelReservationAction} className="hidden">
                          <input
                            type="hidden"
                            name="reservationId"
                            value={reservation.id}
                          />
                        </form>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                            aria-label={`Handlinger for reservasjonen på «${title}»`}
                          >
                            <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60">
                            {reservation.book ? (
                              <DropdownMenuItem
                                render={<Link href={`/boker/${reservation.book.id}`} />}
                              >
                                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                                Se boken
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              nativeButton
                              render={<button type="submit" form={formId} />}
                            >
                              <HugeiconsIcon icon={BookmarkRemove01Icon} strokeWidth={2} />
                              Avbestill reservasjonen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
