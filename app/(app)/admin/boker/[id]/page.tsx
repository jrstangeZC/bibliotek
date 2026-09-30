import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { BookForm } from "@/components/book-form";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { findBook } from "@/lib/loans";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/boker/[id]">): Promise<Metadata> {
  const book = await findBook((await params).id);

  return { title: `${book ? `Rediger «${book.title}»` : "Ukjent bok"} – Bibliotek` };
}

export default async function EditBookPage({
  params,
}: PageProps<"/admin/boker/[id]">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Rediger bok" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const { id } = await params;
  const book = await findBook(id);
  if (!book) notFound();

  return (
    <>
      <PageHeading title={book.title}>
        {book.author} · {book.year}
      </PageHeading>
      <AdminNav />
      <BookForm book={book} onLoan={book.onLoan} />

      {/* Destructive entry points are quiet: an inset row, not a red button in
          the layout. It leads to a confirmation page, it does not delete. */}
      <Link
        href={`/admin/boker/${book.id}/slett`}
        className="mt-8 flex items-center gap-3 rounded-2xl border border-destructive/25 bg-card px-5 py-4 text-sm hover:bg-destructive/5"
      >
        <HugeiconsIcon
          icon={AlertCircleIcon}
          strokeWidth={2}
          className="size-5 shrink-0 text-destructive"
        />
        <span className="flex min-w-0 flex-col leading-snug">
          <span className="font-medium">Slett boken</span>
          <span className="text-muted-foreground">
            Tar tittelen ut av katalogen. Du får en bekreftelse først.
          </span>
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className="ml-auto size-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </>
  );
}
