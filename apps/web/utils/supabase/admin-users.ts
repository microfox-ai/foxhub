import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase admin helpers for resolving user identities. cicd does NOT hold the
 * service-role key, so all userId↔email resolution for the console's member/sharing UI runs
 * here in Foxhub (which has `SUPABASE_SERVICE_ROLE_KEY`).
 */

export type UserIdentity = { userId: string; email?: string; name?: string }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Admin client (service role). Returns null when the env isn't configured. */
function adminClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("[admin-users] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured")
    return null
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function toIdentity(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): UserIdentity {
  return {
    userId: u.id,
    email: u.email ?? undefined,
    name: (u.user_metadata?.name as string | undefined) ?? undefined,
  }
}

/** Resolve a set of user ids → identities. Unknown / unresolved ids are omitted. */
export async function resolveUsersByIds(userIds: string[]): Promise<Record<string, UserIdentity>> {
  const out: Record<string, UserIdentity> = {}
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  const supabase = adminClient()
  if (!supabase || ids.length === 0) return out
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(id)
        if (!error && data?.user) out[id] = toIdentity(data.user)
      } catch {
        /* skip individual failures */
      }
    }),
  )
  return out
}

/**
 * Resolve an email → identity by paging the admin user list and matching locally
 * (GoTrue has no server-side email filter). Capped to avoid runaway scans.
 */
export async function findUserByEmail(email: string): Promise<UserIdentity | null> {
  const target = email?.trim().toLowerCase()
  const supabase = adminClient()
  if (!supabase || !target) return null
  const perPage = 1000
  const maxPages = 10 // up to 10k users scanned
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error || !data) return null
    const match = data.users.find((u) => u.email?.toLowerCase() === target)
    if (match) return toIdentity(match)
    if (data.users.length < perPage) break
  }
  return null
}
