import { revalidatePath } from "next/cache"

/**
 * Which cached screens a write makes stale. Shared by the server actions and
 * the JSON route handlers, so a write refreshes the same screens whichever way
 * it comes in.
 */

/**
 * Every screen that shows a loan, a reservation or an availability count. The
 * layout is in it too: its banner tells a borrower when a copy is held for them.
 */
export function revalidateLoanViews(bookId?: string) {
  revalidatePath("/", "layout")
  revalidatePath("/mine-laan")
  revalidatePath("/admin")
  revalidatePath("/admin/reservasjoner")
  if (bookId) revalidatePath(`/boker/${bookId}`)
}

/** Every screen that lists a title or links to its page. */
export function revalidateCatalogue() {
  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/admin/boker")
  revalidatePath("/boker/[id]", "page")
  revalidatePath("/sok")
}

/** Every screen that lists people: the register, the login picker and search. */
export function revalidateRegister() {
  revalidatePath("/admin/brukere")
  revalidatePath("/logg-inn")
  revalidatePath("/sok")
}

/**
 * Every screen there is. For a change that shows up everywhere — a person's
 * name, the theme, a reset of the whole demo.
 */
export function revalidateEverything() {
  revalidatePath("/", "layout")
}
