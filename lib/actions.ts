"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  BORROWER_COOKIE,
  BORROWER_COOKIE_MAX_AGE,
  getCurrentBorrower,
  homePathFor,
  isLibrarian,
  SIGNED_OUT,
} from "@/lib/auth";
import { readBookForm, validateBook } from "@/lib/books";
import {
  createBook,
  createBorrower,
  DEMO_RESET_ENABLED,
  deleteBook,
  getBorrower,
  resetDatabase,
  updateBook,
} from "@/lib/db";
import {
  bookErrorSlug,
  errorSlug,
  renewalErrorSlug,
  reservationErrorSlug,
} from "@/lib/errors";
import type { BookFormState, RegisterState } from "@/lib/forms";
import {
  borrowBook,
  cancelReservation,
  markHoldHandled,
  registerReturn,
  renewLoan,
  reserveBook,
} from "@/lib/loans";
import type { Role } from "@/lib/types";

/**
 * Every screen that shows a loan, a reservation or an availability count. The
 * layout is in it too: its banner tells a borrower when a copy is held for them.
 */
function revalidateLoanViews(bookId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/mine-laan");
  revalidatePath("/admin");
  revalidatePath("/admin/reservasjoner");
  if (bookId) revalidatePath(`/boker/${bookId}`);
}

/** Lends the book on the detail page to whoever is browsing. */
export async function borrowBookAction(formData: FormData) {
  const bookId = String(formData.get("bookId") ?? "");
  const borrower = await getCurrentBorrower();
  if (!borrower) redirect("/logg-inn");

  const result = await borrowBook(bookId, borrower.id);

  if (!result.ok) {
    redirect(`/boker/${encodeURIComponent(bookId)}?feil=${errorSlug(result.error)}`);
  }

  revalidateLoanViews(bookId);
  redirect("/mine-laan");
}

/** Takes a book back in from the administration screen. */
export async function returnLoanAction(formData: FormData) {
  const actor = await getCurrentBorrower();
  if (!actor || !isLibrarian(actor)) redirect("/logg-inn");

  const loanId = String(formData.get("loanId") ?? "");
  const result = await registerReturn(loanId);

  if (!result.ok) {
    redirect(`/admin?feil=${errorSlug(result.error)}`);
  }

  revalidateLoanViews(result.loan.bookId);
  // The copy goes on the pickup shelf, not back among the rest — say so.
  redirect(
    result.heldFor ? `/admin?holdt=${encodeURIComponent(result.heldFor.id)}` : "/admin"
  );
}

/**
 * Extends the signed-in borrower's own loan. The loan id comes from the form,
 * but whose loan it is comes from the session — `renewLoan` only finds loans
 * that belong to `borrower`, so a forged id gets "not found".
 */
export async function renewLoanAction(formData: FormData) {
  const borrower = await getCurrentBorrower();
  if (!borrower) redirect("/logg-inn");

  const result = await renewLoan(String(formData.get("loanId") ?? ""), borrower.id);

  if (!result.ok) {
    redirect(`/mine-laan?feil=${renewalErrorSlug(result.error)}`);
  }

  revalidateLoanViews(result.loan.bookId);
  redirect(`/mine-laan?forlenget=${encodeURIComponent(result.loan.id)}`);
}

/**
 * Puts whoever is browsing in the queue for the book on the detail page. The
 * rules — every copy out, not reserved already, under the limit — are checked
 * in the write, so a stale page cannot get round them.
 */
export async function reserveBookAction(formData: FormData) {
  const bookId = String(formData.get("bookId") ?? "");
  const borrower = await getCurrentBorrower();
  if (!borrower) redirect("/logg-inn");

  const result = await reserveBook(bookId, borrower.id);

  if (!result.ok) {
    redirect(
      `/boker/${encodeURIComponent(bookId)}?feil=${reservationErrorSlug(result.error)}`
    );
  }

  revalidateLoanViews(bookId);
  redirect(`/mine-laan?reservert=${encodeURIComponent(result.reservation.id)}`);
}

/**
 * Gives up the signed-in borrower's own place in a queue. As with renewals,
 * whose reservation it is comes from the session, not the form.
 */
export async function cancelOwnReservationAction(formData: FormData) {
  const borrower = await getCurrentBorrower();
  if (!borrower) redirect("/logg-inn");

  const result = await cancelReservation(
    String(formData.get("reservationId") ?? ""),
    borrower.id
  );

  if (!result.ok) {
    redirect(`/mine-laan?feil=${reservationErrorSlug(result.error)}`);
  }

  revalidateLoanViews(result.reservation.bookId);
  redirect("/mine-laan?avbestilt=1");
}

/** Cancels anyone's reservation from the desk. */
export async function cancelReservationAction(formData: FormData) {
  await requireLibrarianForAction();

  const result = await cancelReservation(String(formData.get("reservationId") ?? ""), null);

  if (!result.ok) {
    redirect(`/admin/reservasjoner?feil=${reservationErrorSlug(result.error)}`);
  }

  revalidateLoanViews(result.reservation.bookId);
  redirect("/admin/reservasjoner?avbestilt=1");
}

/** The desk confirms it has moved a copy whose hold ended uncollected. */
export async function markHoldHandledAction(formData: FormData) {
  await requireLibrarianForAction();

  const reservation = await markHoldHandled(String(formData.get("reservationId") ?? ""));

  if (!reservation) redirect("/admin/reservasjoner?feil=hold-handtert");

  revalidatePath("/admin/reservasjoner");
  redirect("/admin/reservasjoner?handtert=1");
}

/* -------------------------------------------------------------- catalogue --- */

/** Every screen that lists a title or links to its page. */
function revalidateCatalogue() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/boker");
  revalidatePath("/boker/[id]", "page");
}

/**
 * The catalogue is desk work like the rest of the administration. Checked in
 * every action, not just on the page — an action is a public endpoint whether
 * or not a page links to it.
 */
async function requireLibrarianForAction() {
  const actor = await getCurrentBorrower();
  if (!actor || !isLibrarian(actor)) redirect("/logg-inn");
}

/** Adds a title to the catalogue. */
export async function createBookAction(
  _previous: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  await requireLibrarianForAction();

  const values = readBookForm(formData);
  const checked = validateBook(values);
  if (!checked.ok) return { values, error: checked.error };

  const result = await createBook(checked.book);
  if (!result.ok) {
    return {
      values,
      error: { field: "isbn", message: "Et annet eksemplar i katalogen har allerede dette ISBN-et." },
    };
  }

  revalidateCatalogue();
  redirect(`/admin/boker?ny=${encodeURIComponent(result.book.id)}`);
}

/** Saves changes to a title. The id travels in the form, next to the fields it belongs to. */
export async function updateBookAction(
  _previous: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  await requireLibrarianForAction();

  const id = String(formData.get("id") ?? "");
  const values = readBookForm(formData);
  const checked = validateBook(values);
  if (!checked.ok) return { values, error: checked.error };

  const result = await updateBook(id, checked.book);

  if (!result.ok) {
    if (result.error === "isbn-taken") {
      return {
        values,
        error: { field: "isbn", message: "Et annet eksemplar i katalogen har allerede dette ISBN-et." },
      };
    }

    if (result.error === "copies-below-loans") {
      return {
        values,
        error: {
          field: "copies",
          message: result.held
            ? `${result.onLoan} eksemplarer er ute på lån og ${result.held} er holdt av for noen i kø. Antallet kan ikke bli lavere før de er levert tilbake eller hentet.`
            : `${result.onLoan} eksemplarer er ute på lån nå. Antallet kan ikke bli lavere før de er levert tilbake.`,
        },
      };
    }

    // What is left after the two field errors above: the title is already gone.
    redirect(`/admin/boker?feil=${bookErrorSlug("book-not-found")}`);
  }

  revalidateCatalogue();
  redirect(`/admin/boker?lagret=${encodeURIComponent(result.book.id)}`);
}

/** Removes a title. Refused while a copy is out — see `deleteBook`. */
export async function deleteBookAction(formData: FormData) {
  await requireLibrarianForAction();

  const result = await deleteBook(String(formData.get("id") ?? ""));

  if (!result.ok) {
    redirect(`/admin/boker?feil=${bookErrorSlug(result.error)}`);
  }

  revalidateCatalogue();
  revalidatePath("/mine-laan");
  redirect("/admin/boker?slettet=1");
}

/**
 * Puts the demo back to the state in `data/seed.json`. Every loan, return and
 * enrolment registered since is discarded.
 *
 * This is demo plumbing, not desk work — but it is destructive, so it sits
 * behind the same librarian check as the rest of the administration, and behind
 * {@link DEMO_RESET_ENABLED} on top of that.
 */
export async function resetDemoDataAction() {
  if (!DEMO_RESET_ENABLED) redirect("/admin/innstillinger");

  const actor = await getCurrentBorrower();
  if (!actor || !isLibrarian(actor)) redirect("/logg-inn");

  await resetDatabase();

  revalidateLoanViews();
  // Every title at once — a reset changes availability across the catalogue,
  // not just on the one book a borrow would have touched.
  revalidatePath("/boker/[id]", "page");
  revalidatePath("/admin/brukere");
  revalidatePath("/logg-inn");
  redirect("/admin/innstillinger?tilbakestilt=1");
}

/* ----------------------------------------------------------------- who am I --- */

/**
 * Becomes the chosen person. Stands in for a login: the demo has no passwords,
 * so picking a name from the register is the whole of it.
 */
export async function signInAction(formData: FormData) {
  const id = String(formData.get("borrowerId") ?? "");
  const borrower = await getBorrower(id);
  if (!borrower) redirect("/logg-inn?feil=ukjent-laaner");

  (await cookies()).set(BORROWER_COOKIE, borrower.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: BORROWER_COOKIE_MAX_AGE,
  });

  redirect(homePathFor(borrower));
}

/**
 * Marks the session as signed out. Writes a sentinel rather than deleting the
 * cookie — a deleted cookie is indistinguishable from a first visit, which the
 * seed fallback turns straight back into the first borrower.
 */
export async function signOutAction() {
  (await cookies()).set(BORROWER_COOKIE, SIGNED_OUT, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: BORROWER_COOKIE_MAX_AGE,
  });

  redirect("/logg-inn");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Enrols a new person in the register. This is desk work — a librarian signing
 * someone up — not self-service registration, so it survives the move to real
 * authentication.
 */
export async function registerBorrowerAction(
  _previous: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const actor = await getCurrentBorrower();
  if (!actor || !isLibrarian(actor)) redirect("/logg-inn");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role: Role = formData.get("role") === "librarian" ? "librarian" : "borrower";
  const values = { name, email, role };

  if (name === "") {
    return { values, error: { field: "name", message: "Skriv inn navnet på låneren." } };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return {
      values,
      error: { field: "email", message: "Skriv en gyldig e-postadresse." },
    };
  }

  const borrower = await createBorrower({ name, email, role });

  if (!borrower) {
    return {
      values,
      error: {
        field: "email",
        message: "Adressen er allerede i bruk av en annen låner.",
      },
    };
  }

  revalidatePath("/admin/brukere");
  revalidatePath("/logg-inn");
  redirect(`/admin/brukere?ny=${encodeURIComponent(borrower.id)}`);
}
