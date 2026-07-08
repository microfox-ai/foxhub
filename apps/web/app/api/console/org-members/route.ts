import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server-client"
import { findUserByEmail } from "@/utils/supabase/admin-users"

/**
 * Add a member to an organization by EMAIL. This is the one place that needs the Supabase
 * service-role key (which cicd doesn't have): we resolve email → userId here, then hand the
 * userId + email/name to cicd, which stores it in its own user directory. After this, every
 * read (org members, project members) is served by cicd directly — no Foxhub needed.
 */

const CICD_BASE = (
  process.env.CICD_BASE_URL ||
  process.env.NEXT_PUBLIC_CICD_BASE_URL ||
  ""
).trim()

export async function POST(req: Request) {
  if (!CICD_BASE) return NextResponse.json({ error: "CICD base URL not configured" }, { status: 500 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const body = await req.json().catch(() => ({}))
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!organizationId || !email || !email.includes("@")) {
    return NextResponse.json({ error: "organizationId and a valid email are required" }, { status: 400 })
  }

  // Resolve email → Supabase user (must already have a Microfox account).
  const identity = await findUserByEmail(email)
  if (!identity?.userId) {
    return NextResponse.json(
      { error: "No Microfox account found for that email. Ask them to sign up first." },
      { status: 404 },
    )
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  if (process.env.MICROFOX_SERVICE_KEY) headers["x-microfox-service-key"] = process.env.MICROFOX_SERVICE_KEY

  const upstream = await fetch(
    `${CICD_BASE}/api/organizations/${encodeURIComponent(organizationId)}/members`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: identity.userId, email: identity.email, name: identity.name }),
    },
  )
  const data = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    return NextResponse.json({ error: data?.error || "Failed to add member" }, { status: upstream.status })
  }
  return NextResponse.json(data)
}
