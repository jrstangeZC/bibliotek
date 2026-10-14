"use client"

import * as React from "react"
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"

import { cn } from "@/lib/utils"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"

/*
 * The registry has no autocomplete for `base-maia`, so this is its combobox
 * (`npx shadcn@latest add combobox`) on Base UI's Autocomplete: the one for
 * free text, where Combobox picks a value and puts it back in the field when
 * the popup closes. The classes are the combobox's, less the tick and the
 * trigger an autocomplete has no use for.
 */

const Autocomplete = AutocompletePrimitive.Root

/**
 * The field: an `InputGroup` with the input in it. `children` go in the group
 * too, for addons. The group is Base UI's input group as well, so the popup
 * lines up with the whole field, addons included.
 */
function AutocompleteInput({
  className,
  children,
  ...props
}: Omit<AutocompletePrimitive.Input.Props, "className"> & {
  /** For the group, as on `InputGroup`. */
  className?: string
}) {
  return (
    <AutocompletePrimitive.InputGroup
      render={<InputGroup className={className} />}
    >
      <AutocompletePrimitive.Input render={<InputGroupInput />} {...props} />
      {children}
    </AutocompletePrimitive.InputGroup>
  )
}

function AutocompleteContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: AutocompletePrimitive.Popup.Props &
  Pick<
    AutocompletePrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          className={cn(
            "group/autocomplete-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

function AutocompleteList({
  className,
  ...props
}: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={cn(
        "max-h-(--available-height) scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteItem({
  className,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * A line read out politely when it changes, for what the list cannot show as
 * rows. Keep it mounted and change its children: a live region that comes and
 * goes is not reliably announced. Empty, it takes no room.
 */
function AutocompleteStatus({
  className,
  ...props
}: AutocompletePrimitive.Status.Props) {
  return (
    <AutocompletePrimitive.Status
      data-slot="autocomplete-status"
      className={cn(
        "px-4 pt-3 pb-1 text-sm text-muted-foreground empty:p-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * A hairline between rows. Decorative (`aria-hidden`) rather than
 * `role="separator"`, which a listbox may not hold.
 */
function AutocompleteSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="autocomplete-separator"
      className={cn("-mx-1 my-1 h-px bg-border/50", className)}
      {...props}
    />
  )
}

export {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteSeparator,
  AutocompleteStatus,
}
