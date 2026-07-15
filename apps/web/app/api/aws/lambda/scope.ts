import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server-client"
import type { IProject, IOrganization } from "@/server/types"

/**
 * SECURITY — Authorize + scope access to Lambda observability.
 *
 * These routes call CloudWatch with the platform's AWS credentials, so they MUST NOT
 * accept arbitrary client-supplied function names (that would let anyone read any
 * Lambda's logs/metrics in the platform account). This helper:
 *   1. requires a logged-in Supabase user,
 *   2. requires a `projectId` in the request body,
 *   3. verifies the user owns the project (or is a member of its organization), and
 *   4. resolves the allowed function list **server-side** from the project's `urlsMap`,
 *      restricted to the project's `p-{projectId}` service-name prefix.
 *
 * Callers must use the returned `functions` and ignore any client-sent function names.
 */

export type ScopedFunction = {
  name: string
  region: string
  arn?: string
  /** Deployment group (from the urlsMap entry/resource), for usage aggregation. */
  group?: string
}

type ScopeSuccess = {
  ok: true
  userId: string
  projectId: string
  functions: ScopedFunction[]
}

type ScopeFailure = {
  ok: false
  response: NextResponse
}

export type ScopeResult = ScopeSuccess | ScopeFailure

/** Runs `fn` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!)
    }
  })
  await Promise.all(workers)
  return results
}

const THROTTLE_ERROR_NAMES = new Set([
  "ThrottlingException",
  "TooManyRequestsException",
])

/** Retries an AWS SDK call with exponential backoff when it's throttled. */
export async function withAwsRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (error) {
      attempt++
      const name = (error as { name?: string })?.name
      const isThrottle = !!name && THROTTLE_ERROR_NAMES.has(name)
      if (!isThrottle || attempt >= maxAttempts) throw error
      const backoffMs = 250 * 2 ** (attempt - 1) + Math.random() * 100
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }
}

const CICD_BASE = (
  process.env.CICD_BASE_URL ||
  process.env.NEXT_PUBLIC_CICD_BASE_URL ||
  ""
).trim()

/** Service-name prefix for a project (matches the CLI/cicd naming convention). */
function serviceNamePrefix(projectId: string): string {
  return `p-${projectId.replace(/-/g, "").slice(0, 15)}`
}

/** Normalize a possibly-absent stage to its slot ('prod' for missing/blank) — mirrors
 * the console's `normalizeStage` and cicd's urlsMap stage slotting. */
function normalizeStage(stage?: string | null): string {
  return (stage || "").trim().toLowerCase() || "prod"
}

function fail(status: number, error: string): ScopeFailure {
  return { ok: false, response: NextResponse.json({ error }, { status }) }
}

async function fetchJson<T>(url: string, accessToken?: string): Promise<T | null> {
  try {
    // Forward the user's Supabase JWT + service key so these reads keep working once
    // cicd enforces auth (CICD_AUTH_ENFORCE). Harmless while cicd is in warn-only mode.
    const headers: Record<string, string> = {}
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
    if (process.env.MICROFOX_SERVICE_KEY) {
      headers["x-microfox-service-key"] = process.env.MICROFOX_SERVICE_KEY
    }
    const res = await fetch(url, { cache: "no-store", headers })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Resolves the set of Lambda functions the authenticated caller may observe for the
 * project named in the request body. Returns a typed failure (with a ready
 * NextResponse) when the request is unauthorized or invalid.
 */
export async function resolveProjectLambdaScope(
  body: unknown
): Promise<ScopeResult> {
  // 1. Require an authenticated user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return fail(401, "Authentication required")
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  // 2. Require a projectId.
  const projectId =
    body && typeof body === "object" && typeof (body as { projectId?: unknown }).projectId === "string"
      ? ((body as { projectId: string }).projectId).trim()
      : ""
  if (!projectId) {
    return fail(400, "projectId is required")
  }

  // Optional stage scope: when provided, only functions deployed to that stage are
  // resolved (urlsMap rows without a stage read as 'prod'). Absent = all stages (legacy).
  const stageFilter =
    body && typeof body === "object" && typeof (body as { stage?: unknown }).stage === "string"
      ? normalizeStage((body as { stage: string }).stage)
      : null

  if (!CICD_BASE) {
    console.error("[aws/lambda/scope] No CICD base URL configured")
    return fail(500, "Server is not configured for project-scoped log access")
  }

  // 3. Load the project and verify access.
  const project = await fetchJson<IProject>(
    `${CICD_BASE}/api/projects/${encodeURIComponent(projectId)}`,
    accessToken
  )
  if (!project) {
    return fail(404, "Project not found")
  }

  // Resolve the caller's effective permissions + group scope from cicd (single source of
  // truth for the RBAC model). Requires the `observability.view` permission. Owners, org
  // members and admins receive every permission; a scoped member only sees their groups.
  const me = await fetchJson<{
    role: string
    permissions: string[]
    scope: { groups?: { mode: "all" | "allow" | "deny"; values?: string[] } } | null
  }>(`${CICD_BASE}/api/projects/${encodeURIComponent(projectId)}/permissions/me`, accessToken)

  let allowed = !!me && Array.isArray(me.permissions) && me.permissions.includes("observability.view")
  const groupScope = me?.scope?.groups

  // Fallback for older cicd builds without /permissions/me: owner or org member.
  if (!me) {
    allowed = project.ownerId === user.id
    if (!allowed && project.organizationId) {
      const org = await fetchJson<IOrganization>(
        `${CICD_BASE}/api/organizations/${encodeURIComponent(project.organizationId)}`,
        accessToken
      )
      allowed =
        !!org &&
        (org.ownerId === user.id ||
          (Array.isArray(org.members) && org.members.includes(user.id)))
    }
  }
  if (!allowed) {
    return fail(403, "You do not have permission to view observability for this project")
  }

  // 4. Build the allowed function list from the project's urlsMap — never trust
  //    client-sent function names. Restrict to this project's service prefix, and to
  //    the deployment groups within the caller's scope.
  const inScope = (group?: string): boolean => {
    if (!groupScope || groupScope.mode === "all") return true
    const name = (group ?? "default").trim() || "default"
    const values = (groupScope.values ?? []).map((v) => v.trim() || "default")
    if (groupScope.mode === "allow") return values.includes(name)
    if (groupScope.mode === "deny") return !values.includes(name)
    return true
  }

  const prefix = serviceNamePrefix(projectId)
  const defaultRegion = process.env.AWS_REGION || "us-east-1"
  const functions = new Map<string, ScopedFunction>()
  for (const entry of project.urlsMap ?? []) {
    if (!inScope(entry.group)) continue
    // Stage scope: skip rows that don't belong to the requested stage.
    if (stageFilter && normalizeStage(entry.stage) !== stageFilter) continue
    const service = entry.service
    if (!service || !("providerConfig" in service) || !service.providerConfig) {
      continue
    }
    for (const resource of service.providerConfig.resources ?? []) {
      if (resource.type !== "lambda" || !resource.name) continue
      // Defense in depth: only functions under this project's service prefix.
      if (!resource.name.startsWith(prefix)) continue
      functions.set(resource.name, {
        name: resource.name,
        region: resource.region || defaultRegion,
        arn: resource.arn,
        group: (resource as { group?: string }).group || entry.group || "default",
      })
    }
  }

  return {
    ok: true,
    userId: user.id,
    projectId,
    functions: Array.from(functions.values()),
  }
}
