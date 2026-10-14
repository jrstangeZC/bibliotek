"use client"

import { useOptimistic, useTransition } from "react"

import { Switch } from "@/components/ui/switch"
import { setThemeAction } from "@/lib/actions"
import type { Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

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
    if (next === shown) return
    document.documentElement.classList.toggle("dark", next === "dark")
    document.documentElement.style.setProperty("color-scheme", next)

    startTransition(async () => {
      setShown(next)
      const formData = new FormData()
      formData.set("theme", next)
      await setThemeAction(formData)
    })
  }

  const word = (value: Theme, label: string) => (
    <button
      type="button"
      onClick={() => choose(value)}
      aria-hidden
      tabIndex={-1}
      className={cn(
        "cursor-pointer text-xs font-medium transition-colors",
        shown === value ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center gap-2">
      {word("dark", "Mørk")}
      <Switch
        aria-label="Lys modus"
        checked={shown === "light"}
        onCheckedChange={(checked) => choose(checked ? "light" : "dark")}
      />
      {word("light", "Lys")}
    </div>
  )
}
