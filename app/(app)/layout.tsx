import { cookies } from "next/headers"
import type { ReactNode } from "react"

import { HoldReadyBanner } from "@/components/hold-ready-banner"
import { SiteHeader } from "@/components/site-header"
import { getCurrentBorrower } from "@/lib/auth"
import { listReservationsForBorrower } from "@/lib/loans"
import { parseTheme, THEME_COOKIE } from "@/lib/theme"

/**
 * The shell every screen in the lending system shares. `/stil` sits outside
 * this group and brings its own chrome.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentBorrower()
  // Copies set aside for this person, soonest deadline first.
  const holds = user
    ? (await listReservationsForBorrower(user.id)).filter(
        (reservation) => reservation.status === "ready"
      )
    : []
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <>
      <SiteHeader user={user} readyCount={holds.length} theme={theme} />
      <main className="mx-[max(10%,calc((100%_-_var(--container-7xl))/2))] max-w-7xl flex-1 px-6 py-12">
        <HoldReadyBanner holds={holds} />
        {children}
      </main>
    </>
  )
}
