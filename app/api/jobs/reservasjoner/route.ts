import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { settleAndNotify } from "@/lib/db";

/**
 * For a daily cron. Brings the reservations up to date and sends the «ready»
 * email for holds that started since the last write — chiefly a copy passed
 * on because the hold before it ran out, which nothing else stores until
 * somebody borrows or returns something.
 *
 * Guarded by `Authorization: Bearer $CRON_SECRET`. Without the secret set, the
 * route does not exist: an unguarded endpoint that writes is not something to
 * ship by accident.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "not-found" }, { status: 404 });

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const queued = await settleAndNotify(new Date());

  revalidatePath("/", "layout");

  return Response.json({ sent: queued.length });
}
