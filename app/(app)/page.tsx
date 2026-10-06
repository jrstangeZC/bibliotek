import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Book02Icon,
  BookmarkAdd01Icon,
  BookOpen01Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";

import { BookStatusBadge, reservationBlockReasons } from "@/components/book-status";
import { CatalogueSearch, NoCatalogueMatches } from "@/components/catalogue-search";
import { PageHeading } from "@/components/page-heading";
import { ColumnHead, IDENTITY_CELL, RecordCell } from "@/components/record-cell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
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
import { borrowBookAction, reserveBookAction } from "@/lib/actions";
import { getCurrentBorrower } from "@/lib/auth";
import { searchBooks } from "@/lib/search";
import { listBooks, type BookView } from "@/lib/loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bøker – Bibliotek",
  description: "Alle titlene i samlingen og hvor mange eksemplarer som er ledige",
};

/**
 * The first item in a row's menu: borrow when a copy is free (or held for the
 * reader), reserve when not, and — when neither is open to them — the reserve
 * item disabled with the reason beside it. Its form lives outside the popup;
 * see the comment in the table below.
 */
function BorrowOrReserveItem({ book }: { book: BookView }) {
  const standing = book.viewer;

  if (!standing) {
    return (
      <DropdownMenuItem render={<Link href="/logg-inn" />}>
        <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
        Logg inn for å låne
      </DropdownMenuItem>
    );
  }

  if (standing.canBorrow) {
    return (
      <DropdownMenuItem
        nativeButton
        render={<button type="submit" form={`laan-${book.id}`} />}
      >
        <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
        Lån boken
      </DropdownMenuItem>
    );
  }

  const block = standing.reservationBlock;
  if (block && block !== "book-available") {
    // Only the action fades; the reason is what the reader needs to read.
    return (
      <DropdownMenuItem disabled className="data-disabled:opacity-100">
        <HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} className="opacity-50" />
        <span className="flex flex-col leading-snug">
          <span className="opacity-50">Reserver boken</span>
          <span className="text-xs text-muted-foreground">
            {reservationBlockReasons[block]}
          </span>
        </span>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      nativeButton
      render={<button type="submit" form={`reserver-${book.id}`} />}
    >
      <HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} />
      Reserver boken
    </DropdownMenuItem>
  );
}

export default async function BooksPage({ searchParams }: PageProps<"/">) {
  const [viewer, { q }] = await Promise.all([getCurrentBorrower(), searchParams]);
  const books = await listBooks(new Date(), viewer?.id ?? null);
  const { query, matches } = searchBooks(books, q);

  return (
    <>
      <PageHeading title="Bøker">
        Hele samlingen, med antall eksemplarer som står ledig akkurat nå. Åpne en
        tittel for å låne den, eller reserver den hvis alle eksemplarene er ute.
      </PageHeading>

      {books.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Book02Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen bøker i katalogen</EmptyTitle>
            <EmptyDescription>
              Samlingen er tom. Legg inn titler i datagrunnlaget før du låner ut.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Samlingen</CardTitle>
            <CardDescription>
              {books.length} titler. Lånetiden er 28 dager fra utlånsdagen.
            </CardDescription>
          </CardHeader>

          <CatalogueSearch
            action="/"
            inputId="samlingsok"
            label="Søk i samlingen"
            query={query}
            matches={matches.length}
            total={books.length}
          />

          <CardContent className={matches.length > 0 ? "px-0" : undefined}>
            {matches.length === 0 ? (
              <NoCatalogueMatches query={query} href="/" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <ColumnHead className="pl-(--card-spacing)">Tittel</ColumnHead>
                    <ColumnHead className="text-right">Eksemplarer</ColumnHead>
                    <ColumnHead>Status</ColumnHead>
                    <ColumnHead className="pr-(--card-spacing) text-right">
                      Handling
                    </ColumnHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell
                        className={`py-3 pl-(--card-spacing) ${IDENTITY_CELL}`}
                      >
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
                      <TableCell className="py-3">
                        <BookStatusBadge book={book} />
                      </TableCell>
                      <TableCell className="py-3 pr-(--card-spacing) text-right">
                        {/* The form lives outside the popup. A menu closes the
                            instant an item is pressed, and a form torn out of the
                            tree mid-submit never completes — so the item points at
                            this one with the native `form` attribute. */}
                        <form
                          id={`laan-${book.id}`}
                          action={borrowBookAction}
                          className="hidden"
                        >
                          <input type="hidden" name="bookId" value={book.id} />
                        </form>
                        <form
                          id={`reserver-${book.id}`}
                          action={reserveBookAction}
                          className="hidden"
                        >
                          <input type="hidden" name="bookId" value={book.id} />
                        </form>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                            aria-label={`Handlinger for «${book.title}»`}
                          >
                            <HugeiconsIcon
                              icon={MoreVerticalIcon}
                              strokeWidth={2}
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <BorrowOrReserveItem book={book} />
                            <DropdownMenuItem
                              render={<Link href={`/boker/${book.id}`} />}
                            >
                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                strokeWidth={2}
                              />
                              Se boken
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
