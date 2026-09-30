import type { Book } from "@/lib/types";

/**
 * The catalogue side of the desk work: what a librarian may type into a book,
 * and what counts as a valid entry. Pure — no disk, no session — so the rules
 * can be tested on their own and the form and the action share them.
 */

export type BookField = "title" | "author" | "isbn" | "year" | "copies";

/** What was typed, field by field. Kept as text so a rejection can hand it back untouched. */
export type BookDraft = Record<BookField, string>;

export type BookInput = Omit<Book, "id">;

export type BookFieldError = { field: BookField; message: string };

export type BookValidation =
  | { ok: true; book: BookInput }
  | { ok: false; error: BookFieldError };

/** A shelf count, not a warehouse: catches a slipped key, not a real collection. */
export const MAX_COPIES = 99;

export const emptyBookDraft: BookDraft = {
  title: "",
  author: "",
  isbn: "",
  year: "",
  copies: "1",
};

export function readBookForm(formData: FormData): BookDraft {
  const read = (field: BookField) => String(formData.get(field) ?? "").trim();

  return {
    title: read("title"),
    author: read("author"),
    isbn: read("isbn"),
    year: read("year"),
    copies: read("copies"),
  };
}

/** Hyphens and spaces are formatting, not identity: `978-82-…` and `978 82 …` are one ISBN. */
export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[\s-]/g, "").toUpperCase();
}

const ISBN_PATTERN = /^(\d{9}[\dX]|\d{13})$/;

const INTEGER_PATTERN = /^\d+$/;

function reject(field: BookField, message: string): BookValidation {
  return { ok: false, error: { field, message } };
}

/**
 * Checks a draft field by field, top to bottom, and reports the first problem —
 * the same order the form reads in. Rules that depend on the rest of the
 * database (a duplicate ISBN, copies still on loan) live next to the write.
 */
export function validateBook(draft: BookDraft, now: Date = new Date()): BookValidation {
  if (draft.title === "") {
    return reject("title", "Skriv inn tittelen på boken.");
  }

  if (draft.author === "") {
    return reject("author", "Skriv inn hvem som har skrevet den.");
  }

  if (!ISBN_PATTERN.test(normalizeIsbn(draft.isbn))) {
    return reject("isbn", "Et ISBN har 10 eller 13 sifre. Bindestreker er greit.");
  }

  const lastYear = now.getUTCFullYear();
  const year = Number(draft.year);
  if (!INTEGER_PATTERN.test(draft.year) || year < 1 || year > lastYear) {
    return reject("year", `Skriv et utgivelsesår mellom 1 og ${lastYear}.`);
  }

  const copies = Number(draft.copies);
  if (!INTEGER_PATTERN.test(draft.copies) || copies < 1 || copies > MAX_COPIES) {
    return reject("copies", `Antall eksemplarer må være et helt tall fra 1 til ${MAX_COPIES}.`);
  }

  return {
    ok: true,
    book: {
      title: draft.title,
      author: draft.author,
      isbn: draft.isbn,
      year,
      copies,
    },
  };
}

export function toDraft(book: Book): BookDraft {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    year: String(book.year),
    copies: String(book.copies),
  };
}
