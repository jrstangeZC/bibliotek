import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { ColumnHead, IDENTITY_CELL, RecordCell } from "@/components/record-cell";
import { RoleBadge } from "@/components/role-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isActive } from "@/lib/availability";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { borrowerEditHref } from "@/lib/borrowers";
import { getBorrowers, getLoans } from "@/lib/db";
import { describeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brukere – Bibliotek",
  description: "Alle som er registrert i systemet, og hvor mange bøker de har ute",
};

export default async function BorrowersPage({
  searchParams,
}: PageProps<"/admin/brukere">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Brukere" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const [people, loans, { ny, feil }] = await Promise.all([
    getBorrowers(),
    getLoans(),
    searchParams,
  ]);
  const enrolled = typeof ny === "string" ? people.find((p) => p.id === ny) : null;
  const error = describeError(feil);

  return (
    <>
      <PageHeading title="Brukere">
        Alle som er registrert i systemet, og hvor mange bøker de har ute.
        Registeret rommer både lånere og bibliotekarer.
      </PageHeading>
      <AdminNav />

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      {enrolled ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>{enrolled.name} er registrert</AlertTitle>
          <AlertDescription>
            Brukeren kan låne bøker med én gang, og ligger nå i listen over hvem
            du kan bruke systemet som.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Brukerregisteret</CardTitle>
          <CardDescription>
            {people.length} personer, sortert slik de ble lagt inn. Klikk et
            navn for å endre opplysningene. Lånene står på samme side.
          </CardDescription>
          <CardAction>
            {/* Same entry point as «Ny bok» on the books register. */}
            <Link href="/admin/brukere/ny" className={buttonVariants({ size: "sm" })}>
              <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} />
              Ny bruker
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <ColumnHead className="pl-(--card-spacing)">Navn</ColumnHead>
                <ColumnHead>Rolle</ColumnHead>
                <ColumnHead className="text-right">Ute nå</ColumnHead>
                <ColumnHead className="text-right">Lån totalt</ColumnHead>
                <ColumnHead className="pr-(--card-spacing) text-right">
                  Handling
                </ColumnHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => {
                const mine = loans.filter((loan) => loan.borrowerId === person.id);
                const out = mine.filter(isActive).length;

                return (
                  <TableRow key={person.id}>
                    <TableCell
                      className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                    >
                      <RecordCell
                        icon={UserIcon}
                        name={person.name}
                        href={borrowerEditHref(person.id)}
                      >
                        {person.email}
                      </RecordCell>
                    </TableCell>
                    <TableCell className="py-3">
                      <RoleBadge role={person.role} />
                    </TableCell>
                    <TableCell className="py-3 text-right font-medium tabular-nums">
                      {out}
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-muted-foreground">
                      {mine.length}
                    </TableCell>
                    <TableCell className="py-3 pr-(--card-spacing) text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Handlinger for ${person.name}`}
                        >
                          <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            render={<Link href={borrowerEditHref(person.id)} />}
                          >
                            <HugeiconsIcon icon={UserEdit01Icon} strokeWidth={2} />
                            Rediger bruker
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
    </>
  );
}
