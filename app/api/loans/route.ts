import type { NextRequest } from "next/server";

import { getCurrentBorrower } from "@/lib/auth";
import { borrowBook } from "@/lib/loans";
import { revalidateLoanViews } from "@/lib/revalidate";
import type { LoanError } from "@/lib/types";

const status: Record<LoanError, number> = {
  "book-not-found": 404,
  "no-copies-available": 409,
  "loan-not-found": 404,
  "already-returned": 409,
};

/** Lends a book to the current borrower. Body: `{ "bookId": "book-1" }`. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }

  const bookId = (body as { bookId?: unknown })?.bookId;
  if (typeof bookId !== "string" || bookId === "") {
    return Response.json({ error: "missing-book-id" }, { status: 400 });
  }

  const borrower = await getCurrentBorrower();
  if (!borrower) {
    return Response.json({ error: "signed-out" }, { status: 401 });
  }

  const result = await borrowBook(bookId, borrower.id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: status[result.error] });
  }

  revalidateLoanViews(bookId);

  return Response.json({ loan: result.loan }, { status: 201 });
}
