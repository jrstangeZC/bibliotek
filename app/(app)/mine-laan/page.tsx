import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Bookmark01Icon,
  BookOpen01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { LoanDueCell, LoanStatusCell } from "@/components/loan-status";
import { PageHeading } from "@/components/page-heading";
import { BookRecordCell, ColumnHead, IDENTITY_CELL } from "@/components/record-cell";
import { RenewLoanMenu } from "@/components/renew-loan-menu";
import { ReservationMenu } from "@/components/reservation-menu";
import { ReservationStatusCell } from "@/components/reservation-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
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
import { requireBorrower } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { formatDate, formatKroner } from "@/lib/format";
import { listBorrowerActivity, outstandingFees } from "@/lib/loans";
import { RENEWAL_DAYS } from "@/lib/renewals";
import { HOLD_DAYS, MAX_OPEN_RESERVATIONS } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mine lån – Bibliotek",
  description: "Bøkene du har lånt og reservert, med frister og eventuelle gebyrer",
};

export default async function MyLoansPage({
  searchParams,
}: PageProps<"/mine-laan">) {
  const borrower = await requireBorrower();
  const [{ loans, reservations }, { feil, forlenget, reservert, avbestilt }] =
    await Promise.all([listBorrowerActivity(borrower.id), searchParams]);
  const error = describeError(feil);
  const renewed =
    typeof forlenget === "string" ? loans.find((loan) => loan.id === forlenget) : null;
  const reserved =
    typeof reservert === "string"
      ? reservations.find((reservation) => reservation.id === reservert)
      : null;
  const ready = reservations.filter((reservation) => reservation.status === "ready").length;
  const outstanding = outstandingFees(loans);

  return (
    <>
      <PageHeading title="Mine lån">
        Lån registrert på {borrower.name}. Gebyret er 10 kr for hver dag en bok
        er forsinket, og stopper på 200 kr. Et lån kan forlenges med{" "}
        {RENEWAL_DAYS} dager, én gang, så lenge fristen ikke er passert og
        ingen står i kø for boken. Er alle eksemplarene ute, kan du reservere
        boken og få den holdt av i {HOLD_DAYS} dager når den kommer inn.
      </PageHeading>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      {renewed ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>
            «{renewed.book?.title ?? "Ukjent tittel"}» er forlenget
          </AlertTitle>
          <AlertDescription>
            Ny frist er {formatDate(renewed.dueAt)}. Lånet kan ikke forlenges
            igjen.
          </AlertDescription>
        </Alert>
      ) : null}

      {reserved ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>
            «{reserved.book?.title ?? "Ukjent tittel"}» er reservert
          </AlertTitle>
          <AlertDescription>
            Du er nr. {reserved.position} i køen. Når et eksemplar kommer inn,
            holdes det av til deg i {HOLD_DAYS} dager, og du får beskjed.
          </AlertDescription>
        </Alert>
      ) : null}

      {avbestilt ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Reservasjonen er avbestilt</AlertTitle>
          <AlertDescription>
            Plassen i køen er gitt videre. Du kan reservere tittelen på nytt fra
            boksiden, men da havner du bakerst.
          </AlertDescription>
        </Alert>
      ) : null}

      {reservations.length > 0 ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Reservasjoner</CardTitle>
            <CardDescription>
              {ready > 0
                ? `${ready === 1 ? "Én bok er" : `${ready} bøker er`} holdt av til deg. Hent innen fristen, ellers går eksemplaret videre til neste i køen.`
                : `Du får et eksemplar holdt av når det er din tur. Du kan ha ${MAX_OPEN_RESERVATIONS} reservasjoner om gangen.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                  <ColumnHead>Status</ColumnHead>
                  <ColumnHead className="pr-(--card-spacing) text-right">
                    Handling
                  </ColumnHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell
                      className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                    >
                      <BookRecordCell book={reservation.book} icon={Bookmark01Icon} />
                    </TableCell>
                    <TableCell className="py-3">
                      <ReservationStatusCell reservation={reservation} />
                    </TableCell>
                    <TableCell className="py-3 pr-(--card-spacing) text-right">
                      <ReservationMenu reservation={reservation} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {loans.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen lån ennå</EmptyTitle>
            <EmptyDescription>
              Du har ingen bøker ute og ingen lånehistorikk. Finn en tittel i
              samlingen for å låne den.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Se boklisten
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lånehistorikk</CardTitle>
            <CardDescription>
              {outstanding > 0
                ? `Du skylder ${formatKroner(outstanding)} i gebyr på lån som ikke er levert.`
                : "Ingen ubetalte gebyrer på lånene dine."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                  <ColumnHead>Frist</ColumnHead>
                  <ColumnHead>Status</ColumnHead>
                  <ColumnHead className="pr-(--card-spacing) text-right">
                    Handling
                  </ColumnHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell
                      className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                    >
                      <BookRecordCell book={loan.book} />
                    </TableCell>
                    <TableCell className="py-3 tabular-nums">
                      <LoanDueCell loan={loan} />
                    </TableCell>
                    <TableCell className="py-3">
                      <LoanStatusCell loan={loan} />
                    </TableCell>
                    <TableCell className="py-3 pr-(--card-spacing) text-right">
                      <RenewLoanMenu loan={loan} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
