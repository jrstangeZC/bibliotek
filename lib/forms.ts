import type { BookDraft, BookFieldError } from "@/lib/books";
import type { BorrowerDraft, BorrowerFieldError } from "@/lib/borrowers";

/**
 * The state a person's form hands back to itself between submissions — on
 * enrolment, at the desk, or on their own profile: which field was wrong, and
 * what was typed, so nothing is lost on a rejection.
 */
export type BorrowerFormState = {
  error?: BorrowerFieldError;
  values?: BorrowerDraft;
};

export const emptyBorrowerFormState: BorrowerFormState = {};

/** Same idea for the book form: the field that failed, and everything as typed. */
export type BookFormState = {
  error?: BookFieldError;
  values?: BookDraft;
};

export const emptyBookFormState: BookFormState = {};
