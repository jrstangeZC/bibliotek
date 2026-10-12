/**
 * Light or dark. Kept in a cookie rather than in the browser alone, so the
 * server renders `<html>` with the right class and the page never flashes the
 * wrong colours before hydration.
 */
export const THEME_COOKIE = "tema"

/** A year, like the borrower cookie — a preference should outlast a demo. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type Theme = "light" | "dark"

/** Anything but an explicit `dark` is light, which is what the app shipped as. */
export function parseTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light"
}
