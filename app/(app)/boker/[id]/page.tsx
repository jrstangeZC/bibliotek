import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  BookmarkAdd01Icon,
  BookmarkRemove01Icon,
  BookOpen01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";

import { BookStatusBadge, reservationBlockReasons } from "@/components/book-status";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  borrowBookAction,
  cancelOwnReservationAction,
  reserveBookAction,
} from "@/lib/actions";
import { getCurrentBorrower } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import {
  findBook,
  listActiveLoansForBook,
  LOAN_PERIOD_DAYS,
  type BookView,
} from "@/lib/loans";
import { HOLD_DAYS } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/boker/[id]">): Promise<Metadata> {
  const book = await findBook((await params).id);
  if (!book) return { title: "Ukjent bok – Bibliotek" };

  return {
    title: `${book.title} – Bibliotek`,
    description: `${book.title} av ${book.author}, utgitt ${book.year}`,
  };
}

/** The sentence under the actions: what pressing the button will do, or why there is none. */
function footerText(book: BookView, nextDueAt: string | undefined): string {
  const standing = book.viewer;
  if (!standing) {
    return "Katalogen er åpen for alle, men et lån må registreres på en person.";
  }

  const mine = standing.reservation;
  if (mine?.status === "ready" && mine.deadline) {
    return `Et eksemplar er holdt av til deg til ${formatDate(mine.deadline)}. Lånet løper i ${LOAN_PERIOD_DAYS} dager.`;
  }
  if (standing.canBorrow) {
    return `Lånet registreres på deg og løper i ${LOAN_PERIOD_DAYS} dager.`;
  }
  if (mine) {
    return `Du er nr. ${mine.position} i køen. Når et eksemplar kommer inn, holdes det av til deg i ${HOLD_DAYS} dager.`;
  }

  const firstBack = nextDueAt ? ` Det første forfaller ${formatDate(nextDueAt)}.` : "";
  const block = standing.reservationBlock;
  if (block && block !== "book-available") {
    return `Ingen eksemplarer er ledige nå.${firstBack} ${reservationBlockReasons[block]}.`;
  }

  const queue = book.waiting > 0 ? ` ${book.waiting} står i kø foran deg.` : "";
  return `Ingen eksemplarer er ledige nå.${firstBack} Reserver, så holdes det første som kommer inn av til deg i ${HOLD_DAYS} dager.${queue}`;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** «2 i kø · 1 holdt av», or «Ingen» when nobody is queueing. */
function describeQueue(book: BookView): string {
  const parts = [
    book.waiting > 0 ? `${book.waiting} i kø` : null,
    book.held > 0 ? `${book.held} holdt av` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Ingen";
}

export default async function BookPage({
  params,
  searchParams,
}: PageProps<"/boker/[id]">) {
  const { id } = await params;
  const viewer = await getCurrentBorrower();
  const book = await findBook(id, new Date(), viewer?.id ?? null);
  if (!book) notFound();

  const [activeLoans, { feil }] = await Promise.all([
    listActiveLoansForBook(id),
    searchParams,
  ]);
  const error = describeError(feil);
  const standing = book.viewer;
  const mine = standing?.reservation ?? null;

  // The copy that comes back first — the answer to "when can I get it?".
  // Undefined when nothing is on loan.
  const nextDueAt = activeLoans
    .map((loan) => loan.dueAt)
    .sort((a, b) => a.localeCompare(b))
    .at(0);

  return (
    <>
      <PageHeading title={book.title}>
        {book.author} · {book.year}
      </PageHeading>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Om eksemplarene</CardTitle>
          <CardDescription>
            Katalogopplysninger og hvor mange eksemplarer som står i hyllen nå.
          </CardDescription>
          <CardAction>
            <BookStatusBadge book={book} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border text-sm">
            <DetailRow label="Forfatter">{book.author}</DetailRow>
            <DetailRow label="Utgivelsesår">
              <span className="tabular-nums">{book.year}</span>
            </DetailRow>
            <DetailRow label="ISBN">
              <span className="tabular-nums">{book.isbn}</span>
            </DetailRow>
            <DetailRow label="Eksemplarer">
              <span className="tabular-nums">
                {book.available} av {book.copies} tilgjengelige
              </span>
            </DetailRow>
            <DetailRow label="Ute på lån">
              {book.onLoan === 0 ? (
                <span className="text-muted-foreground">Ingen</span>
              ) : (
                <span className="tabular-nums">{book.onLoan}</span>
              )}
            </DetailRow>
            <DetailRow label="Reservasjoner">
              <span
                className={
                  book.waiting + book.held === 0
                    ? "text-muted-foreground"
                    : "tabular-nums"
                }
              >
                {describeQueue(book)}
              </span>
            </DetailRow>
            <DetailRow label="Første innlevering">
              {nextDueAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground"
                  />
                  {formatDate(nextDueAt)}
                </span>
              ) : (
                <span className="text-muted-foreground">Ingen utlån</span>
              )}
            </DetailRow>
          </dl>
        </CardContent>
        <CardFooter className="flex-wrap gap-3">
          {!standing ? (
            <Button nativeButton={false} render={<Link href="/logg-inn" />}>
              <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
              Logg inn for å låne
            </Button>
          ) : standing.canBorrow ? (
            <form action={borrowBookAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <Button type="submit">
                <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
                Lån boken
              </Button>
            </form>
          ) : mine ? (
            <form action={cancelOwnReservationAction}>
              <input type="hidden" name="reservationId" value={mine.id} />
              <Button type="submit" variant="outline">
                <HugeiconsIcon icon={BookmarkRemove01Icon} strokeWidth={2} />
                Avbestill reservasjonen
              </Button>
            </form>
          ) : (
            <form action={reserveBookAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <Button type="submit" disabled={standing.reservationBlock !== null}>
                <HugeiconsIcon icon={BookmarkAdd01Icon} strokeWidth={2} />
                Reserver boken
              </Button>
            </form>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            Tilbake til boklisten
          </Button>
          <p className="basis-full text-sm/relaxed text-muted-foreground">
            {footerText(book, nextDueAt)}
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
