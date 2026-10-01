import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { BorrowerForm } from "@/components/borrower-form";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { getBorrower } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/admin/brukere/[id]">): Promise<Metadata> {
  const person = await getBorrower((await params).id);

  return { title: `${person ? `Rediger ${person.name}` : "Ukjent bruker"} – Bibliotek` };
}

export default async function EditBorrowerPage({
  params,
}: PageProps<"/admin/brukere/[id]">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Rediger bruker" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const person = await getBorrower((await params).id);
  if (!person) notFound();

  return (
    <>
      <AdminBreadcrumbs
        parents={[{ label: "Brukere", href: "/admin/brukere" }]}
        current={person.name}
      />
      <PageHeading title={person.name}>{person.email}</PageHeading>
      <BorrowerForm mode="edit" borrower={person} />
    </>
  );
}
