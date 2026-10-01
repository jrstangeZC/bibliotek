import { describe, expect, it } from "vitest";

import {
  countActiveLoans,
  countAvailableCopies,
  isBookAvailable,
} from "@/lib/availability";
import type { Book, Loan } from "@/lib/types";

function book(copies: number, id = "book-1"): Book {
  return {
    id,
    title: "Sult",
    author: "Knut Hamsun",
    isbn: "978-82-05-39001-4",
    year: 1890,
    copies,
  };
}

let counter = 0;

function loan(bookId: string, returnedAt: string | null = null): Loan {
  counter += 1;
  return {
    id: `loan-${counter}`,
    bookId,
    borrowerId: "borrower-1",
    borrowedAt: "2026-02-01T12:00:00.000Z",
    dueAt: "2026-03-01T12:00:00.000Z",
    returnedAt,
    renewedAt: null,
  };
}

describe("countActiveLoans", () => {
  it("counts only loans that have not been returned", () => {
    const loans = [
      loan("book-1"),
      loan("book-1", "2026-02-10T12:00:00.000Z"),
      loan("book-1"),
    ];

    expect(countActiveLoans(loans, "book-1")).toBe(2);
  });

  it("ignores loans on other titles", () => {
    expect(countActiveLoans([loan("book-2"), loan("book-3")], "book-1")).toBe(0);
  });
});

describe("countAvailableCopies", () => {
  it("is the full stock when nothing is out", () => {
    expect(countAvailableCopies(book(4), [])).toBe(4);
  });

  it("subtracts every active loan", () => {
    const loans = [loan("book-1"), loan("book-1")];
    expect(countAvailableCopies(book(4), loans)).toBe(2);
  });

  it("gives a copy back when a loan is returned", () => {
    const loans = [loan("book-1"), loan("book-1", "2026-02-10T12:00:00.000Z")];
    expect(countAvailableCopies(book(2), loans)).toBe(1);
  });

  it("is zero when every copy is out", () => {
    expect(countAvailableCopies(book(1), [loan("book-1")])).toBe(0);
  });

  it("never goes negative if more loans than copies were registered", () => {
    const loans = [loan("book-1"), loan("book-1"), loan("book-1")];
    expect(countAvailableCopies(book(1), loans)).toBe(0);
  });

  it("is not affected by loans on other titles", () => {
    expect(countAvailableCopies(book(2), [loan("book-2")])).toBe(2);
  });
});

describe("isBookAvailable", () => {
  it("is true while a copy is on the shelf", () => {
    expect(isBookAvailable(book(2), [loan("book-1")])).toBe(true);
  });

  it("is false once the last copy is lent out", () => {
    expect(isBookAvailable(book(1), [loan("book-1")])).toBe(false);
  });

  it("is false for a title with no copies at all", () => {
    expect(isBookAvailable(book(0), [])).toBe(false);
  });
});
