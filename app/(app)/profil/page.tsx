import type { Metadata } from "next";

import { BorrowerForm } from "@/components/borrower-form";
import { PageHeading } from "@/components/page-heading";
import { requireBorrower } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Min profil – Bibliotek",
  description: "Navnet, e-postadressen og varslene dine",
};

export default async function ProfilePage() {
  const me = await requireBorrower();

  return (
    <>
      <PageHeading title="Min profil">
        Opplysningene biblioteket har om deg. Rollen din kan bare endres av en
        bibliotekar.
      </PageHeading>

      <BorrowerForm mode="self" borrower={me} />
    </>
  );
}
