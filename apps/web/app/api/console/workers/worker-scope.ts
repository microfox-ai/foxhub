import { NextResponse } from "next/server"
import * as crypto from "crypto"
import { createClient } from "@/utils/supabase/server-client"
import { UrlMapType, type IProject } from "@/server/types"

/**
 * SECURITY — Authorize + resolve everything the "Workers" console feature needs to talk to
 * a project's deployed core worker endpoints.
 *
 * There is NO public API gateway in front of individual workers: the only way to trigger one
 * is the core group's `POST /workers/trigger` Lambda (which fans the message out to the worker's
 * SQS queue). This helper, mirroring `app/api/aws/lambda/scope.ts`:
 *   1. requires a logged-in Supabase user,
 *   2. loads the project from cicd (forwarding the user's JWT),
 *   3. resolves the caller's effective RBAC permissions, and
 *   4. derives the agent base URL (= WORKER_BASE_URL), the per-worker Lambda log group, and the
 *      worker-endpoint API key (read from the deployed env, else the projectId-derived fallback).
 *
 * The API key is resolved SERVER-SIDE only and never returned to the browser (the catalog route
 * returns just a non-sensitive `keySource` label so the UI can show where the key came from).
 */

const CICD_BASE = (
  process.env.CICD_BASE_URL ||
  process.env.NEXT_PUBLIC_CICD_BASE_URL ||
  ""
).trim()

const STAGE = (process.env.STAGE || process.env.ENVIRONMENT || "prod").toLowerCase()

export type WorkerLambda = {
  /** Worker id as declared by createWorker({ id }). */
  workerId: string
  /** Deployed Lambda function name (== CloudWatch log group suffix). */
  functionName: string
  region: string
  group: string
  arn?: string
}

export type KeySource = "env" | "derived" | "none"

type ScopeSuccess = {
  ok: true
  userId: string
  accessToken?: string
  project: IProject
  permissions: string[]
  /** Effective group scope (allow/deny/all) for the caller, when restricted. */
  groupScope?: { mode: "all" | "allow" | "deny"; values?: string[] } | null
  /** Agent base URL incl. stage, e.g. https://abc.execute-api.us-east-1.amazonaws.com/prod */
  agentBaseUrl: string | null
  /** All deployed worker Lambdas discovered in the project's urlsMap. */
  workerLambdas: WorkerLambda[]
  /** Deployed queue-starter Lambdas (one per queue), keyed by best-effort queue id. */
  queueLambdas: WorkerLambda[]
  /** The core `workers/trigger` Lambda (for its own CloudWatch logs), when discoverable. */
  triggerLambda: WorkerLambda | null
  can: (permission: string) => boolean
}

type ScopeFailure = { ok: false; response: NextResponse }

export type WorkerScopeResult = ScopeSuccess | ScopeFailure

function fail(status: number, error: string): ScopeFailure {
  return { ok: false, response: NextResponse.json({ error }, { status }) }
}

async function fetchJson<T>(url: string, accessToken?: string): Promise<T | null> {
  try {
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

/** createWorker ids are dasherized; the serverless function key is `worker{PascalCase(id)}`. */
function workerFunctionKey(workerId: string): string {
  const camel = workerId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, i) =>
      i === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("")
  return "worker" + (camel.charAt(0).toUpperCase() + camel.slice(1))
}

/** Queue-starter function key: `queue{PascalCase(queueId)}` (mirrors workerFunctionKey). */
function queueFunctionKey(queueId: string): string {
  const camel = queueId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, i) =>
      i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("")
  return "queue" + (camel.charAt(0).toUpperCase() + camel.slice(1))
}

/**
 * Reverse a deployed Lambda function name (`{service}-{stage}-{prefix}{Pascal}`) back to a
 * best-effort dash-case id. The prefix's Pascal segment always starts uppercase (toPrefixedCamel
 * capitalizes it), so `worker[A-Z]…` excludes the platform `workersConfig`/`getDocs` Lambdas.
 */
function lambdaNameToId(name: string, prefix: "worker" | "queue"): string | null {
  const m = name.match(new RegExp(`${prefix}([A-Z][A-Za-z0-9]*)$`))
  if (!m || !m[1]) return null
  return m[1]
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/^([A-Z])/, (c) => c.toLowerCase())
    .toLowerCase()
}

/** Stable zero-config worker-endpoint key (matches @microfox/ai-worker `deriveWorkersApiKey`). */
export function deriveWorkersApiKey(projectId: string): string {
  return crypto
    .createHash("sha256")
    .update("microfox-workers:" + projectId)
    .digest("hex")
}

/**
 * Fetch the project's live deployed env (per function, grouped) from cicd and merge it into a
 * single `{ KEY: value }` map (first non-empty wins). Job-store creds + worker keys are identical
 * across every function (written from one env.json), so a merged view is sufficient. Requires the
 * caller to hold `env.view`; returns `null` when forbidden/unavailable.
 */
export async function fetchProjectEnvMerged(
  projectId: string,
  accessToken: string | undefined,
): Promise<Record<string, string> | null> {
  if (!CICD_BASE) return null
  const env = await fetchJson<{
    configured: boolean
    groups: Record<string, { name: string; env: Record<string, string> }[]>
  }>(`${CICD_BASE}/api/projects/${encodeURIComponent(projectId)}/env`, accessToken)
  if (!env?.groups) return null
  const merged: Record<string, string> = {}
  for (const fns of Object.values(env.groups)) {
    for (const fn of fns) {
      for (const [k, v] of Object.entries(fn.env ?? {})) {
        if (v && v.trim() && !merged[k]) merged[k] = v
      }
    }
  }
  return merged
}

/**
 * Resolve the worker-endpoint key for a project. Tries the live deployed env first (the cicd
 * `/env` route exposes WORKERS_API_KEY / WORKERS_TRIGGER_API_KEY / WORKERS_CONFIG_API_KEY —
 * none are platform-filtered), then falls back to the projectId-derived key (zero-config path).
 * Returns `{ key: null, source: "none" }` only when the env read is unavailable AND no projectId.
 */
export async function resolveWorkersApiKey(
  projectId: string,
  accessToken: string | undefined,
  env?: Record<string, string> | null,
): Promise<{ key: string | null; source: KeySource }> {
  const merged = env !== undefined ? env : await fetchProjectEnvMerged(projectId, accessToken)
  const v =
    merged?.WORKERS_API_KEY || merged?.WORKERS_TRIGGER_API_KEY || merged?.WORKERS_CONFIG_API_KEY
  if (v && v.trim()) return { key: v.trim(), source: "env" }
  if (projectId) return { key: deriveWorkersApiKey(projectId), source: "derived" }
  return { key: null, source: "none" }
}

export type JobStoreConfig =
  | { type: "upstash-redis"; url: string; token: string; prefix: string }
  | { type: "mongodb"; uri: string; db: string; collection: string }
  | { type: "none" }

/**
 * Resolve the project's worker job store (where worker status/output live) from its deployed env —
 * the same vars `@microfox/ai-worker` reads at runtime. Mirrors the resolution order in
 * redisJobStore.ts / mongoJobStore.ts so the console reads exactly what the workers wrote.
 */
export function resolveJobStoreConfig(env: Record<string, string> | null): JobStoreConfig {
  if (!env) return { type: "none" }
  const dbType = (env.WORKER_DATABASE_TYPE || "").toLowerCase()

  const redisUrl =
    env.WORKER_UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_URL
  const redisToken =
    env.WORKER_UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_TOKEN
  const prefix =
    env.WORKER_UPSTASH_REDIS_JOBS_PREFIX ||
    env.UPSTASH_REDIS_KEY_PREFIX ||
    env.REDIS_WORKER_JOB_PREFIX ||
    "worker:jobs:"

  const mongoUri = env.MONGODB_WORKER_URI || env.DATABASE_MONGODB_URI || env.MONGODB_URI
  const mongoDb = env.MONGODB_WORKER_DB || env.MONGODB_DB || "worker"
  const mongoColl = env.MONGODB_WORKER_JOBS_COLLECTION || "worker_jobs"

  // Honor an explicit WORKER_DATABASE_TYPE; otherwise prefer whichever is configured
  // (redis is the runtime default).
  if (dbType === "mongodb" && mongoUri) {
    return { type: "mongodb", uri: mongoUri, db: mongoDb, collection: mongoColl }
  }
  if (redisUrl && redisToken) {
    return { type: "upstash-redis", url: redisUrl, token: redisToken, prefix }
  }
  if (mongoUri) {
    return { type: "mongodb", uri: mongoUri, db: mongoDb, collection: mongoColl }
  }
  return { type: "none" }
}

/**
 * Authorize the caller for the named project and resolve the worker endpoints + Lambdas.
 * `projectId` is read from the query string (GET) or the parsed body (POST).
 */
export async function resolveWorkerScope(projectId: string): Promise<WorkerScopeResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(401, "Authentication required")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const id = (projectId || "").trim()
  if (!id) return fail(400, "projectId is required")
  if (!CICD_BASE) {
    console.error("[console/workers] No CICD base URL configured")
    return fail(500, "Server is not configured for worker access")
  }

  const project = await fetchJson<IProject>(
    `${CICD_BASE}/api/projects/${encodeURIComponent(id)}`,
    accessToken,
  )
  if (!project) return fail(404, "Project not found")

  const me = await fetchJson<{
    role: string
    permissions: string[]
    scope: { groups?: { mode: "all" | "allow" | "deny"; values?: string[] } } | null
  }>(`${CICD_BASE}/api/projects/${encodeURIComponent(id)}/permissions/me`, accessToken)

  // Fallback for older cicd builds without /permissions/me: owner gets everything.
  const permissions = me?.permissions ?? (project.ownerId === user.id ? ["*"] : [])
  const groupScope = me?.scope?.groups ?? null
  const can = (permission: string) =>
    permissions.includes("*") || permissions.includes(permission)

  // Anyone able to load the project may at least view it; finer gating is per-route.
  if (!me && project.ownerId !== user.id) {
    return fail(403, "You do not have access to this project")
  }

  const inScope = (group?: string): boolean => {
    if (!groupScope || groupScope.mode === "all") return true
    const name = (group ?? "default").trim() || "default"
    const values = (groupScope.values ?? []).map((v) => v.trim() || "default")
    if (groupScope.mode === "allow") return values.includes(name)
    if (groupScope.mode === "deny") return !values.includes(name)
    return true
  }

  // Core group exposes the HTTP API (workers/trigger, workers/config). Its `agent` urlsMap
  // entry's url already includes the stage, e.g. `${baseUrl}/${stage}` — that IS WORKER_BASE_URL.
  let agentBaseUrl: string | null = null
  const prefix = `p-${id.replace(/-/g, "").slice(0, 15)}`
  const defaultRegion = process.env.AWS_REGION || "us-east-1"
  const workerLambdas = new Map<string, WorkerLambda>()
  const queueLambdas = new Map<string, WorkerLambda>()
  let triggerLambda: WorkerLambda | null = null

  for (const entry of project.urlsMap ?? []) {
    if (!inScope(entry.group)) continue
    if (
      entry.type === UrlMapType.AGENT &&
      typeof entry.url === "string" &&
      entry.url.trim() &&
      (!entry.group || entry.group === "core")
    ) {
      agentBaseUrl = entry.url.trim().replace(/\/+$/, "")
    }
    const service = entry.service
    if (!service || !("providerConfig" in service) || !service.providerConfig) continue
    for (const resource of service.providerConfig.resources ?? []) {
      if (resource.type !== "lambda" || !resource.name) continue
      // Defense in depth: only this project's functions.
      if (!resource.name.startsWith(prefix)) continue
      const group = (resource as { group?: string }).group || entry.group || "core"
      const region = resource.region || defaultRegion

      // The core `triggerWorker` Lambda (capital W → not matched by the worker regex below).
      if (/triggerworker$/i.test(resource.name)) {
        triggerLambda = { workerId: "workers/trigger", functionName: resource.name, region, group, arn: resource.arn }
        continue
      }
      // Queue-starter Lambdas: `queue{Pascal}` (uppercase after `queue`).
      const queueId = lambdaNameToId(resource.name, "queue")
      if (queueId) {
        queueLambdas.set(resource.name, { workerId: queueId, functionName: resource.name, region, group, arn: resource.arn })
        continue
      }
      // Worker Lambdas: `worker{Pascal}` (uppercase after `worker` — excludes workersConfig/getDocs).
      const workerId = lambdaNameToId(resource.name, "worker")
      if (!workerId) continue
      workerLambdas.set(resource.name, { workerId, functionName: resource.name, region, group, arn: resource.arn })
    }
  }

  return {
    ok: true,
    userId: user.id,
    accessToken,
    project,
    permissions,
    groupScope,
    agentBaseUrl,
    workerLambdas: Array.from(workerLambdas.values()),
    queueLambdas: Array.from(queueLambdas.values()),
    triggerLambda,
    can,
  }
}

/** Find the deployed Lambda function name for a worker id within an already-resolved scope. */
export function findWorkerLambda(
  scope: ScopeSuccess,
  workerId: string,
): WorkerLambda | undefined {
  const key = workerFunctionKey(workerId).toLowerCase()
  return scope.workerLambdas.find((l) =>
    l.functionName.toLowerCase().endsWith(key),
  )
}

/** Find the deployed queue-starter Lambda for a queue id within an already-resolved scope. */
export function findQueueLambda(
  scope: ScopeSuccess,
  queueId: string,
): WorkerLambda | undefined {
  const key = queueFunctionKey(queueId).toLowerCase()
  return scope.queueLambdas.find((l) => l.functionName.toLowerCase().endsWith(key))
}

export type QueueStoreConfig =
  | { type: "upstash-redis"; url: string; token: string; prefix: string }
  | { type: "mongodb"; uri: string; db: string; collection: string }
  | { type: "none" }

/**
 * Resolve the project's QUEUE job store (separate keyspace from worker jobs). Mirrors the
 * resolution in `queueJobStore.ts` — note the Mongo db defaults to `mediamake` (not `worker`) and
 * the Redis prefix is `worker:queue-jobs:`.
 */
export function resolveQueueStoreConfig(env: Record<string, string> | null): QueueStoreConfig {
  if (!env) return { type: "none" }
  const dbType = (env.WORKER_DATABASE_TYPE || "").toLowerCase()

  const redisUrl =
    env.WORKER_UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_URL
  const redisToken =
    env.WORKER_UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || env.UPSTASH_REDIS_TOKEN
  const prefix =
    env.WORKER_UPSTASH_REDIS_QUEUE_PREFIX || env.UPSTASH_REDIS_QUEUE_PREFIX || "worker:queue-jobs:"

  const mongoUri = env.DATABASE_MONGODB_URI || env.MONGODB_URI
  const mongoDb = env.DATABASE_MONGODB_DB || env.MONGODB_DB || "mediamake"
  const mongoColl = env.MONGODB_QUEUE_JOBS_COLLECTION || "queue_jobs"

  if (dbType === "mongodb" && mongoUri) {
    return { type: "mongodb", uri: mongoUri, db: mongoDb, collection: mongoColl }
  }
  if (redisUrl && redisToken) {
    return { type: "upstash-redis", url: redisUrl, token: redisToken, prefix }
  }
  if (mongoUri) {
    return { type: "mongodb", uri: mongoUri, db: mongoDb, collection: mongoColl }
  }
  return { type: "none" }
}

export { CICD_BASE, STAGE, workerFunctionKey, queueFunctionKey }
