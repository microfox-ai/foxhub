import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthorizedCron } from "../auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Free-plan Supabase projects pause after a week of low activity. Each deployment pings its
 * own project: a real table read through Prisma, plus one call to the Supabase HTTP API.
 */
export async function GET(req: NextRequest) {
  const unauthorized = rejectUnauthorizedCron(req);
  if (unauthorized) return unauthorized;

  const [database, api] = await Promise.allSettled([
    prisma.user.findFirst({ select: { id: true } }),
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      cache: "no-store",
    }).then((res) => {
      if (!res.ok) throw new Error(`Supabase API responded ${res.status}`);
    }),
  ]);

  const results = {
    database: database.status === "fulfilled" ? "ok" : String(database.reason),
    api: api.status === "fulfilled" ? "ok" : String(api.reason),
  };
  const healthy = database.status === "fulfilled" && api.status === "fulfilled";
  if (!healthy) console.error("Supabase keepalive failed", results);

  return NextResponse.json(results, { status: healthy ? 200 : 500 });
}
