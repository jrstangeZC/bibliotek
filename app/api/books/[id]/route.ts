import type { NextRequest } from "next/server";

import { findBook } from "@/lib/loans";

/** Availability changes with every loan and every hold that runs out — never prerender it. */
export const dynamic = "force-dynamic";

/** One title with its current availability. */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/books/[id]">
) {
  const { id } = await context.params;
  const book = await findBook(id);

  if (!book) {
    return Response.json({ error: "book-not-found" }, { status: 404 });
  }

  return Response.json({ book });
}
