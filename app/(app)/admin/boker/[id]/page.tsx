import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { BookForm } from "@/components/book-form";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { findBook } from "@/lib/loans";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/boker/[id]">): Promise<Metadata> {
  const book = await findBook((await params).id);

  return { title: `${book ? `Rediger «${book.title}»` : "Ukjent bok"} – Bibliotek` };
}

/** A micro label over its value — the stat-block idiom, without the figure. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
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
      <AdminBreadcrumbs
        parents={[{ label: "Bøker", href: "/admin/boker" }]}
        current={book.title}
      />

      <PageHeading title={book.title}>
        {book.author} · {book.year}
      </PageHeading>

      {/* What the book is right now, so the form below reads as a change to it. */}
      <dl className="mb-8 flex flex-wrap gap-x-10 gap-y-4">
        <Fact label="ISBN">{book.isbn}</Fact>
        <Fact label="Eksemplarer">{book.copies}</Fact>
        <Fact label="Ledige nå">{book.available}</Fact>
        <Fact label="Status">
          {book.available > 0 ? (
            <Badge>Tilgjengelig</Badge>
          ) : (
            <Badge variant="secondary">Utlånt</Badge>
          )}
        </Fact>
      </dl>

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
            Tar tittelen ut av katalogen. Du må bekrefte først.
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
