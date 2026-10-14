import type { NextRequest } from "next/server"

import { listBooks, searchLibrary } from "@/lib/loans"

/** Availability changes with every loan and every hold that runs out — never prerender it. */
export const dynamic = "force-dynamic"

/**
 * Every title in the collection, each with its current availability.
 *
 * With `?q=`, only the titles that answer the search, in the order of the book
 * group on `/sok`. The header field's suggestions come from here. The search
 * runs as a signed-out visitor's would, never as whoever is asking: the answer
 * is the same for everyone, and it can hold no person, loan or reservation.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")
  if (q === null) return Response.json({ books: await listBooks() })

  const { query, books } = await searchLibrary(q, null)
  return Response.json({ query, books })
}
