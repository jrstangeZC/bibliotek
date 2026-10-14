import { cp, mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { NextRequest } from "next/server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

/**
 * `GET /api/books`, where the header field's suggestions come from. Same
 * scratch-copy set-up as the db tests.
 *
 * The answer must be the same for everyone, so the handler never reads the
 * session. `cookies()` throws outside a request, so a handler that tried would
 * fail every test here.
 */

const originalCwd = process.cwd()
let scratch: string
let route: typeof import("@/app/api/books/route")

async function get(search: string) {
  const response = await route.GET(
    new NextRequest(`http://localhost/api/books${search}`)
  )
  return { status: response.status, body: await response.json() }
}

/** The ids of the titles a search answers with, in the order given. */
async function ids(q: string): Promise<string[]> {
  const { body } = await get(`?${new URLSearchParams({ q })}`)
  return body.books.map((book: { id: string }) => book.id)
}

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), "bibliotek-books-"))
  await mkdir(path.join(scratch, "data"))
  await cp(
    path.join(originalCwd, "data/seed.json"),
    path.join(scratch, "data/seed.json")
  )

  process.chdir(scratch)
  vi.resetModules()
  route = await import("@/app/api/books/route")
})

afterAll(async () => {
  process.chdir(originalCwd)
  await rm(scratch, { recursive: true, force: true })
})

describe("GET /api/books", () => {
  it("lists every title when nothing is searched for", async () => {
    const { status, body } = await get("")
    expect(status).toBe(200)
    expect(Object.keys(body)).toEqual(["books"])
    expect(body.books).toHaveLength(8)
  })

  it.each([
    ["prince", ["book-5"]],
    ["mockingbird", ["book-7"]],
    ["ring", ["book-2"]],
    ["george", ["book-3"]],
    ["orwell", ["book-3"]],
    ["exupery", ["book-5"]],
    ["jkr", ["book-1"]],
    ["J.K.R.", ["book-1"]],
    ["jrrt", ["book-2"]],
    ["go", ["book-3"]],
    ["hl", ["book-7"]],
    ["g orwell", ["book-3"]],
    ["jk rowling", ["book-1"]],
    ["xyz", []],
    ["jkx", []],
  ])("answers «%s» with %j", async (q, expected) => {
    expect(await ids(q)).toEqual(expected)
  })

  it("orders the titles as the book group on /sok does", async () => {
    expect(await ids("the")).toEqual([
      "book-1",
      "book-8",
      "book-6",
      "book-5",
      "book-2",
    ])
  })

  it("answers a search with books and nothing else", async () => {
    // Marit has two loans out, but a search is never answered with people or loans.
    expect((await get("?q=marit")).body).toEqual({ query: "marit", books: [] })
    expect(Object.keys((await get("?q=prince")).body)).toEqual([
      "query",
      "books",
    ])
  })

  it("finds nothing for a search with nothing to search for", async () => {
    expect((await get("?q=---")).body).toEqual({ query: "---", books: [] })
  })
})
