import { NextRequest, NextResponse } from "next/server"
import {
  resolveWorkerScope,
  resolveWorkersApiKey,
  findWorkerLambda,
  type KeySource,
} from "../worker-scope"

/**
 * GET /api/console/workers/catalog?projectId=...
 *
 * Returns the deployable worker catalog for the console "Workers" feature:
 *   - the list of workers with their JSON-Schema input shapes (from the core
 *     `/workers/config` Lambda, authenticated with the resolved worker-endpoint key),
 *   - the agent base URL the trigger calls go through (there is no per-worker gateway),
 *   - a non-sensitive `keySource` so the UI can tell the user whether the key was
 *     auto-resolved (env/derived) or must be supplied manually.
 *
 * The API key itself never leaves the server.
 */

export type WorkerCatalogEntry = {
  workerId: string
  group: string
  /** JSON Schema for the worker's input (zod → JSON Schema at build time), if available. */
  inputSchema?: Record<string, unknown>
  /** Deployed Lambda function name (for log correlation), if discoverable. */
  functionName?: string
  /** True when this worker was discovered from the project's deployed Lambdas. */
  deployed: boolean
}

export type QueueCatalogStep = {
  workerId: string
  delaySeconds?: number
  requiresApproval?: boolean
  hitlTitle?: string
  hitlInputSchema?: Record<string, unknown>
}

export type WorkerCatalogResponse = {
  agentConfigured: boolean
  keySource: KeySource
  /** True when the live /workers/config call succeeded (schemas are present). */
  configReachable: boolean
  workers: WorkerCatalogEntry[]
  queues: { id: string; steps?: QueueCatalogStep[]; schedule?: unknown }[]
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || ""
  const scope = await resolveWorkerScope(projectId)
  if (!scope.ok) return scope.response

  // Prefer the dedicated worker permission; fall back to deployment/observability view so
  // members configured before workers.* existed aren't locked out.
  if (
    !scope.can("workers.view") &&
    !scope.can("deployment.view") &&
    !scope.can("observability.view")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to view workers for this project" },
      { status: 403 },
    )
  }

  const { key, source } = await resolveWorkersApiKey(projectId, scope.accessToken)

  // Pull live worker config (ids + JSON schemas + queues) from the core Lambda.
  const schemas: Record<string, Record<string, unknown>> = {}
  const configWorkerGroups: Record<string, string> = {}
  let queues: WorkerCatalogResponse["queues"] = []
  let configReachable = false

  if (scope.agentBaseUrl) {
    try {
      const headers: Record<string, string> = {}
      if (key) headers["x-workers-config-key"] = key
      const res = await fetch(`${scope.agentBaseUrl}/workers/config`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      if (res.ok) {
        const data = (await res.json()) as {
          workers?: Record<string, { group?: string }>
          schemas?: Record<string, Record<string, unknown>>
          queues?: WorkerCatalogResponse["queues"]
        }
        configReachable = true
        for (const [id, s] of Object.entries(data.schemas ?? {})) schemas[id] = s
        for (const [id, w] of Object.entries(data.workers ?? {})) {
          configWorkerGroups[id] = w.group || "default"
        }
        queues = Array.isArray(data.queues) ? data.queues : []
      }
    } catch {
      // Fall back to the urlsMap-derived worker list below.
    }
  }

  // Merge the two sources: prefer worker ids from /workers/config (authoritative + schemas),
  // and fold in any deployed Lambdas discovered in the project's urlsMap (so we still show a
  // catalog even when the config call is unreachable or the key is wrong).
  const byId = new Map<string, WorkerCatalogEntry>()
  for (const id of Object.keys({ ...schemas, ...configWorkerGroups })) {
    const lambda = findWorkerLambda(scope, id)
    byId.set(id, {
      workerId: id,
      group: configWorkerGroups[id] || lambda?.group || "default",
      inputSchema: schemas[id],
      functionName: lambda?.functionName,
      deployed: !!lambda,
    })
  }
  for (const lambda of scope.workerLambdas) {
    if (byId.has(lambda.workerId)) continue
    byId.set(lambda.workerId, {
      workerId: lambda.workerId,
      group: lambda.group,
      functionName: lambda.functionName,
      deployed: true,
    })
  }

  const workers = Array.from(byId.values()).sort((a, b) =>
    a.group !== b.group
      ? a.group.localeCompare(b.group)
      : a.workerId.localeCompare(b.workerId),
  )

  const body: WorkerCatalogResponse = {
    agentConfigured: !!scope.agentBaseUrl,
    keySource: scope.agentBaseUrl ? source : "none",
    configReachable,
    workers,
    queues,
  }
  return NextResponse.json(body)
}
