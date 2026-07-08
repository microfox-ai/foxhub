import { Redis } from "@upstash/redis"
import type { QueueStoreConfig } from "./worker-scope"
import { getMongo } from "./job-store"

/**
 * Read-only access to a project's QUEUE job store (Upstash Redis or MongoDB) — the `queue_jobs`
 * keyspace the runtime writes multi-step queue progress to. Schema mirrors `queueJobStore.ts`:
 *   Redis : hash `${prefix}${queueJobId}` with a JSON `steps` field
 *   Mongo : `queue_jobs` doc `_id = queueJobId`
 */

export type QueueStepStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"

export interface QueueStep {
  workerId: string
  workerJobId: string
  status: QueueStepStatus
  input?: unknown
  output?: unknown
  error?: unknown
  startedAt?: string
  completedAt?: string
}

export interface QueueDoc {
  id: string
  queueId: string
  status: "running" | "completed" | "failed" | "partial"
  steps: QueueStep[]
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

function parseJson<T>(val: unknown): T | undefined {
  if (val == null) return undefined
  if (typeof val !== "string") return val as T
  try {
    return JSON.parse(val) as T
  } catch {
    return undefined
  }
}

function stepsFrom(val: unknown): QueueStep[] {
  const arr = parseJson<QueueStep[]>(val)
  return Array.isArray(arr) ? arr : []
}

function docFromRecord(d: Record<string, unknown>, fallbackId: string): QueueDoc {
  return {
    id: String(d.id ?? fallbackId),
    queueId: String(d.queueId ?? ""),
    status: (String(d.status || "running") as QueueDoc["status"]) || "running",
    steps: Array.isArray(d.steps) ? (d.steps as QueueStep[]) : stepsFrom(d.steps),
    metadata: parseJson<Record<string, unknown>>(d.metadata) ?? {},
    createdAt: d.createdAt ? String(d.createdAt) : undefined,
    updatedAt: d.updatedAt ? String(d.updatedAt) : undefined,
    completedAt: d.completedAt ? String(d.completedAt) : undefined,
  }
}

/**
 * Best-effort listing of recent queue runs for the History page. Mongo sorts by `createdAt`;
 * Upstash Redis SCANs the prefix (bounded) and reads each hash. Returns newest-first.
 */
export async function listQueueDocs(cfg: QueueStoreConfig, limit = 100): Promise<QueueDoc[]> {
  if (cfg.type === "mongodb") {
    const client = await getMongo(cfg.uri)
    const docs = await client
      .db(cfg.db)
      .collection(cfg.collection)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return docs.map((d) => docFromRecord(d as Record<string, unknown>, String((d as { _id?: unknown })._id ?? "")))
  }
  if (cfg.type === "upstash-redis") {
    const redis = new Redis({ url: cfg.url, token: cfg.token })
    const keys: string[] = []
    let cursor = "0"
    // Bound the scan so a huge keyspace can't stall the request.
    for (let i = 0; i < 20 && keys.length < limit * 2; i++) {
      const [next, batch] = await redis.scan(cursor, { match: `${cfg.prefix}*`, count: 200 })
      cursor = String(next)
      for (const k of batch) keys.push(k)
      if (cursor === "0") break
    }
    const ids = keys.map((k) => k.slice(cfg.prefix.length)).filter(Boolean)
    const docs: QueueDoc[] = []
    for (const id of ids.slice(0, limit)) {
      const data = await redis.hgetall<Record<string, unknown>>(`${cfg.prefix}${id}`)
      if (data && Object.keys(data).length) docs.push(docFromRecord(data, id))
    }
    docs.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    return docs
  }
  return []
}

/**
 * Apply a patch to one step of a queue run (read-modify-write). The console's ONLY write path —
 * used by the HITL approve/reject action to flip a parked step to running/failed. Returns the
 * updated doc, or null if the run/step doesn't exist.
 */
export async function updateQueueStep(
  cfg: QueueStoreConfig,
  queueJobId: string,
  stepArrayIndex: number,
  patch: Partial<QueueStep>,
): Promise<QueueDoc | null> {
  const doc = await loadQueueDoc(cfg, queueJobId)
  if (!doc) return null
  const step = doc.steps[stepArrayIndex]
  if (!step) return null
  doc.steps[stepArrayIndex] = { ...step, ...patch }
  doc.updatedAt = new Date().toISOString()

  if (cfg.type === "upstash-redis") {
    const redis = new Redis({ url: cfg.url, token: cfg.token })
    await redis.hset(`${cfg.prefix}${queueJobId}`, {
      steps: JSON.stringify(doc.steps),
      updatedAt: doc.updatedAt,
    })
    return doc
  }
  if (cfg.type === "mongodb") {
    const client = await getMongo(cfg.uri)
    await client
      .db(cfg.db)
      .collection(cfg.collection)
      .updateOne(
        { _id: queueJobId as unknown as never },
        { $set: { steps: doc.steps, updatedAt: doc.updatedAt } },
      )
    return doc
  }
  return null
}

export async function loadQueueDoc(
  cfg: QueueStoreConfig,
  queueJobId: string,
): Promise<QueueDoc | null> {
  if (cfg.type === "upstash-redis") {
    const redis = new Redis({ url: cfg.url, token: cfg.token })
    const data = await redis.hgetall<Record<string, unknown>>(`${cfg.prefix}${queueJobId}`)
    if (!data || Object.keys(data).length === 0) return null
    return {
      id: String(data.id ?? queueJobId),
      queueId: String(data.queueId ?? ""),
      status: (String(data.status || "running") as QueueDoc["status"]) || "running",
      steps: stepsFrom(data.steps),
      metadata: parseJson<Record<string, unknown>>(data.metadata) ?? {},
      createdAt: data.createdAt ? String(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      completedAt: data.completedAt ? String(data.completedAt) : undefined,
    }
  }
  if (cfg.type === "mongodb") {
    const client = await getMongo(cfg.uri)
    const doc = await client
      .db(cfg.db)
      .collection(cfg.collection)
      .findOne({ _id: queueJobId as unknown as never })
    if (!doc) return null
    const d = doc as Record<string, unknown>
    return {
      id: String(d.id ?? queueJobId),
      queueId: String(d.queueId ?? ""),
      status: (String(d.status || "running") as QueueDoc["status"]) || "running",
      steps: Array.isArray(d.steps) ? (d.steps as QueueStep[]) : [],
      metadata: (d.metadata as Record<string, unknown>) ?? {},
      createdAt: d.createdAt ? String(d.createdAt) : undefined,
      updatedAt: d.updatedAt ? String(d.updatedAt) : undefined,
      completedAt: d.completedAt ? String(d.completedAt) : undefined,
    }
  }
  return null
}
