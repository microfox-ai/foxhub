"use server";

import { createClient } from "@/utils/supabase/server-client";

const CICD_BASE = (
  process.env.CICD_BASE_URL ||
  process.env.NEXT_PUBLIC_CICD_BASE_URL ||
  ""
).trim();

/**
 * SEC-2 / Plan A — approve a pending CLI device-authorization request.
 *
 * Runs server-side as the logged-in user: forwards the user's Supabase access token to
 * cicd `/api/auth/cli/approve`, which verifies it and marks the device session approved.
 */
export async function approveCliAuth(
  userCode: string
): Promise<{ ok: boolean; error?: string }> {
  const code = (userCode || "").trim();
  if (!code) return { ok: false, error: "Missing code" };

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { ok: false, error: "You are not signed in" };

  if (!CICD_BASE) {
    return { ok: false, error: "Console API base is not configured" };
  }

  try {
    const res = await fetch(`${CICD_BASE}/api/auth/cli/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userCode: code }),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data?.error || `Approval failed (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
