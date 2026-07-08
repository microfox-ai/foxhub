import { NextRequest, NextResponse } from "next/server"
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs"
import {
  resolveWorkerScope,
  fetchProjectEnvMerged,
  resolveQueueStoreConfig,
  resolveJobStoreConfig,
  type WorkerLambda,
} from "../worker-scope"
import { listQueueDocs, type QueueDoc } from "../queue-store"
import { loadJobs } from "../job-store"

/**
 * GET /api/console/workers/history
 *
 * The run history for the console's Monitoring → History page. Worker runs are indexed by scanning
 * each in-scope worker Lambda's CloudWatch logs for the authoritative `[AIWORKER_RUN]` marker (jobId
 * ↔ requestId ↔ workerId, emitted once per invocation) plus the `Job status updated to <status>`
 * lines (so the list shows a status without touching the job store). Queue runs are listed
 * best-effort from the queue store (newest-first). Clicking a row hydrates the full tree/output via
 * the existing job/queue-job routes.
 *
 * Query: projectId, rangeMinutes?(=1440), workerId?, group?, kind?(all|worker|queue), limit?(=200)
 */

/** How a run was triggered — stamped by the trigger surfaces (metadata.__trigger) or derived
 * from the job store's internalJobs parent edges. */
type RunTrigger = {
  type: "external" | "console" | "worker" | "queue" | "schedule"
  /** For type worker/queue: the dispatching parent run. */
  parentJobId?: string
  parentWorkerId?: string
  queueId?: string
  queueJobId?: string
  /** For type console: the console user who clicked Trigger. */
  userId?: string
  at?: string
  awaited?: boolean
}

type HistoryRun = {
  kind: "worker" | "queue"
  jobId: string
  workerId: string
  group: string
  status: "queued" | "running" | "completed" | "failed" | "awaiting_approval" | "unknown"
  startedAt?: string
  requestId?: string
  functionName?: string
  /** For queue runs: the queue id; for worker runs: undefined. */
  queueId?: string
  /** For queue runs: number of steps. */
  stepCount?: number
  /** Hierarchy: the run (in this window) that dispatched this one, if any. */
  parentJobId?: string
  parentWorkerId?: string
  /** Whether the parent awaited this child (dispatchWorker await:true). */
  awaited?: boolean
  /** Trigger provenance — always set when store enrichment succeeded. */
  trigger?: RunTrigger
}

const RUN_MARKER = /\[AIWORKER_RUN\]\s*(\{.*\})/
const STATUS_LINE = /Job status updated to (queued|running|completed|failed)\b/
const JOBID_IN_LINE = /jobId:\s*['"]([^'"]+)['"]/

function queueStatus(s: QueueDoc["status"]): HistoryRun["status"] {
  if (s === "completed") return "completed"
  if (s === "failed") return "failed"
  return "running" // running | partial
}

/** Scan one log group for run markers + status lines over the window. Returns runs keyed by jobId. */
async function scanWorkerGroup(
  client: CloudWatchLogsClient,
  lambda: WorkerLambda,
  startTime: number,
  endTime: number,
): Promise<Map<string, HistoryRun>> {
  const out = new Map<string, HistoryRun>()
  const status = new Map<string, HistoryRun["status"]>()
  let nextToken: string | undefined
  // Bound pagination so a noisy group can't stall the request.
  for (let page = 0; page < 5; page++) {
    const res = await client.send(
      new FilterLogEventsCommand({
        logGroupName: `/aws/lambda/${lambda.functionName}`,
        startTime,
        endTime,
        // OR of two literal substrings — markers and status transitions.
        filterPattern: `?"AIWORKER_RUN" ?"Job status updated to"`,
        interleaved: true,
        nextToken,
      }),
    )
    for (const e of res.events ?? []) {
      const msg = e.message ?? ""
      const marker = msg.match(RUN_MARKER)
      if (marker && marker[1]) {
        try {
          const o = JSON.parse(marker[1]) as { jobId?: string; workerId?: string; awsRequestId?: string }
          if (o.jobId && !out.has(o.jobId)) {
            out.set(o.jobId, {
              kind: "worker",
              jobId: o.jobId,
              workerId: o.workerId || lambda.workerId,
              group: lambda.group,
              status: "unknown",
              startedAt: e.timestamp ? new Date(e.timestamp).toISOString() : undefined,
              requestId: o.awsRequestId,
              functionName: lambda.functionName,
            })
          }
        } catch {
          /* ignore malformed marker */
        }
        continue
      }
      const st = msg.match(STATUS_LINE)
      const jid = msg.match(JOBID_IN_LINE)
      if (st && st[1] && jid && jid[1]) status.set(jid[1], st[1] as HistoryRun["status"])
    }
    if (!res.nextToken) break
    nextToken = res.nextToken
  }
  // Fold the latest-seen status onto each run.
  for (const [jobId, s] of status) {
    const run = out.get(jobId)
    if (run) run.status = s
  }
  return out
}

/**
 * Short-TTL in-memory cache of the FULL computed run list per window. The CloudWatch marker scan +
 * job-store enrichment is the expensive part and produces the same data for repeat loads within a
 * few seconds (refresh, re-open, and every pagination page). We compute it once per
 * (project, range, kind, filters) and slice pages out of the cache — so paging never rescans, and a
 * refresh within the TTL is instant. `?refresh=1` bypasses it. Module-level, so it persists across
 * requests in the same server process (best-effort; empty after a cold start / on serverless spin-up).
 */
type HistoryPayload = {
  runs: HistoryRun[]
  enriched: boolean
  queueStoreAvailable: boolean
  scannedWorkers: number
}
type CacheEntry = HistoryPayload & { at: number }
const historyCache = new Map<string, CacheEntry>()
const HISTORY_TTL_MS = Number(process.env.HISTORY_CACHE_TTL_MS) || 45_000
const HISTORY_CACHE_MAX = 300

function getCache(key: string): CacheEntry | null {
  const e = historyCache.get(key)
  if (!e) return null
  if (Date.now() - e.at > HISTORY_TTL_MS) {
    historyCache.delete(key)
    return null
  }
  return e
}
function setCache(key: string, p: HistoryPayload): CacheEntry {
  const entry: CacheEntry = { ...p, at: Date.now() }
  historyCache.set(key, entry)
  if (historyCache.size > HISTORY_CACHE_MAX) {
    // Evict the oldest entry to bound memory.
    let oldestKey: string | undefined
    let oldestAt = Infinity
    for (const [k, v] of historyCache) if (v.at < oldestAt) ((oldestAt = v.at), (oldestKey = k))
    if (oldestKey) historyCache.delete(oldestKey)
  }
  return entry
}

export async function GET(req: NextRequest) {
  const projectId = (req.nextUrl.searchParams.get("projectId") || "").trim()
  const scope = await resolveWorkerScope(projectId)
  if (!scope.ok) return scope.response

  if (
    !scope.can("workers.view") &&
    !scope.can("deployment.view") &&
    !scope.can("observability.view")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to view run history for this project" },
      { status: 403 },
    )
  }

  const sp = req.nextUrl.searchParams
  const rangeMinutes = Math.min(43200, Math.max(5, Number(sp.get("rangeMinutes")) || 1440))
  const workerIdFilter = sp.get("workerId")?.trim() || undefined
  const groupFilter = sp.get("group")?.trim() || undefined
  const kind = (sp.get("kind") || "all") as "all" | "worker" | "queue"
  const limit = Math.min(1000, Math.max(1, Number(sp.get("limit")) || 200))
  // Pagination slices the cached full list — the scan/enrichment runs once per window, not per page.
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize")) || 50))
  const offset = Math.max(0, Number(sp.get("offset")) || 0)
  const refresh = sp.get("refresh") === "1" || sp.get("refresh") === "true"

  const cacheKey = [projectId, rangeMinutes, kind, workerIdFilter ?? "", groupFilter ?? "", limit].join("|")
  const cached = refresh ? null : getCache(cacheKey)

  let full: HistoryPayload
  if (cached) {
    full = cached
  } else {
    const endTime = Date.now()
    const startTime = endTime - rangeMinutes * 60 * 1000

  // --- Worker runs (from CloudWatch markers) --------------------------------
  // We ALWAYS scan the worker logs first — even for kind=queue — because the resulting set of
  // jobIds is the only RELIABLY project-scoped signal we have: CloudWatch log groups belong to this
  // project's Lambdas, whereas the Upstash/Mongo job store is SHARED across projects. A queue run's
  // id == its first step's worker jobId, so we keep only queue docs whose id appears here.
  const byRegion = new Map<string, CloudWatchLogsClient>()
  const clientFor = (region: string) => {
    let c = byRegion.get(region)
    if (!c) {
      c = new CloudWatchLogsClient({
        region,
        credentials: {
          accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
        },
      })
      byRegion.set(region, c)
    }
    return c
  }

  const lambdas = scope.workerLambdas.filter((l) => {
    if (workerIdFilter && l.workerId !== workerIdFilter) return false
    if (groupFilter && l.group !== groupFilter) return false
    return true
  })
  const maps = await Promise.all(
    lambdas.map(async (l) => {
      try {
        return await scanWorkerGroup(clientFor(l.region), l, startTime, endTime)
      } catch (e) {
        // Missing log group (never ran) → no runs, not an error.
        if ((e as { name?: string })?.name === "ResourceNotFoundException") return new Map<string, HistoryRun>()
        throw e
      }
    }),
  )
  const workerMap = new Map<string, HistoryRun>()
  for (const m of maps) for (const [jobId, run] of m) workerMap.set(jobId, run)
  /** Project-scoped set of jobIds seen in THIS project's worker logs (the isolation key). */
  const projectJobIds = new Set(workerMap.keys())

  // The deployed env backs BOTH the queue listing and the hierarchy/trigger enrichment below.
  const env = await fetchProjectEnvMerged(projectId, scope.accessToken)

  // --- Queue runs (from the SHARED store, filtered to THIS project) ---------
  const queueRuns: HistoryRun[] = []
  const stepJobIds = new Set<string>() // queue step worker jobIds — excluded from the worker list
  let queueStoreAvailable = false
  if (kind !== "worker") {
    const cfg = env ? resolveQueueStoreConfig(env) : { type: "none" as const }
    if (cfg.type !== "none") {
      try {
        // Over-fetch (the store is shared) so this project's runs aren't crowded out before filtering.
        const docs = await listQueueDocs(cfg, Math.max(limit * 4, 200))
        queueStoreAvailable = true
        for (const d of docs) {
          // Project isolation: keep only queue runs whose first-step worker ran in THIS project's
          // logs. Without this, a shared Upstash/Mongo store would leak other projects' queue runs.
          if (!projectJobIds.has(d.id)) continue
          for (const s of d.steps) if (s.workerJobId) stepJobIds.add(s.workerJobId)
          const awaiting = d.steps.some((s) => s.status === "awaiting_approval")
          // The queue-trigger surfaces stamp metadata.__trigger on start (console/user/schedule).
          const stamped = (d.metadata as { __trigger?: RunTrigger } | undefined)?.__trigger
          queueRuns.push({
            kind: "queue",
            jobId: d.id,
            workerId: d.steps[0]?.workerId || d.queueId,
            group: scope.workerLambdas.find((l) => l.workerId === d.steps[0]?.workerId)?.group ?? "—",
            status: awaiting ? "awaiting_approval" : queueStatus(d.status),
            startedAt: d.createdAt,
            queueId: d.queueId,
            stepCount: d.steps.length,
            trigger:
              stamped && typeof stamped === "object" && stamped.type
                ? stamped
                : { type: "external" },
          })
        }
      } catch {
        /* store unreadable — fall back to worker runs only */
      }
    }
  }

  // Worker run list: drop those that are actually a queue step (shown under the queue run instead).
  const workerRuns =
    kind === "queue" ? [] : Array.from(workerMap.values()).filter((r) => !stepJobIds.has(r.jobId))

  const runs = [...queueRuns, ...workerRuns]
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))
    .slice(0, limit)

  // --- Hierarchy + trigger enrichment (best-effort, from the job store) ------
  // Bulk-load the listed worker runs' job records to get (a) parent→child edges from each
  // record's internalJobs (dispatchWorker children), (b) the metadata.__trigger provenance stamp,
  // and (c) the authoritative store status for runs whose log lines didn't include one. All of
  // this is read-only and skipped gracefully when the caller lacks env access.
  let enriched = false
  const listedWorkerRuns = runs.filter((r) => r.kind === "worker")
  if (env && listedWorkerRuns.length) {
    const jobCfg = resolveJobStoreConfig(env)
    if (jobCfg.type !== "none") {
      try {
        const records = await loadJobs(
          jobCfg,
          listedWorkerRuns.map((r) => r.jobId),
        )
        // Parent edges: a record's internalJobs are the children it dispatched.
        const parentOf = new Map<string, { jobId: string; workerId: string; awaited?: boolean }>()
        for (const [pid, rec] of records) {
          for (const ref of rec.internalJobs ?? []) {
            if (ref?.jobId) parentOf.set(ref.jobId, { jobId: pid, workerId: rec.workerId, awaited: ref.awaited })
          }
        }
        for (const r of listedWorkerRuns) {
          const rec = records.get(r.jobId)
          if (rec && r.status === "unknown" && rec.status !== "unknown") {
            r.status = rec.status // backfill: store status beats "—" from missing log lines
          }
          const parent = parentOf.get(r.jobId)
          if (parent) {
            r.parentJobId = parent.jobId
            r.parentWorkerId = parent.workerId
            r.awaited = parent.awaited
          }
          // Trigger provenance: the stamp is most precise (console user / queue / worker — works
          // even when the parent run is outside this window); fall back to the derived parent
          // edge, then to a queue envelope on the input, then to "external".
          const stamped = (rec?.metadata as { __trigger?: RunTrigger } | undefined)?.__trigger
          const inputQueueCtx =
            rec?.input && typeof rec.input === "object" && "__workerQueue" in rec.input
              ? ((rec.input as Record<string, unknown>).__workerQueue as
                  | { id?: string; queueJobId?: string }
                  | undefined)
              : undefined
          r.trigger =
            stamped && typeof stamped === "object" && stamped.type
              ? stamped
              : parent
                ? { type: "worker", parentJobId: parent.jobId, parentWorkerId: parent.workerId, awaited: parent.awaited }
                : inputQueueCtx?.id
                  ? { type: "queue", queueId: inputQueueCtx.id, queueJobId: inputQueueCtx.queueJobId }
                  : { type: "external" }
          // The derived parent edge is ground truth for hierarchy even when a stamp exists.
          if (!r.parentJobId && r.trigger.parentJobId) {
            r.parentJobId = r.trigger.parentJobId
            r.parentWorkerId = r.trigger.parentWorkerId
          }
        }
        enriched = true
      } catch {
        /* store unreadable — the flat, unlabeled list still works */
      }
    }
  }

    full = { runs, enriched, queueStoreAvailable, scannedWorkers: scope.workerLambdas.length }
    setCache(cacheKey, full)
  }

  const total = full.runs.length
  const page = full.runs.slice(offset, offset + pageSize)
  const hasMore = offset + pageSize < total
  return NextResponse.json({
    runs: page,
    total,
    offset,
    pageSize,
    hasMore,
    nextOffset: hasMore ? offset + pageSize : null,
    rangeMinutes,
    queueStoreAvailable: full.queueStoreAvailable,
    enriched: full.enriched,
    scannedWorkers: full.scannedWorkers,
    fromCache: !!cached,
    cachedAt: cached?.at ?? Date.now(),
  })
}
