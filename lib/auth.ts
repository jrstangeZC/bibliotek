import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getBorrower, getBorrowers } from "@/lib/db";
import type { Borrower } from "@/lib/types";

/**
 * There is no real authentication. The current person is whoever the
 * `borrowerId` cookie points at.
 *
 * This is the one seam the whole app reads its user through: swapping in real
 * auth later means rewriting this file and nothing else.
 */
export const BORROWER_COOKIE = "borrowerId";

/**
 * Written to the cookie by an explicit log out. It is deliberately not the same
 * as *no cookie at all*: a first-time visitor with no cookie still falls back to
 * the seed's first borrower, so the demo opens on something that works, while
 * someone who actually pressed "Logg ut" stays logged out.
 */
export const SIGNED_OUT = "none";

/** A year — long enough that a demo never gets logged out mid-walkthrough. */
export const BORROWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * `null` means signed out. See {@link SIGNED_OUT} for why that beats "no cookie".
 *
 * Cached per request: the layout, the metadata and the page all ask, and each
 * answer would otherwise be another read waiting in the database queue.
 */
export const getCurrentBorrower = cache(async (): Promise<Borrower | null> => {
  const value = (await cookies()).get(BORROWER_COOKIE)?.value;

  if (value === SIGNED_OUT) return null;

  if (value) {
    const borrower = await getBorrower(value);
    if (borrower) return borrower;
  }

  const [first] = await getBorrowers();
  if (!first) throw new Error("Ingen lånere er registrert i datagrunnlaget.");

  return first;
});

/** For screens that need a person: sends you to the login screen when you aren't one. */
export async function requireBorrower(): Promise<Borrower> {
  const borrower = await getCurrentBorrower();
  if (!borrower) redirect("/logg-inn");

  return borrower;
}

/** Desk work — the loan administration — is for librarians only. */
export function isLibrarian(borrower: Borrower): boolean {
  return borrower.role === "librarian";
}

/** Where a person lands after signing in: their own half of the app. */
export function homePathFor(borrower: Borrower): string {
  return isLibrarian(borrower) ? "/admin" : "/mine-laan";
}
