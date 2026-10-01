import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { BorrowerForm } from "@/components/borrower-form";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireBorrower } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Min profil – Bibliotek",
  description: "Navnet, e-postadressen og varslene dine",
};

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const [me, { lagret }] = await Promise.all([requireBorrower(), searchParams]);

  return (
    <>
      <PageHeading title="Min profil">
        Opplysningene biblioteket har om deg. Rollen din kan bare endres av en
        bibliotekar.
      </PageHeading>

      {lagret ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Profilen er lagret</AlertTitle>
          <AlertDescription>
            {me.notifyByEmail
              ? `Varsler om reserverte bøker sendes til ${me.email}.`
              : "Du får ikke e-post om reserverte bøker. Hold øye med Mine lån."}
          </AlertDescription>
        </Alert>
      ) : null}

      <BorrowerForm mode="self" borrower={me} />
    </>
  );
}
