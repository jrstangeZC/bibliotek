import type { Borrower } from "@/lib/types";

/**
 * What may be typed into a person's entry, and what counts as valid. Pure — no
 * disk, no session — so enrolment, the desk's edit and a borrower's own profile
 * share one set of rules.
 */

export type BorrowerDraft = Omit<Borrower, "id">;

export type BorrowerField = "name" | "email" | "role";

export type BorrowerFieldError = { field: BorrowerField; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A new person gets email when a reserved copy is ready, unless they opt out. */
export const emptyBorrowerDraft: BorrowerDraft = {
  name: "",
  email: "",
  role: "borrower",
  notifyByEmail: true,
};

/**
 * Reads the form. An unticked checkbox sends nothing, so the field's absence
 * is what "no" looks like. The role falls back to plain borrower — a form that
 * does not offer the choice must pass the person's current role instead.
 */
export function readBorrowerForm(formData: FormData): BorrowerDraft {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    role: formData.get("role") === "librarian" ? "librarian" : "borrower",
    notifyByEmail: formData.has("notifyByEmail"),
  };
}

export function validateBorrower(draft: BorrowerDraft): BorrowerFieldError | null {
  if (draft.name === "") return { field: "name", message: "Skriv inn navnet." };
  if (!EMAIL_PATTERN.test(draft.email)) {
    return { field: "email", message: "Skriv en gyldig e-postadresse." };
  }
  return null;
}

export function toBorrowerDraft({ name, email, role, notifyByEmail }: Borrower): BorrowerDraft {
  return { name, email, role, notifyByEmail };
}

export const EMAIL_TAKEN_MESSAGE = "Adressen er allerede i bruk av en annen bruker.";
