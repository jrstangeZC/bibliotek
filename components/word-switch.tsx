"use client"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * A switch between two named choices, a word on each side: the thumb slides
 * towards the one in use, and either word can be pressed as well as the switch
 * itself. The words are hidden from screen readers, which hear the switch's
 * own `label` — on means `on`.
 */
export function WordSwitch<T extends string>({
  value,
  off,
  on,
  label,
  onChange,
}: {
  value: T
  off: { value: T; label: string }
  on: { value: T; label: string }
  label: string
  onChange: (next: T) => void
}) {
  function choose(next: T) {
    if (next !== value) onChange(next)
  }

  const word = (choice: { value: T; label: string }) => (
    <button
      type="button"
      onClick={() => choose(choice.value)}
      aria-hidden
      tabIndex={-1}
      className={cn(
        "cursor-pointer text-xs font-medium transition-colors",
        value === choice.value ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {choice.label}
    </button>
  )

  return (
    <div className="flex items-center gap-2">
      {word(off)}
      <Switch
        aria-label={label}
        checked={value === on.value}
        onCheckedChange={(checked) => choose(checked ? on.value : off.value)}
      />
      {word(on)}
    </div>
  )
}
