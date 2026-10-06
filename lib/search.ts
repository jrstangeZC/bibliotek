import { ISBN_PATTERN, normalizeIsbn } from "@/lib/books";
import type { Book, Borrower } from "@/lib/types";

/**
 * How a search box reads what was typed, and whether a record answers it. Pure —
 * no disk, no session. The catalogue search and the global search at `/sok`
 * both go through here, so two fields never disagree about the same book.
 *
 * The rule of thumb is to match too much rather than too little: in a small
 * library a few extra rows cost less than a search that misses, and the
 * keyboard is not always Norwegian.
 */

/**
 * Text as a search compares it. Case, accents and punctuation are noise, and
 * the Norwegian letters fold to what a foreign keyboard would type:
 * «Sæther» → `saether`, «Håkon» and «Haakon» → `hakon`, «J.K.» → `jk`.
 *
 * Only for finding matches. It changes the length of the text, so it cannot
 * mark where a match sits, and sorting still uses `byTitle`, which files
 * æ, ø and å after z.
 */
export function fold(text: string): string {
  return (
    text
      // é → e, ö → o, å → a.
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("nb")
      // NFD leaves æ and ø whole. «aa» is the old spelling of «å».
      .replace(/æ/g, "ae")
      .replace(/ø/g, "o")
      .replace(/aa/g, "a")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
  );
}

/** At least three digits, so «9» does not match every ISBN in the catalogue. */
const ISBN_FRAGMENT = /^\d{3,}X?$/;

/** What a search box sent, read once. `null` from `parseQuery` means nothing was searched. */
export type ParsedQuery = {
  /** As typed, trimmed. */
  query: string;
  /** Folded words. Every one must match the same record. */
  terms: string[];
  /**
   * The whole search as one ISBN fragment, separators dropped, when it is only
   * digits, spaces and hyphens (and perhaps a final X). `978 0 618 64015 7`
   * would otherwise split into words too short to match anything.
   */
  isbnFragment: string | null;
  /** The whole search when it is a complete ISBN-10 or ISBN-13, normalised. */
  completeIsbn: string | null;
};

/**
 * Reads the `q` search parameter. Missing, blank, repeated (`?q=a&q=b`) or
 * nothing but punctuation all come back as `null`: there is nothing to search for.
 */
export function parseQuery(q: string | string[] | undefined): ParsedQuery | null {
  if (typeof q !== "string") return null;

  const query = q.trim();
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;

  const compact = normalizeIsbn(query);
  const isbnFragment = ISBN_FRAGMENT.test(compact) ? compact : null;

  return {
    query,
    terms,
    isbnFragment,
    completeIsbn: isbnFragment && ISBN_PATTERN.test(isbnFragment) ? isbnFragment : null,
  };
}

/**
 * The nine digits an ISBN-10 shares with its 978 ISBN-13: digits 1–9 of the
 * one, 4–12 of the other. `null` for a 979 ISBN-13, which has no ISBN-10.
 * The check digit is left out because `validateBook` never verifies it.
 */
function isbnCore(isbn: string): string | null {
  if (/^\d{9}[\dX]$/.test(isbn)) return isbn.slice(0, 9);
  if (/^978\d{10}$/.test(isbn)) return isbn.slice(3, 12);
  return null;
}

/** The fields a record is searched on. `isbn` is matched on its digits, never as text. */
export type Haystack = { text: string[]; isbn?: string };

/**
 * Whether a record answers a search. Every word must appear somewhere in the
 * record — any field, any order, part of a word is enough — so «tolkien 1954»
 * narrows instead of widening.
 *
 * The ISBN also matches the whole search at once: as a fragment of its digits,
 * and, for a complete ISBN, as the same book under the other length, so
 * `0-618-64015-0` finds `978-0-618-64015-7`.
 */
export function matchesQuery(query: ParsedQuery, haystack: Haystack): boolean {
  const isbn = haystack.isbn === undefined ? null : normalizeIsbn(haystack.isbn);

  if (isbn !== null) {
    if (query.isbnFragment && isbn.includes(query.isbnFragment)) return true;

    const core = query.completeIsbn ? isbnCore(query.completeIsbn) : null;
    if (core !== null && core === isbnCore(isbn)) return true;
  }

  const fields = haystack.text.map(fold);

  return query.terms.every((term) => {
    if (fields.some((field) => field.includes(term))) return true;

    const digits = normalizeIsbn(term);
    return isbn !== null && ISBN_FRAGMENT.test(digits) && isbn.includes(digits);
  });
}

/** A title is searched on its title, author, year and ISBN. */
export function bookHaystack(book: Book): Haystack {
  return { text: [book.title, book.author, String(book.year)], isbn: book.isbn };
}

/** A person is searched on name and email. Never on id or role. */
export function personHaystack(person: Borrower): Haystack {
  return { text: [person.name, person.email] };
}

/** Whether a book answers a search. A blank search matches every book. */
export function matchesBookQuery(book: Book, query: string): boolean {
  const parsed = parseQuery(query);
  return parsed === null || matchesQuery(parsed, bookHaystack(book));
}

/**
 * A list narrowed by the `q` search parameter, as the catalogue pages read it.
 * Anything `parseQuery` reads as no search leaves the list whole, with `query`
 * empty.
 */
export function searchBooks<T extends Book>(
  books: T[],
  q: string | string[] | undefined
): { query: string; matches: T[] } {
  const parsed = parseQuery(q);
  if (parsed === null) return { query: "", matches: books };

  return {
    query: parsed.query,
    matches: books.filter((book) => matchesQuery(parsed, bookHaystack(book))),
  };
}
