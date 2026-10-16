"use client"

import {
  createContext,
  useContext,
  useOptimistic,
  useTransition,
  type ReactNode,
} from "react"

import { WordSwitch } from "@/components/word-switch"
import { setBrowseModeAction } from "@/lib/actions"
import type { BrowseMode } from "@/lib/browse"

type BrowseModeContextValue = {
  shown: BrowseMode
  choose: (next: BrowseMode) => void
}

const BrowseModeContext = createContext<BrowseModeContextValue | null>(null)

function useBrowseMode() {
  const context = useContext(BrowseModeContext)
  if (!context) {
    throw new Error("useBrowseMode must be used within <BrowseModeProvider>")
  }
  return context
}

/**
 * Shares the chosen view between the switch in the heading and the collection
 * further down. The view changes at once; the action then stores the cookie,
 * and the re-render that follows renders the same view from the server.
 */
export function BrowseModeProvider({
  mode,
  children,
}: {
  mode: BrowseMode
  children: ReactNode
}) {
  const [shown, setShown] = useOptimistic(mode)
  const [, startTransition] = useTransition()

  function choose(next: BrowseMode) {
    startTransition(async () => {
      setShown(next)
      const formData = new FormData()
      formData.set("mode", next)
      await setBrowseModeAction(formData)
    })
  }

  return (
    <BrowseModeContext.Provider value={{ shown, choose }}>
      {children}
    </BrowseModeContext.Provider>
  )
}

/** «Liste» on the left, «Karusell» on the right — the same recipe as the theme switch. */
export function BrowseModeSwitch() {
  const { shown, choose } = useBrowseMode()

  return (
    <WordSwitch
      value={shown}
      off={{ value: "list", label: "Liste" }}
      on={{ value: "carousel", label: "Karusell" }}
      label="Bla i karusell"
      onChange={choose}
    />
  )
}

/**
 * Shows whichever view is chosen. Both arrive rendered from the server, so
 * switching needs no round trip before it shows.
 */
export function BrowseModeView({
  list,
  carousel,
}: {
  list: ReactNode
  carousel: ReactNode
}) {
  const { shown } = useBrowseMode()
  return shown === "carousel" ? carousel : list
}
