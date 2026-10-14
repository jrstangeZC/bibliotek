import type { NextRequest } from "next/server";

import { getCurrentBorrower, isLibrarian } from "@/lib/auth";
import { registerReturn } from "@/lib/loans";
import { revalidateLoanViews } from "@/lib/revalidate";
import type { LoanError } from "@/lib/types";

const status: Record<LoanError, number> = {
  "book-not-found": 404,
  "no-copies-available": 409,
  "loan-not-found": 404,
  "already-returned": 409,
};

/** Takes a book back into the collection. Desk work, so librarians only. */
export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/loans/[id]/return">
) {
  const actor = await getCurrentBorrower();
  if (!actor) {
    return Response.json({ error: "signed-out" }, { status: 401 });
  }
  if (!isLibrarian(actor)) {
    return Response.json({ error: "librarian-only" }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await registerReturn(id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: status[result.error] });
  }

  revalidateLoanViews(result.loan.bookId);

  return Response.json({ loan: result.loan });
}
