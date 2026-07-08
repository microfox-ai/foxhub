import { Redis } from "@upstash/redis"
import { MongoClient } from "mongodb"
import type { JobStoreConfig } from "./worker-scope"

/**
 * Read-only access to a project's worker job store (Upstash Redis or MongoDB). The worker Lambdas
 * write job status/output here at runtime (`@microfox/ai-worker`); the console reads the same store
 * to surface the *final output* of a trigger — not just the trigger Lambda's "queued" ack — and to
 * walk the `dispatchWorker` child-job tree (a worker that dispatches other workers records them in
 * `internalJobs` / the `:internal` list).
 *
 * Schemas mirrored from redisJobStore.ts / mongoJobStore.ts:
 *   Redis : hash `${prefix}${jobId}`  + list `${prefix}${jobId}:internal` (JSON {jobId,workerId})
 *   Mongo : collection doc `_id = jobId` with an `internalJobs: [{jobId,workerId}]` array
 */

export type JobStatus = "queued" | "running" | "completed" | "failed" | "unknown"

export interface JobRecord {
  jobId: string
  workerId: string
  status: JobStatus
  input?: unknown
  output?: unknown
  error?: unknown
  metadata?: Record<string, unknown>
  internalJobs?: InternalRef[]
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

type InternalRef = { jobId: string; workerId: string; awaited?: boolean; delaySeconds?: number }

export interface JobNode extends Omit<JobRecord, "internalJobs"> {
  found: boolean
  /** Whether the parent awaited this child (true) or fired it forget (false); undefined for root. */
  awaited?: boolean
  delaySeconds?: number
  /** Queue HITL: this step is parked waiting for a human approve/reject decision. */
  awaitingApproval?: boolean
  /** Queue HITL: ISO time the step PARKED for approval (`__hitlPending.createdAt`) — the start of
   * the human-wait window, used to show HITL wait time on the timeline. */
  awaitingSince?: string
  /** Queue HITL: the step's UI spec (title/sections) extracted from the pending input, for rendering. */
  hitlUi?: unknown
  /** Queue HITL targeting: the queue run id, queue id, and the queue-definition step index. */
  queueJobId?: string
  queueId?: string
  queueStepIndex?: number
  children: JobNode[]
}

// Reuse Mongo connections across invocations (one client per URI).
const mongoClients = new Map<string, Promise<MongoClient>>()
export function getMongo(uri: string): Promise<MongoClient> {
  let c = mongoClients.get(uri)
  if (!c) {
    c = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect()
    mongoClients.set(uri, c)
  }
  return c
}

function parseJson<T>(val: unknown): T | undefined {
  if (val == null) return undefined
  if (typeof val !== "string") return val as T // upstash may already return parsed JSON
  try {
    return JSON.parse(val) as T
  } catch {
    return val as unknown as T
  }
}

/** Build a JobRecord from a Redis hash (`data`) + its `:internal` list items. Shared by the single
 * and bulk (pipelined) loaders so they parse identically. */
function redisRecordFrom(
  data: Record<string, unknown> | null | undefined,
  listItems: unknown[] | null | undefined,
  fallbackId: string,
): JobRecord | null {
  if (!data || Object.keys(data).length === 0) return null
  let internalJobs: InternalRef[] | undefined
  if (listItems && listItems.length) {
    internalJobs = listItems
      .map((s) => parseJson<InternalRef>(s))
      .filter((x): x is InternalRef => !!x?.jobId)
  } else {
    internalJobs = parseJson<InternalRef[]>(data.internalJobs)
  }
  return {
    jobId: String(data.jobId ?? fallbackId),
    workerId: String(data.workerId ?? ""),
    status: (String(data.status || "queued") as JobStatus) || "queued",
    input: parseJson(data.input),
    output: parseJson(data.output),
    error: parseJson(data.error),
    metadata: parseJson<Record<string, unknown>>(data.metadata) ?? {},
    internalJobs,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    completedAt: data.completedAt ? String(data.completedAt) : undefined,
  }
}

async function loadFromRedis(
  cfg: Extract<JobStoreConfig, { type: "upstash-redis" }>,
  jobId: string,
): Promise<JobRecord | null> {
  const redis = new Redis({ url: cfg.url, token: cfg.token })
  const key = `${cfg.prefix}${jobId}`
  const data = await redis.hgetall<Record<string, unknown>>(key)
  if (!data || Object.keys(data).length === 0) return null
  const listItems = await redis.lrange<unknown>(`${key}:internal`, 0, -1)
  return redisRecordFrom(data, listItems, jobId)
}

function mongoDocToRecord(d: Record<string, unknown>, fallbackJobId: string): JobRecord {
  return {
    jobId: String(d.jobId ?? fallbackJobId),
    workerId: String(d.workerId ?? ""),
    status: (String(d.status || "queued") as JobStatus) || "queued",
    input: d.input,
    output: d.output,
    error: d.error,
    metadata: (d.metadata as Record<string, unknown>) ?? {},
    internalJobs: d.internalJobs as InternalRef[] | undefined,
    createdAt: d.createdAt ? String(d.createdAt) : undefined,
    updatedAt: d.updatedAt ? String(d.updatedAt) : undefined,
    completedAt: d.completedAt ? String(d.completedAt) : undefined,
  }
}

async function loadFromMongo(
  cfg: Extract<JobStoreConfig, { type: "mongodb" }>,
  jobId: string,
): Promise<JobRecord | null> {
  const client = await getMongo(cfg.uri)
  const doc = await client
    .db(cfg.db)
    .collection(cfg.collection)
    .findOne({ _id: jobId as unknown as never })
  if (!doc) return null
  return mongoDocToRecord(doc as Record<string, unknown>, jobId)
}

/**
 * Bulk-load job records by id (no tree walk) — used by the History page to enrich its run list
 * with hierarchy (internalJobs edges) + trigger provenance (metadata.__trigger) + store status.
 * Mongo: a single `$in` query. Upstash Redis: per-job reads with bounded concurrency.
 */
export async function loadJobs(cfg: JobStoreConfig, jobIds: string[]): Promise<Map<string, JobRecord>> {
  const out = new Map<string, JobRecord>()
  const ids = Array.from(new Set(jobIds.filter(Boolean)))
  if (!ids.length) return out
  if (cfg.type === "mongodb") {
    const client = await getMongo(cfg.uri)
    const docs = await client
      .db(cfg.db)
      .collection(cfg.collection)
      .find({ _id: { $in: ids as unknown as never[] } })
      .toArray()
    for (const doc of docs) {
      const rec = mongoDocToRecord(doc as unknown as Record<string, unknown>, String((doc as { _id: unknown })._id))
      out.set(rec.jobId, rec)
    }
    return out
  }
  if (cfg.type === "upstash-redis") {
    // Pipeline ALL reads into 2 HTTP round-trips (hashes + internal lists) instead of 2×N. The old
    // per-job path opened a new client and made 2 REST calls per job — ~400 round-trips for a 24h
    // window, which was the History slowness AND caused partial failures (missing metadata → runs
    // mislabeled "external" / no hierarchy). Upstash caps pipeline size, so chunk generously.
    const redis = new Redis({ url: cfg.url, token: cfg.token })
    const CHUNK = 100
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK)
      const hashPipe = redis.pipeline()
      const listPipe = redis.pipeline()
      for (const id of chunk) {
        hashPipe.hgetall(`${cfg.prefix}${id}`)
        listPipe.lrange(`${cfg.prefix}${id}:internal`, 0, -1)
      }
      const [hashes, lists] = await Promise.all([
        hashPipe.exec<Array<Record<string, unknown> | null>>(),
        listPipe.exec<Array<unknown[] | null>>(),
      ])
      chunk.forEach((id, j) => {
        const rec = redisRecordFrom(hashes[j], lists[j], id)
        if (rec) out.set(id, rec)
      })
    }
  }
  return out
}

export async function loadJob(cfg: JobStoreConfig, jobId: string): Promise<JobRecord | null> {
  if (cfg.type === "upstash-redis") return loadFromRedis(cfg, jobId)
  if (cfg.type === "mongodb") return loadFromMongo(cfg, jobId)
  return null
}

/**
 * Build the job tree rooted at `jobId`, following `internalJobs` (dispatchWorker children).
 * Bounded by `maxNodes`/`maxDepth` and de-duplicated so cycles/fan-out can't blow up.
 */
export async function loadJobTree(
  cfg: JobStoreConfig,
  jobId: string,
  rootWorkerId: string,
  opts: { maxNodes?: number; maxDepth?: number } = {},
): Promise<JobNode> {
  const maxNodes = opts.maxNodes ?? 60
  const maxDepth = opts.maxDepth ?? 5
  const seen = new Set<string>()
  let count = 0

  const visit = async (
    id: string,
    fallbackWorkerId: string,
    depth: number,
    ref?: InternalRef,
  ): Promise<JobNode> => {
    seen.add(id)
    count++
    const rec = await loadJob(cfg, id).catch(() => null)
    const node: JobNode = {
      jobId: id,
      workerId: rec?.workerId || fallbackWorkerId,
      status: rec?.status ?? "unknown",
      output: rec?.output,
      error: rec?.error,
      metadata: rec?.metadata,
      input: rec?.input,
      createdAt: rec?.createdAt,
      updatedAt: rec?.updatedAt,
      completedAt: rec?.completedAt,
      found: !!rec,
      awaited: ref?.awaited,
      delaySeconds: ref?.delaySeconds,
      children: [],
    }
    const refs = rec?.internalJobs ?? []
    if (depth < maxDepth) {
      for (const child of refs) {
        if (!child?.jobId || seen.has(child.jobId) || count >= maxNodes) continue
        node.children.push(await visit(child.jobId, child.workerId, depth + 1, child))
      }
    }
    return node
  }

  return visit(jobId, rootWorkerId, 0)
}
