import { describe, expect, it } from "vitest";

import {
  byTitle,
  emptyBookDraft,
  MAX_COPIES,
  normalizeIsbn,
  validateBook,
  type BookDraft,
} from "@/lib/books";

const now = new Date("2026-05-01T12:00:00.000Z");

const valid: BookDraft = {
  title: "Sult",
  author: "Knut Hamsun",
  isbn: "978-82-05-39001-4",
  year: "1890",
  copies: "3",
};

function rejectedField(overrides: Partial<BookDraft>) {
  const result = validateBook({ ...valid, ...overrides }, now);
  return result.ok ? null : result.error.field;
}

describe("validateBook", () => {
  it("turns a complete draft into a book", () => {
    expect(validateBook(valid, now)).toEqual({
      ok: true,
      book: {
        title: "Sult",
        author: "Knut Hamsun",
        isbn: "978-82-05-39001-4",
        year: 1890,
        copies: 3,
      },
    });
  });

  it("rejects an empty draft at the first field", () => {
    expect(validateBook(emptyBookDraft, now)).toMatchObject({
      ok: false,
      error: { field: "title" },
    });
  });

  it("requires a title and an author", () => {
    expect(rejectedField({ title: "" })).toBe("title");
    expect(rejectedField({ author: "" })).toBe("author");
  });

  it("accepts ISBN-10 and ISBN-13, with or without separators", () => {
    expect(rejectedField({ isbn: "9788205390014" })).toBeNull();
    expect(rejectedField({ isbn: "978 82 05 39001 4" })).toBeNull();
    expect(rejectedField({ isbn: "0-306-40615-2" })).toBeNull();
    expect(rejectedField({ isbn: "080442957x" })).toBeNull();
  });

  it("rejects an ISBN of the wrong length or with letters in it", () => {
    expect(rejectedField({ isbn: "" })).toBe("isbn");
    expect(rejectedField({ isbn: "12345" })).toBe("isbn");
    expect(rejectedField({ isbn: "978-82-05-39001-X" })).toBe("isbn");
  });

  it("keeps the year between 1 and the current year", () => {
    expect(rejectedField({ year: "2026" })).toBeNull();
    expect(rejectedField({ year: "2027" })).toBe("year");
    expect(rejectedField({ year: "0" })).toBe("year");
    expect(rejectedField({ year: "-5" })).toBe("year");
    expect(rejectedField({ year: "18.9" })).toBe("year");
    expect(rejectedField({ year: "" })).toBe("year");
  });

  it("keeps copies a whole number from 1 to the ceiling", () => {
    expect(rejectedField({ copies: "1" })).toBeNull();
    expect(rejectedField({ copies: String(MAX_COPIES) })).toBeNull();
    expect(rejectedField({ copies: "0" })).toBe("copies");
    expect(rejectedField({ copies: String(MAX_COPIES + 1) })).toBe("copies");
    expect(rejectedField({ copies: "2.5" })).toBe("copies");
    expect(rejectedField({ copies: "" })).toBe("copies");
  });
});

describe("normalizeIsbn", () => {
  it("drops hyphens and spaces and upper-cases the check digit", () => {
    expect(normalizeIsbn("978-82 05-39001-4")).toBe("9788205390014");
    expect(normalizeIsbn("080442957x")).toBe("080442957X");
  });
});

describe("byTitle", () => {
  const titled = (title: string) => ({ ...valid, id: title, title, year: 1, copies: 1 });

  it("sorts the Norwegian letters after z and numbers by value", () => {
    const titles = ["Ærlig talt", "Zorro", "Aksel", "1984", "451"].map(titled);
    expect(titles.sort(byTitle).map((book) => book.title)).toEqual([
      "451",
      "1984",
      "Aksel",
      "Zorro",
      "Ærlig talt",
    ]);
  });
});
