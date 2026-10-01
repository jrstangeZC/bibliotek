import { listBooks } from "@/lib/loans";

/** Availability changes with every loan and every hold that runs out — never prerender it. */
export const dynamic = "force-dynamic";

/** Every title in the collection, each with its current availability. */
export async function GET() {
  return Response.json({ books: await listBooks() });
}
