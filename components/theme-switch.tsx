"use client"

import { useOptimistic, useTransition } from "react"

import { WordSwitch } from "@/components/word-switch"
import { setThemeAction } from "@/lib/actions"
import type { Theme } from "@/lib/theme"

/**
 * «Mørk» on the left, «Lys» on the right, and the thumb slides to the one in
 * use. Either word can be pressed as well as the switch itself.
 *
 * The thumb and the `dark` class move at once; the action then stores the
 * cookie, and the re-render that follows sets the same class from the server.
 */
export function ThemeSwitch({ theme }: { theme: Theme }) {
  const [shown, setShown] = useOptimistic(theme)
  const [, startTransition] = useTransition()

  function choose(next: Theme) {
    document.documentElement.classList.toggle("dark", next === "dark")
    document.documentElement.style.setProperty("color-scheme", next)

    startTransition(async () => {
      setShown(next)
      const formData = new FormData()
      formData.set("theme", next)
      await setThemeAction(formData)
    })
  }

  return (
    <WordSwitch
      value={shown}
      off={{ value: "dark", label: "Mørk" }}
      on={{ value: "light", label: "Lys" }}
      label="Lys modus"
      onChange={choose}
    />
  )
}
