import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` once CRON_SECRET is set.
 * On Vercel the secret is mandatory. Elsewhere (apps/cron on the droplet) it is enforced
 * as soon as it is configured, so the droplet keeps working until CRON_SECRET is rolled out.
 * Returns the 401 response to send, or null when the request may proceed.
 */
export function rejectUnauthorizedCron(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (!process.env.VERCEL) return null;
    console.error("CRON_SECRET is not set, refusing cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
