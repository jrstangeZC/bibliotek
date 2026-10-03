import type { Metadata } from "next";

import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { BorrowerForm } from "@/components/borrower-form";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { isLibrarian, requireBorrower } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ny bruker – Bibliotek",
  description: "Registrer en ny låner eller bibliotekar",
};

export default async function NewBorrowerPage() {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Ny bruker" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  return (
    <>
      <AdminBreadcrumbs
        parents={[{ label: "Brukere", href: "/admin/brukere" }]}
        current="Ny bruker"
      />
      <PageHeading title="Ny bruker">
        Navn og e-post må fylles inn. Velg bibliotekar bare for dem som skal
        jobbe i skranken.
      </PageHeading>
      <BorrowerForm mode="create" />
    </>
  );
}
