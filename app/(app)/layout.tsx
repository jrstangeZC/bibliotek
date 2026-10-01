import type { ReactNode } from "react";

import { HoldReadyBanner } from "@/components/hold-ready-banner";
import { SiteHeader } from "@/components/site-header";
import { getCurrentBorrower } from "@/lib/auth";
import { listReservationsForBorrower } from "@/lib/loans";

/**
 * The shell every screen in the lending system shares. `/stil` sits outside
 * this group and brings its own chrome.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentBorrower();
  // Copies set aside for this person, soonest deadline first.
  const holds = user
    ? (await listReservationsForBorrower(user.id)).filter(
        (reservation) => reservation.status === "ready"
      )
    : [];

  return (
    <>
      <SiteHeader user={user} readyCount={holds.length} />
      <main className="mx-auto w-full max-w-225 flex-1 px-6 py-12">
        <HoldReadyBanner holds={holds} />
        {children}
      </main>
    </>
  );
}
