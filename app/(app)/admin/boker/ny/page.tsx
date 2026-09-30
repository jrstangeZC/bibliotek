import type { Metadata } from "next";

import { AdminNav } from "@/components/admin-nav";
import { BookForm } from "@/components/book-form";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { isLibrarian, requireBorrower } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ny bok – Bibliotek",
  description: "Legg en ny tittel inn i katalogen",
};

export default async function NewBookPage() {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Ny bok" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  return (
    <>
      <PageHeading title="Ny bok">
        Fyll inn opplysningene fra bokas kolofon. Ingen felt er valgfrie.
      </PageHeading>
      <AdminNav />
      <BookForm />
    </>
  );
}
