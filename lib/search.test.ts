import { describe, expect, it } from "vitest";

import {
  fold,
  matchesBookQuery,
  matchesQuery,
  parseQuery,
  searchBooks,
  type ParsedQuery,
} from "@/lib/search";

const prince = {
  id: "book-5",
  title: "The Little Prince",
  author: "Antoine de Saint-Exupéry",
  isbn: "978-0-15-601219-5",
  year: 1943,
  copies: 1,
};

const rings = {
  id: "book-2",
  title: "The Lord of the Rings",
  author: "J.R.R. Tolkien",
  isbn: "978-0-618-64015-7",
  year: 1954,
  copies: 2,
};

const nineteenEightyFour = {
  id: "book-3",
  title: "1984",
  author: "George Orwell",
  isbn: "978-0-452-28423-4",
  year: 1949,
  copies: 3,
};

function parsed(q: string): ParsedQuery {
  const query = parseQuery(q);
  if (!query) throw new Error(`expected «${q}» to be a search`);
  return query;
}

describe("fold", () => {
  it("spells the Norwegian letters the way a foreign keyboard would", () => {
    expect(fold("Sæther")).toBe("saether");
    expect(fold("Bjørnson")).toBe("bjornson");
    expect(fold("Håkon")).toBe("hakon");
    expect(fold("Haakon")).toBe("hakon");
  });

  it("drops case, accents and punctuation", () => {
    expect(fold("J.K.")).toBe("jk");
    expect(fold("Saint-Exupéry")).toBe("saintexupery");
    expect(fold("Philosopher's")).toBe("philosophers");
    expect(fold("marit.hoel@example.no")).toBe("marithoelexampleno");
  });
});

describe("parseQuery", () => {
  it("reads nothing to search for as null", () => {
    expect(parseQuery(undefined)).toBeNull();
    expect(parseQuery("")).toBeNull();
    expect(parseQuery("   ")).toBeNull();
    expect(parseQuery("---")).toBeNull();
    expect(parseQuery(["a", "b"])).toBeNull();
  });

  it("keeps the search as typed beside its folded words", () => {
    expect(parseQuery("  J.K. Rowling ")).toEqual({
      query: "J.K. Rowling",
      terms: ["jk", "rowling"],
      isbnFragment: null,
      completeIsbn: null,
    });
  });

  it("reads digits, spaces and hyphens as one ISBN fragment", () => {
    expect(parsed("978 0 618 64015 7")).toMatchObject({
      isbnFragment: "9780618640157",
      completeIsbn: "9780618640157",
    });
    expect(parsed("0-618-64015-x")).toMatchObject({ completeIsbn: "061864015X" });
    expect(parsed("0-15-601")).toMatchObject({ isbnFragment: "015601", completeIsbn: null });
  });

  it("does not take a short number or a title for an ISBN", () => {
    expect(parsed("12").isbnFragment).toBeNull();
    expect(parsed("1984")).toMatchObject({ isbnFragment: "1984", completeIsbn: null });
    expect(parsed("tolkien 1954").isbnFragment).toBeNull();
  });
});

describe("matchesQuery", () => {
  const record = {
    text: ["The Lord of the Rings", "J.R.R. Tolkien", "1954", "Marit Hoel", "marit.hoel@example.no"],
    isbn: "978-0-618-64015-7",
  };

  it("needs every word on the same record, in any field and any order", () => {
    expect(matchesQuery(parsed("marit tolkien"), record)).toBe(true);
    expect(matchesQuery(parsed("tolkien marit"), record)).toBe(true);
    expect(matchesQuery(parsed("marit orwell"), record)).toBe(false);
  });

  it("matches part of a word", () => {
    expect(matchesQuery(parsed("ling"), { text: ["J.K. Rowling"] })).toBe(true);
  });

  it("finds an email by its folded spelling", () => {
    const ingrid = { text: ["Ingrid Sæther", "ingrid.sather@example.no"] };
    expect(matchesQuery(parsed("saether"), ingrid)).toBe(true);
    expect(matchesQuery(parsed("sather"), ingrid)).toBe(true);
  });

  it("leaves the ISBN out of a record that has none", () => {
    expect(matchesQuery(parsed("978"), { text: ["Marit Hoel"] })).toBe(false);
  });
});

describe("matchesBookQuery", () => {
  it("matches everything when the query is blank", () => {
    expect(matchesBookQuery(prince, "   ")).toBe(true);
  });

  it("ignores case and accents", () => {
    expect(matchesBookQuery(prince, "little")).toBe(true);
    expect(matchesBookQuery(prince, "EXUPERY")).toBe(true);
  });

  it("needs every word to match somewhere", () => {
    expect(matchesBookQuery(prince, "prince 1943")).toBe(true);
    expect(matchesBookQuery(prince, "prince 1944")).toBe(false);
  });

  it("reads initials with or without their dots", () => {
    expect(matchesBookQuery(rings, "jrr tolkien")).toBe(true);
    expect(matchesBookQuery(rings, "J.R.R.")).toBe(true);
  });

  it("finds an ISBN however it is hyphenated or spaced", () => {
    expect(matchesBookQuery(prince, "9780156012195")).toBe(true);
    expect(matchesBookQuery(prince, "0-15-601")).toBe(true);
    expect(matchesBookQuery(rings, "978 0 618 64015 7")).toBe(true);
  });

  it("finds a book stored as ISBN-13 by its ISBN-10, check digit aside", () => {
    expect(matchesBookQuery(rings, "0-618-64015-0")).toBe(true);
    expect(matchesBookQuery(rings, "0618640150")).toBe(true);
    expect(matchesBookQuery(prince, "0-618-64015-0")).toBe(false);
  });

  it("finds a book stored as ISBN-10 by its ISBN-13", () => {
    const old = { ...rings, isbn: "0-618-64015-0" };
    expect(matchesBookQuery(old, "978-0-618-64015-7")).toBe(true);
  });

  it("needs three digits before a word is tried against the ISBN", () => {
    expect(matchesBookQuery(prince, "601")).toBe(true);
    expect(matchesBookQuery(prince, "97")).toBe(false);
    expect(matchesBookQuery(prince, "prince 601")).toBe(true);
  });

  it("finds the title «1984» without reading it as a complete ISBN", () => {
    expect(matchesBookQuery(nineteenEightyFour, "1984")).toBe(true);
    expect(parsed("1984").completeIsbn).toBeNull();
  });
});

describe("searchBooks", () => {
  const books = [prince, rings, nineteenEightyFour];

  it("narrows the list and hands back the search as typed", () => {
    expect(searchBooks(books, " tolkien ")).toEqual({ query: "tolkien", matches: [rings] });
  });

  it("leaves the list whole when nothing was searched for", () => {
    expect(searchBooks(books, undefined)).toEqual({ query: "", matches: books });
    expect(searchBooks(books, ["a", "b"])).toEqual({ query: "", matches: books });
    expect(searchBooks(books, "---")).toEqual({ query: "", matches: books });
  });
});
