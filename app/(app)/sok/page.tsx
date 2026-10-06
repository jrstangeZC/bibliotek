import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Book02Icon,
  Bookmark01Icon,
  BookOpen01Icon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { BookStatusBadge } from "@/components/book-status";
import { LoanDueCell, LoanStatusCell } from "@/components/loan-status";
import { PageHeading } from "@/components/page-heading";
import {
  BookRecordCell,
  ColumnHead,
  IDENTITY_CELL,
  RecordCell,
  SECONDARY_CELL,
} from "@/components/record-cell";
import { ReservationStatusCell } from "@/components/reservation-status";
import { RoleBadge } from "@/components/role-badge";
import { SearchField } from "@/components/site-search";
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
import { getCurrentBorrower } from "@/lib/auth";
import { borrowerEditHref } from "@/lib/borrowers";
import { formatDate } from "@/lib/format";
import { searchLibrary, type SearchScope } from "@/lib/loans";
import type { Borrower } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Fixed: a search can name a person, and the tab title is not the place for it. */
export const metadata: Metadata = {
  title: "Søk – Bibliotek",
  description: "Søk på tvers av samlingen og lånene dine",
};

/** The sentence under the heading. Only the desk's mentions people. */
const intro: Record<SearchScope, string> = {
  public:
    "Søk i hele samlingen etter tittel, forfatter, år eller ISBN. Logg inn for å søke i dine egne lån også.",
  own: "Søk i samlingen og i dine egne lån og reservasjoner, etter tittel, forfatter, år eller ISBN.",
  desk: "Søk i samlingen, brukerregisteret, aktive lån og åpne reservasjoner. Et lån eller en reservasjon passer når boken eller personen gjør det.",
};

/** What the search looks through, said wherever there are no rows to show it. */
const coverage: Record<SearchScope, string> = {
  public: "Søket ser i titler, forfattere, år og ISBN.",
  own: "Søket ser i titler, forfattere, år og ISBN, og i lånene og reservasjonene dine.",
  desk: "Søket ser i bøker, i navn og e-post i brukerregisteret, og i aktive lån og åpne reservasjoner.",
};

const examples: Record<SearchScope, string> = {
  public: "Prøv for eksempel «orwell» eller «tolkien 1954».",
  own: "Prøv for eksempel «orwell» eller «tolkien 1954».",
  desk: "Prøv for eksempel et etternavn, eller et navn og en tittel sammen for å finne ett bestemt lån.",
};

/** In place of the groups, for an empty search and for one that found nothing. */
function SearchEmpty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Empty className="mt-8 border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Se hele samlingen
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/**
 * One group of hits: a table in a card, with the count in the corner. The rows
 * carry no menus. Every action returns to its own page with `?feil=` or
 * `?lagret=`, and the book or the person is one click away with them all.
 */
function HitGroup({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Badge variant="secondary">{count} treff</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>{children}</Table>
      </CardContent>
    </Card>
  );
}

/** The person beside the book on a loan or reservation row, as on the desk's pages. */
function BorrowerCell({ borrower }: { borrower: Borrower | null }) {
  return (
    <TableCell className={`py-3 ${SECONDARY_CELL}`}>
      <RecordCell
        name={borrower?.name ?? "Ukjent låner"}
        href={borrower ? borrowerEditHref(borrower.id) : undefined}
      >
        {borrower?.email}
      </RecordCell>
    </TableCell>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/sok">) {
  // Not `requireBorrower`: signed out, the page still searches the catalogue.
  const [viewer, { q }] = await Promise.all([getCurrentBorrower(), searchParams]);
  const results = await searchLibrary(q, viewer);
  // A complete ISBN with one match is meant to open the book. In a page,
  // `redirect` replaces, so the back button skips the search.
  if (results.isbnTarget) redirect(`/boker/${results.isbnTarget}`);

  const { query, scope, books, borrowers, loans, reservations } = results;
  const desk = scope === "desk";

  return (
    <>
      <PageHeading title="Søk">{intro[scope]}</PageHeading>

      {/* Not in a card: its title would only repeat the h1. */}
      <SearchField
        query={query}
        placeholder={
          desk ? "Tittel, person, e-post eller ISBN" : "Tittel, forfatter, år eller ISBN"
        }
        autoFocus={!results.searched}
      />

      {!results.searched ? (
        <SearchEmpty title="Hva leter du etter?">
          {coverage[scope]} {examples[scope]}
        </SearchEmpty>
      ) : results.total === 0 ? (
        <SearchEmpty title={`Ingen treff på «${query}»`}>
          {coverage[scope]} Prøv et kortere ord, bare etternavnet eller sifrene i
          ISBN-en.
          {query.split(/\s+/).length > 1
            ? " Alle ordene må passe på samme treff, så prøv med færre."
            : null}
        </SearchEmpty>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {results.total} treff på «{query}»
          </p>

          {/* Fixed order, and only the groups with something in them. */}
          <div className="mt-8 flex flex-col gap-8">
            {books.length > 0 ? (
              <HitGroup
                title="Bøker"
                description="Åpne en tittel for å låne den, eller reserver den hvis alle eksemplarene er ute."
                count={books.length}
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    <ColumnHead className="text-right">Eksemplarer</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing)">Status</ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}>
                        <RecordCell
                          icon={book.available > 0 ? Book02Icon : BookOpen01Icon}
                          name={book.title}
                          href={`/boker/${book.id}`}
                        >
                          {book.author} · {book.year}
                        </RecordCell>
                      </TableCell>
                      <TableCell className="py-3 text-right font-medium tabular-nums">
                        {book.available} av {book.copies}
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing)">
                        <BookStatusBadge book={book} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </HitGroup>
            ) : null}

            {borrowers.length > 0 ? (
              <HitGroup
                title="Brukere"
                description="Åpne en person for å se lånene og endre opplysningene."
                count={borrowers.length}
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Navn</ColumnHead>
                    <ColumnHead>Rolle</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing) text-right">
                      Ute nå
                    </ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {borrowers.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}>
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
                      <TableCell className="py-3 pr-(--card-spacing) text-right font-medium tabular-nums">
                        {person.onLoan}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </HitGroup>
            ) : null}

            {loans.length > 0 ? (
              <HitGroup
                title={desk ? "Lån" : "Dine lån"}
                description={
                  desk
                    ? "Bøker som er ute nå. Returen registreres under Administrasjon."
                    : "Bøker du har ute nå. Du forlenger dem under Mine lån."
                }
                count={loans.length}
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    {desk ? <ColumnHead>Låner</ColumnHead> : null}
                    <ColumnHead>Frist</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing)">Status</ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}>
                        <BookRecordCell book={loan.book} />
                      </TableCell>
                      {desk ? <BorrowerCell borrower={loan.borrower} /> : null}
                      <TableCell className="py-3 tabular-nums">
                        <LoanDueCell loan={loan} />
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing)">
                        <LoanStatusCell loan={loan} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </HitGroup>
            ) : null}

            {reservations.length > 0 ? (
              <HitGroup
                title={desk ? "Reservasjoner" : "Dine reservasjoner"}
                description={
                  desk
                    ? "Åpne reservasjoner, i kø eller klare til henting."
                    : "Titler du står i kø for, eller som er holdt av til deg."
                }
                count={reservations.length}
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    {desk ? <ColumnHead>Låner</ColumnHead> : null}
                    {desk ? <ColumnHead>Reservert</ColumnHead> : null}
                    <ColumnHead className="pr-(--card-spacing)">Status</ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}>
                        <BookRecordCell book={reservation.book} icon={Bookmark01Icon} />
                      </TableCell>
                      {desk ? <BorrowerCell borrower={reservation.borrower} /> : null}
                      {desk ? (
                        <TableCell className="py-3 tabular-nums">
                          {formatDate(reservation.reservedAt)}
                        </TableCell>
                      ) : null}
                      <TableCell className="py-3 pr-(--card-spacing)">
                        <ReservationStatusCell reservation={reservation} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </HitGroup>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
