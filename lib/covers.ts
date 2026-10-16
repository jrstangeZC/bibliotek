import { ISBN_PATTERN, normalizeIsbn } from "@/lib/books"

/**
 * Cover images from the Open Library Covers API, looked up by ISBN. Free and
 * keyless; the one limit is 100 ISBN lookups per IP per five minutes, which
 * `next/image` absorbs by fetching each cover once on the server and caching
 * it. `next.config.ts` allows exactly this host, path and query.
 *
 * `default=false` makes a missing cover a 404 instead of a blank 1×1 pixel, so
 * the `<img>` errors and `BookCover` can fall back to the icon.
 */
export const COVER_HOST = "covers.openlibrary.org"

/** Open Library's sizes. `M` is about 180 px wide, `L` about 500. */
export type CoverSize = "M" | "L"

/** Where the cover lives, or null when the ISBN cannot be looked up. */
export function coverUrl(isbn: string, size: CoverSize): string | null {
  const normalized = normalizeIsbn(isbn)
  if (!ISBN_PATTERN.test(normalized)) return null
  return `https://${COVER_HOST}/b/isbn/${normalized}-${size}.jpg?default=false`
}
