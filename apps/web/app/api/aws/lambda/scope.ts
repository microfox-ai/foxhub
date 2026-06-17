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

const CICD_BASE = (
  process.env.CICD_BASE_URL ||
  process.env.NEXT_PUBLIC_CONSOLE_API_BASE ||
  process.env.NEXT_PUBLIC_CICD_BASE_URL ||
  ""
).trim()

/** Service-name prefix for a project (matches the CLI/cicd naming convention). */
function serviceNamePrefix(projectId: string): string {
  return `p-${projectId.replace(/-/g, "").slice(0, 15)}`
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

  if (!CICD_BASE) {
    console.error("[aws/lambda/scope] No CICD base URL configured")
    return fail(500, "Server is not configured for project-scoped log access")
  }

  // 3. Load the project and verify access (owner or org member).
  const project = await fetchJson<IProject>(
    `${CICD_BASE}/api/projects/${encodeURIComponent(projectId)}`,
    accessToken
  )
  if (!project) {
    return fail(404, "Project not found")
  }

  let allowed = project.ownerId === user.id
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
  if (!allowed) {
    return fail(403, "You do not have access to this project")
  }

  // 4. Build the allowed function list from the project's urlsMap — never trust
  //    client-sent function names. Restrict to this project's service prefix.
  const prefix = serviceNamePrefix(projectId)
  const defaultRegion = process.env.AWS_REGION || "us-east-1"
  const functions = new Map<string, ScopedFunction>()
  for (const entry of project.urlsMap ?? []) {
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
