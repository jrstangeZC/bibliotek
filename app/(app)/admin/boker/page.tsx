import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AlertCircleIcon,
  Book02Icon,
  BookOpen01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { BookStatusBadge } from "@/components/book-status";
import { CatalogueSearch, NoCatalogueMatches } from "@/components/catalogue-search";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { ColumnHead, IDENTITY_CELL, RecordCell } from "@/components/record-cell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { byTitle, searchBooks } from "@/lib/books";
import { describeError } from "@/lib/errors";
import { listBooks, type BookView } from "@/lib/loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bøker (administrasjon) – Bibliotek",
  description: "Opprett, rediger og slett titler i katalogen",
};

const NewBookLink = ({ className }: { className?: string }) => (
  <Link href="/admin/boker/ny" className={buttonVariants({ size: "sm", className })}>
    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
    Ny bok
  </Link>
);

/** Where the copies that are not on the shelf have gone, in a few words. */
function circulation(book: BookView): string {
  const parts = [
    book.onLoan > 0 ? `${book.onLoan} ute` : null,
    book.held > 0 ? `${book.held} holdt av` : null,
    book.waiting > 0 ? `${book.waiting} i kø` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Alle inne";
}

/**
 * The row's overflow menu. Delete is offered but disabled while copies are out,
 * with the reason on the item itself — the librarian learns why here instead
 * of on a confirmation page that cannot confirm.
 */
function BookActions({ book }: { book: BookView }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        aria-label={`Handlinger for «${book.title}»`}
      >
        <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem render={<Link href={`/admin/boker/${book.id}`} />}>
          <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
          Rediger
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/boker/${book.id}`} />}>
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
          Vis slik lånerne ser den
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {book.onLoan > 0 ? (
          <DropdownMenuItem
            disabled
            className="items-start text-muted-foreground data-disabled:opacity-100"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="mt-0.5" />
            <span className="flex flex-col leading-snug">
              Slett …
              <span className="text-xs">
                {book.onLoan === 1
                  ? "Mulig når det utlånte eksemplaret er levert"
                  : `Mulig når de ${book.onLoan} utlånte er levert`}
              </span>
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            variant="destructive"
            render={<Link href={`/admin/boker/${book.id}/slett`} />}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Slett …
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default async function AdminBooksPage({
  searchParams,
}: PageProps<"/admin/boker">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Bøker" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const [catalogue, { feil, ny, lagret, slettet, q }] = await Promise.all([
    listBooks(),
    searchParams,
  ]);
  const books = catalogue.toSorted(byTitle);
  const { query, matches } = searchBooks(books, q);
  const error = describeError(feil);
  const created = typeof ny === "string" ? books.find((book) => book.id === ny) : null;
  const saved = typeof lagret === "string" ? books.find((book) => book.id === lagret) : null;
  // The row just added or edited stays marked, so the eye finds it in the list.
  const touched = (created ?? saved)?.id;

  return (
    <>
      <PageHeading title="Bøker">
        Katalogen slik lånerne ser den. Opprett nye bøker, rediger opplysningene
        og slett bøker som ikke lenger er i samlingen.
      </PageHeading>
      <AdminNav />

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      {created ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>«{created.title}» er lagt til</AlertTitle>
          <AlertDescription>
            Boken står i katalogen og kan lånes ut med én gang.
          </AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Endringene i «{saved.title}» er lagret</AlertTitle>
          <AlertDescription>
            Katalogen viser de nye opplysningene overalt.
          </AlertDescription>
        </Alert>
      ) : null}

      {slettet ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Boken er slettet</AlertTitle>
          <AlertDescription>
            Tittelen er tatt ut av katalogen. Gamle lån av den står igjen i
            historikken som «Ukjent tittel».
          </AlertDescription>
        </Alert>
      ) : null}

      {books.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Book02Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen bøker i katalogen</EmptyTitle>
            <EmptyDescription>
              Samlingen er tom. Legg inn den første tittelen, så kan den lånes ut.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewBookLink />
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Katalogen</CardTitle>
            <CardDescription>
              {books.length} titler i alfabetisk rekkefølge. Klikk en tittel for
              å endre den.
            </CardDescription>
            <CardAction>
              <NewBookLink />
            </CardAction>
          </CardHeader>

          <CatalogueSearch
            action="/admin/boker"
            inputId="katalogsok"
            label="Søk i katalogen"
            query={query}
            matches={matches.length}
            total={books.length}
          />

          <CardContent className={matches.length > 0 ? "px-0" : undefined}>
            {matches.length === 0 ? (
              <NoCatalogueMatches query={query} href="/admin/boker" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    <ColumnHead className="text-right">Ledige</ColumnHead>
                    <ColumnHead>Status</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing) text-right">
                      Handling
                    </ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((book) => (
                    <TableRow
                      key={book.id}
                      data-state={book.id === touched ? "selected" : undefined}
                      // Half strength, or the row swallows its own `bg-muted` icon tile.
                      className="data-[state=selected]:bg-muted/60"
                    >
                      <TableCell
                        className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                      >
                        <RecordCell
                          icon={book.available > 0 ? Book02Icon : BookOpen01Icon}
                          name={book.title}
                          href={`/admin/boker/${book.id}`}
                        >
                          {book.author} · {book.year} · ISBN {book.isbn}
                        </RecordCell>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        <div className="flex flex-col leading-snug">
                          <span className="font-medium">
                            {book.available} av {book.copies}
                          </span>
                          <span className="text-muted-foreground">
                            {circulation(book)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <BookStatusBadge book={book} />
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing) text-right">
                        <BookActions book={book} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
