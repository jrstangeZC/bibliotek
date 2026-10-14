"use client"

import Form from "next/form"
import Link from "next/link"
import { useEffect, useState, type MouseEvent } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteSeparator,
  AutocompleteStatus,
} from "@/components/ui/autocomplete"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { Book } from "@/lib/types"

/**
 * The two ways into the global search at `/sok`. Both are GET forms, like the
 * catalogue search: the search lives in the URL, works without JavaScript and
 * comes back with the back button.
 */

/** One letter matches nearly every title, so the list waits for two. */
const MIN_LENGTH = 2

/** How long typing has to pause before the field asks for suggestions. */
const DEBOUNCE_MS = 200

/** Books in the list. The row below them always leads to the full search. */
const MAX_SUGGESTIONS = 6

/** A title as a suggestion shows it. */
type Suggestion = Pick<Book, "id" | "title" | "author" | "year">

/**
 * The answer to one search, kept with the search it answers. `books` is `null`
 * when the suggestions could not be fetched.
 */
type Suggestions = { query: string; books: Suggestion[] | null }

/** `/sok` with the search filled in, as the form would send it. */
function searchHref(query: string): string {
  return `/sok?${new URLSearchParams({ q: query })}`
}

/**
 * The titles that answer `query`, in the order of the book group on `/sok`,
 * from `GET /api/books?q=`. The matching is `lib/search.ts`, as everywhere
 * else. `null` when there is no answer, aborted or failed.
 */
async function fetchSuggestions(
  query: string,
  signal: AbortSignal
): Promise<Suggestion[] | null> {
  try {
    const response = await fetch(
      `/api/books?${new URLSearchParams({ q: query })}`,
      { signal }
    )
    if (!response.ok) return null
    const body: { books: Suggestion[] } = await response.json()
    return body.books.slice(0, MAX_SUGGESTIONS)
  } catch {
    return null
  }
}

/**
 * The compact field in the header, on every page but `/sok`. It has no button
 * on purpose — an exception to the search recipe in `docs/design/README.md`:
 * it only starts a search, Enter sends it, and the full recipe is on `/sok`.
 *
 * From two characters it suggests books as you type. Suggestions are books
 * only, the same for everyone; the last row goes to `/sok`, which also
 * searches people, loans and reservations. Arrow keys move through the rows
 * and Enter opens the marked one. With nothing marked, Enter sends the form,
 * and without JavaScript the form is all there is.
 *
 * Not `required`: the browser's own bubble is in the browser's language and
 * outside the design. An empty search lands on `/sok`, which explains instead.
 */
export function HeaderSearch() {
  const [value, setValue] = useState("")
  // Whether the list should show, once there is something to show in it.
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const query = value.trim()

  // Asks once typing pauses. A newer search, or the field going away, cancels
  // the one before it, so an answer to an older search never lands on top of
  // the answer to a newer one.
  useEffect(() => {
    if (query.length < MIN_LENGTH) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const books = await fetchSuggestions(query, controller.signal)
      if (!controller.signal.aborted) setSuggestions({ query, books })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function handleValueChange(next: string) {
    setValue(next)
    // Too short to search. Drop the old answer, or the list would reopen on it
    // before the next search has answered.
    if (next.trim().length < MIN_LENGTH) setSuggestions(null)
  }

  /** A row was chosen: the next page gets an empty field, as every page does. */
  function reset(event: MouseEvent) {
    // A click that opens a new tab leaves this page as it was.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    setOpen(false)
    setValue("")
    setSuggestions(null)
  }

  return (
    <Form action="/sok" role="search" className="w-full sm:w-56">
      <label htmlFor="hurtigsok" className="sr-only">
        Søk i biblioteket
      </label>
      <Autocomplete
        name="q"
        value={value}
        onValueChange={handleValueChange}
        // Base UI only reports a change from what it is told, so it is told
        // the list is closed while there is nothing to show.
        open={open && suggestions !== null}
        onOpenChange={setOpen}
      >
        <AutocompleteInput
          id="hurtigsok"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Søk …"
          // Leaving the field closes the list, also while it waits for an
          // answer and Base UI counts it as closed already.
          onBlur={() => setOpen(false)}
        >
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </InputGroupAddon>
        </AutocompleteInput>
        {suggestions ? (
          <AutocompleteContent className="sm:min-w-80">
            <SuggestionRows
              suggestions={suggestions}
              query={query}
              onChoose={reset}
            />
          </AutocompleteContent>
        ) : null}
      </Autocomplete>
      {/* Base UI puts a second, hidden text input in the form, and a form with
          two text fields and no submit button ignores Enter. This button,
          out of sight and out of the tab order, gives Enter back, with or
          without JavaScript. The field still shows no button. */}
      <button type="submit" tabIndex={-1} aria-hidden className="sr-only">
        Søk
      </button>
    </Form>
  )
}

/**
 * The open list: up to six books, then «Vis alle treff». Each row is a link,
 * so a click, a tap and Enter on a marked row all go the same way. Not
 * prefetched: the rows change with every pause in the typing.
 */
function SuggestionRows({
  suggestions,
  query,
  onChoose,
}: {
  suggestions: Suggestions
  /** The search as it stands in the field, which «Vis alle treff» sends. */
  query: string
  onChoose: (event: MouseEvent) => void
}) {
  const books = suggestions.books ?? []

  return (
    <>
      <AutocompleteStatus>
        {suggestions.books === null
          ? "Forslagene kunne ikke hentes. Trykk Enter for å søke likevel."
          : books.length === 0
            ? `Ingen bøker passer «${suggestions.query}»`
            : null}
      </AutocompleteStatus>
      <AutocompleteList>
        {books.map((book) => (
          <AutocompleteItem
            key={book.id}
            value={book.title}
            render={<Link href={`/boker/${book.id}`} prefetch={false} />}
            onClick={onChoose}
          >
            <span className="flex min-w-0 flex-col leading-snug">
              <span className="truncate font-medium">{book.title}</span>
              <span className="truncate text-muted-foreground">
                {book.author} · {book.year}
              </span>
            </span>
          </AutocompleteItem>
        ))}
        {books.length > 0 ? <AutocompleteSeparator /> : null}
        <AutocompleteItem
          value={query}
          render={<Link href={searchHref(query)} prefetch={false} />}
          onClick={onChoose}
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          <span className="truncate">Vis alle treff for «{query}»</span>
        </AutocompleteItem>
      </AutocompleteList>
    </>
  )
}

/**
 * The field on `/sok` itself, for adjusting the search. Keyed on `query`, so
 * the back and forward buttons, which swap the search without remounting the
 * page, swap the text in the field too.
 */
export function SearchField({
  query,
  placeholder,
  autoFocus = false,
}: {
  query: string
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <Form key={query} action="/sok" role="search">
      <label htmlFor="sokefelt" className="sr-only">
        Søk i biblioteket
      </label>
      <InputGroup>
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </InputGroupAddon>
        <InputGroupInput
          id="sokefelt"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          defaultValue={query}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="secondary" size="sm">
            Søk
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Form>
  )
}
