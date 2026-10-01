import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowTurnBackwardIcon,
  Book02Icon,
  BookmarkCheck01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { LibrarianRequired } from "@/components/librarian-required";
import { LoanStatusCell } from "@/components/loan-status";
import { PageHeading } from "@/components/page-heading";
import {
  ColumnHead,
  IDENTITY_CELL,
  RecordCell,
  SECONDARY_CELL,
} from "@/components/record-cell";
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
import { returnLoanAction } from "@/lib/actions";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { findOpenReservation, listActiveLoans } from "@/lib/loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administrasjon – Bibliotek",
  description: "Alle aktive lån, med mulighet for å registrere retur",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Administrasjon" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const [loans, { feil, holdt }] = await Promise.all([listActiveLoans(), searchParams]);
  const error = describeError(feil);
  const held = typeof holdt === "string" ? await findOpenReservation(holdt) : null;
  const overdue = loans.filter((loan) => loan.status === "overdue").length;

  return (
    <>
      <PageHeading title="Administrasjon">
        Alle bøker som er ute på lån akkurat nå. Registrer retur når et
        eksemplar kommer inn i skranken.
      </PageHeading>
      <AdminNav />

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      {held ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={BookmarkCheck01Icon} strokeWidth={2} />
          <AlertTitle>
            Sett «{held.book?.title ?? "Ukjent tittel"}» til side for{" "}
            {held.borrower?.name ?? "ukjent låner"}
          </AlertTitle>
          <AlertDescription>
            Returen er registrert, men eksemplaret skal ikke tilbake i hyllen.{" "}
            {held.borrower?.name ?? "Låneren"} står først i køen og har til{" "}
            {held.deadline ? formatDate(held.deadline) : "fristen"} på å hente
            det.
          </AlertDescription>
        </Alert>
      ) : null}

      {loans.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen aktive lån</EmptyTitle>
            <EmptyDescription>
              Alle eksemplarer står i hyllen. Nye lån dukker opp her så snart de
              registreres.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Aktive lån</CardTitle>
            <CardDescription>
              Sortert etter frist, den som forfaller først øverst.
            </CardDescription>
            <CardAction>
              {overdue > 0 ? (
                <Badge variant="destructive">{overdue} forfalt</Badge>
              ) : (
                <Badge variant="secondary">{loans.length} ute</Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <ColumnHead className="pl-(--card-spacing)">Bok</ColumnHead>
                  <ColumnHead>Låner</ColumnHead>
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
                      <RecordCell
                        icon={Book02Icon}
                        name={loan.book?.title ?? "Ukjent tittel"}
                        href={loan.book ? `/boker/${loan.book.id}` : undefined}
                      >
                        {loan.book?.author}
                      </RecordCell>
                    </TableCell>
                    <TableCell className={`py-3 ${SECONDARY_CELL}`}>
                      <RecordCell name={loan.borrower?.name ?? "Ukjent låner"}>
                        {loan.borrower?.email}
                      </RecordCell>
                    </TableCell>
                    <TableCell className="py-3 tabular-nums">
                      {formatDate(loan.dueAt)}
                    </TableCell>
                    <TableCell className="py-3">
                      <LoanStatusCell loan={loan} />
                    </TableCell>
                    <TableCell className="py-3 pr-(--card-spacing) text-right">
                      {/* The form lives outside the popup. A menu closes the
                          instant an item is pressed, and a form torn out of the
                          tree mid-submit never completes — so the item points at
                          this one with the native `form` attribute. */}
                      <form
                        id={`retur-${loan.id}`}
                        action={returnLoanAction}
                        className="hidden"
                      >
                        <input type="hidden" name="loanId" value={loan.id} />
                      </form>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          })}
                          aria-label={`Handlinger for «${loan.book?.title ?? "ukjent tittel"}»`}
                        >
                          <HugeiconsIcon
                            icon={MoreVerticalIcon}
                            strokeWidth={2}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            nativeButton
                            render={
                              <button type="submit" form={`retur-${loan.id}`} />
                            }
                          >
                            <HugeiconsIcon
                              icon={ArrowTurnBackwardIcon}
                              strokeWidth={2}
                            />
                            Registrer retur
                          </DropdownMenuItem>
                          {loan.book ? (
                            <DropdownMenuItem
                              render={<Link href={`/boker/${loan.book.id}`} />}
                            >
                              <HugeiconsIcon icon={Book02Icon} strokeWidth={2} />
                              Åpne boken
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
