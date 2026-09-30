import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Delete02Icon } from "@hugeicons/core-free-icons";

import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteBookAction } from "@/lib/actions";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { getLoans } from "@/lib/db";
import { findBook } from "@/lib/loans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Slett bok – Bibliotek",
  description: "Bekreft at en tittel skal tas ut av katalogen",
};

export default async function DeleteBookPage({
  params,
}: PageProps<"/admin/boker/[id]/slett">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Slett bok" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const { id } = await params;
  const [book, loans] = await Promise.all([findBook(id), getLoans()]);
  if (!book) notFound();

  const history = loans.filter((loan) => loan.bookId === id).length - book.onLoan;
  const blocked = book.onLoan > 0;

  return (
    <>
      <AdminBreadcrumbs
        parents={[
          { label: "Bøker", href: "/admin/boker" },
          { label: book.title, href: `/admin/boker/${book.id}` },
        ]}
        current="Slett"
      />
      <PageHeading title="Slett bok">
        Sletting tar tittelen ut av katalogen for alle, og kan ikke angres.
      </PageHeading>

      {blocked ? (
        <Alert variant="destructive" className="mb-6">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
          <AlertTitle>
            {book.onLoan === 1
              ? "Ett eksemplar er ute på lån"
              : `${book.onLoan} eksemplarer er ute på lån`}
          </AlertTitle>
          <AlertDescription>
            Boken kan ikke slettes før alle er levert tilbake, ellers blir lånene
            stående uten bok. Registrer retur under{" "}
            <Link href="/admin" className="underline underline-offset-2">
              Aktive lån
            </Link>
            , og kom tilbake hit.
          </AlertDescription>
        </Alert>
      ) : null}

      <form action={deleteBookAction}>
        <input type="hidden" name="id" value={book.id} />
        <Card>
          <CardHeader>
            <CardTitle>Slett «{book.title}»?</CardTitle>
            <CardDescription>
              {book.author} · {book.year} · {book.copies}{" "}
              {book.copies === 1 ? "eksemplar" : "eksemplarer"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm/relaxed text-muted-foreground">
            <p className="max-w-2xl">
              Tittelen forsvinner fra boklisten og fra denne oversikten, og den
              kan ikke lånes lenger.
              {history > 0
                ? ` De ${history} tidligere lånene av den blir stående i historikken som «Ukjent tittel».`
                : " Ingen har lånt den før, så ingenting annet påvirkes."}
            </p>
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="submit" variant="destructive" disabled={blocked}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Slett boken
            </Button>
            <Link
              href={`/admin/boker/${book.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Avbryt
            </Link>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
