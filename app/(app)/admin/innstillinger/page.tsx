import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, LockKeyIcon } from "@hugeicons/core-free-icons";

import { AdminNav } from "@/components/admin-nav";
import { LibrarianRequired } from "@/components/librarian-required";
import { PageHeading } from "@/components/page-heading";
import { ResetDemoData } from "@/components/reset-demo-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { isLibrarian, requireBorrower } from "@/lib/auth";
import { DEMO_RESET_ENABLED } from "@/lib/demo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Innstillinger – Bibliotek",
  description: "Innstillinger for demoen, og tilbakestilling av datagrunnlaget",
};

export default async function SettingsPage({
  searchParams,
}: PageProps<"/admin/innstillinger">) {
  const user = await requireBorrower();
  if (!isLibrarian(user)) {
    return (
      <>
        <PageHeading title="Innstillinger" />
        <LibrarianRequired user={user} />
      </>
    );
  }

  const { tilbakestilt } = await searchParams;

  return (
    <>
      <PageHeading title="Innstillinger">
        Oppsett for demoen selv, ikke for biblioteket. Ingenting her endrer
        hvordan utlån og gebyrer regnes ut.
      </PageHeading>
      <AdminNav />

      {tilbakestilt ? (
        <Alert className="mb-6">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
          <AlertTitle>Demodataene er tilbakestilt</AlertTitle>
          <AlertDescription>
            Samlingen og registeret står som i data/seed.json igjen. Alt som ble
            registrert etter forrige tilbakestilling er borte.
          </AlertDescription>
        </Alert>
      ) : null}

      {DEMO_RESET_ENABLED ? (
        <ResetDemoData />
      ) : (
        /* Not an error — the guard is doing its job. Saying so beats an empty
           page that reads like something failed to load. */
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={LockKeyIcon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Ingen innstillinger her</EmptyTitle>
            <EmptyDescription>
              Tilbakestilling av demodata er slått av i dette miljøet, så alle
              kan ikke nullstille samlingen for alle andre. Sett
              ALLOW_DEMO_RESET=true for å slå den på.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}
