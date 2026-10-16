/**
 * How the front page shows the collection: the table, or one book at a time
 * in a carousel. Kept in a cookie like the theme, so the server renders the
 * chosen view straight away and the page never jumps after hydration.
 */
export const BROWSE_COOKIE = "visning"

/** A year, like the theme — a preference should outlast a demo. */
export const BROWSE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type BrowseMode = "list" | "carousel"

/** Anything but an explicit `carousel` is the list, which is what the app shipped as. */
export function parseBrowseMode(value: string | undefined | null): BrowseMode {
  return value === "carousel" ? "carousel" : "list"
}
