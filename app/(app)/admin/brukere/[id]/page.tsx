import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  Bookmark01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { BorrowerForm } from "@/components/borrower-form";
import { DetailRow } from "@/components/detail-row";
import { EmptySection } from "@/components/empty-section";
import { LibrarianRequired } from "@/components/librarian-required";
import { LoanDueCell, LoanStatusCell } from "@/components/loan-status";
import { PageHeading } from "@/components/page-heading";
import { BookRecordCell, ColumnHead, IDENTITY_CELL } from "@/components/record-cell";
import { ReservationStatusCell } from "@/components/reservation-status";
import { RoleBadge } from "@/components/role-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentBorrower, isLibrarian, requireBorrower } from "@/lib/auth";
import { LATE_FEE_CAP, LATE_FEE_PER_DAY } from "@/lib/fees";
import { formatDate, formatDays, formatKroner } from "@/lib/format";
import { BORROWER_FORM_ID } from "@/lib/borrowers";
import { findBorrowerOverview, outstandingFees } from "@/lib/loans";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** One database load per request, shared by the metadata and the page. */
const loadOverview = cache(findBorrowerOverview);

export async function generateMetadata({
  params,
}: PageProps<"/admin/brukere/[id]">): Promise<Metadata> {
  // The tab title is shown before the page checks the role. Without this, a
  // borrower could read anyone's name off it, or probe which ids exist.
  const viewer = await getCurrentBorrower();
  if (!viewer || !isLibrarian(viewer)) return { title: "Bruker – Bibliotek" };

  const overview = await loadOverview((await params).id);

  return { title: `${overview?.borrower.name ?? "Ukjent bruker"} – Bibliotek` };
}

export default async function BorrowerPage({
  params,
}: PageProps<"/admin/brukere/[id]">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Bruker" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const overview = await loadOverview((await params).id);
  if (!overview) notFound();

  const { borrower: person, active, returned, reservations } = overview;
  const overdue = active.filter((loan) => loan.status === "overdue").length;
  const outstanding = outstandingFees(active);

  return (
    <>
      <AdminBreadcrumbs
        parents={[{ label: "Brukere", href: "/admin/brukere" }]}
        current={person.name}
      />
      <PageHeading title={person.name}>
        <span className="inline-flex flex-wrap items-center gap-2">
          {person.email}
          <RoleBadge role={person.role} />
        </span>
      </PageHeading>

      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Oppsummering</CardTitle>
            <CardDescription>
              Alt personen har lånt, og hva som står ubetalt i dag.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border text-sm">
              <DetailRow label="Lån">
                <span className="font-medium tabular-nums">
                  {active.length + returned.length}
                </span>{" "}
                <span className="text-muted-foreground tabular-nums">
                  · {active.length} ute nå · {returned.length} levert
                </span>
              </DetailRow>
              <DetailRow label="Forsinket">
                {overdue > 0 ? (
                  <span className="font-medium text-destructive tabular-nums">
                    {overdue} lån over fristen
                  </span>
                ) : (
                  <span className="text-muted-foreground">Ingen lån over fristen</span>
                )}
              </DetailRow>
              <DetailRow label="Utestående gebyr">
                <div className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      outstanding > 0 && "text-destructive"
                    )}
                  >
                    {formatKroner(outstanding)}
                  </span>
                  <span className="text-muted-foreground">
                    På lån som ikke er levert: {formatKroner(LATE_FEE_PER_DAY)} per
                    dag, høyst {formatKroner(LATE_FEE_CAP)} per lån. Gebyr på
                    leverte lån står i historikken.
                  </span>
                </div>
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktive lån</CardTitle>
            <CardDescription>
              Bøkene personen har ute nå, den som forfaller først øverst.
            </CardDescription>
            {active.length > 0 ? (
              <CardAction>
                {overdue > 0 ? (
                  <Badge variant="destructive">{overdue} forfalt</Badge>
                ) : (
                  <Badge variant="secondary">{active.length} ute</Badge>
                )}
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className={active.length > 0 ? "px-0" : undefined}>
            {active.length === 0 ? (
              <EmptySection
                icon={CheckmarkCircle02Icon}
                title="Ingen bøker ute"
                action={{ label: "Se samlingen", href: "/" }}
              >
                {returned.length > 0
                  ? `Alt ${person.name} har lånt, er levert.`
                  : `${person.name} har ikke lånt noe ennå.`}{" "}
                Nye lån dukker opp her så snart de registreres.
              </EmptySection>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    <ColumnHead>Frist</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing)">Status</ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell
                        className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                      >
                        <BookRecordCell book={loan.book} />
                      </TableCell>
                      <TableCell className="py-3 tabular-nums">
                        <LoanDueCell loan={loan} />
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing)">
                        <LoanStatusCell loan={loan} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reservasjoner</CardTitle>
            <CardDescription>
              Titler personen står i kø for, eller har et eksemplar holdt av til
              seg på.
            </CardDescription>
          </CardHeader>
          <CardContent className={reservations.length > 0 ? "px-0" : undefined}>
            {reservations.length === 0 ? (
              <EmptySection
                icon={Bookmark01Icon}
                title="Ingen reservasjoner"
                action={{ label: "Se alle reservasjoner", href: "/admin/reservasjoner" }}
              >
                {person.name} står ikke i kø for noen titler. Reservasjoner legges
                inn fra boksiden når alle eksemplarene er ute.
              </EmptySection>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    <ColumnHead>Reservert</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing)">Status</ColumnHead>
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
                      <TableCell className="py-3 tabular-nums">
                        {formatDate(reservation.reservedAt)}
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing)">
                        <ReservationStatusCell reservation={reservation} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lånehistorikk</CardTitle>
            <CardDescription>
              Lån som er levert, nyeste først. Det som er ute nå, står under
              aktive lån.
            </CardDescription>
            {returned.length > 0 ? (
              <CardAction>
                <Badge variant="secondary">{returned.length} levert</Badge>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className={returned.length > 0 ? "px-0" : undefined}>
            {returned.length === 0 ? (
              <EmptySection
                icon={Clock01Icon}
                title="Ingen historikk ennå"
                action={{ label: "Se aktive lån", href: "/admin" }}
              >
                {person.name} har ikke levert noen bøker. Lån havner her når
                returen er registrert i skranken.
              </EmptySection>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    <ColumnHead>Lånt</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing)">Levert</ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returned.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell
                        className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                      >
                        <BookRecordCell book={loan.book} />
                      </TableCell>
                      <TableCell className="py-3 tabular-nums">
                        {formatDate(loan.borrowedAt)}
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing) tabular-nums">
                        <div className="flex flex-col leading-snug">
                          {loan.returnedAt ? formatDate(loan.returnedAt) : "–"}
                          <span className="text-muted-foreground">
                            {loan.daysOverdue > 0
                              ? `${formatDays(loan.daysOverdue)} for sent · ${formatKroner(loan.lateFee)}`
                              : "I tide"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Name, email, notices and the role. Saving stays on this page, and
            every name a librarian sees links straight here (borrowerEditHref). */}
        <div id={BORROWER_FORM_ID} className="scroll-mt-8">
          <BorrowerForm mode="edit" borrower={person} />
        </div>
      </div>
    </>
  );
}
