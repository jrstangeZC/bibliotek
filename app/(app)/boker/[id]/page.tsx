import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  BookOpen01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";

import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { borrowBookAction } from "@/lib/actions";
import { getCurrentBorrower } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { findBook, listActiveLoansForBook, LOAN_PERIOD_DAYS } from "@/lib/loans";

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

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function BookPage({
  params,
  searchParams,
}: PageProps<"/boker/[id]">) {
  const { id } = await params;
  const book = await findBook(id);
  if (!book) notFound();

  const [activeLoans, viewer, { feil }] = await Promise.all([
    listActiveLoansForBook(id),
    getCurrentBorrower(),
    searchParams,
  ]);
  const error = describeError(feil);

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
            {book.available > 0 ? (
              <Badge>Tilgjengelig</Badge>
            ) : (
              <Badge variant="secondary">Utlånt</Badge>
            )}
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
          {viewer ? (
            <form action={borrowBookAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <Button type="submit" disabled={book.available === 0}>
                <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
                Lån boken
              </Button>
            </form>
          ) : (
            <Button nativeButton={false} render={<Link href="/logg-inn" />}>
              <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
              Logg inn for å låne
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            Tilbake til boklisten
          </Button>
          <p className="basis-full text-sm/relaxed text-muted-foreground">
            {!viewer
              ? "Katalogen er åpen for alle, men et lån må registreres på en person."
              : book.available > 0
                ? `Lånet registreres på deg og løper i ${LOAN_PERIOD_DAYS} dager.`
                : `Alle eksemplarer er utlånt.${
                    nextDueAt ? ` Det første forfaller ${formatDate(nextDueAt)}.` : ""
                  }`}
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
