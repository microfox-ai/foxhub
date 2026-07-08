import { NextRequest, NextResponse } from "next/server"
import { resolveWorkerScope, fetchProjectEnvMerged, resolveQueueStoreConfig } from "../worker-scope"
import { loadQueueDoc, type QueueStep, type QueueStepStatus } from "../queue-store"
import type { JobNode } from "../job-store"

/**
 * POST /api/console/workers/queue-job
 *
 * Reads a queue run from the `queue_jobs` store and returns it shaped EXACTLY like the worker job
 * route (`{ available, storeType, root }`) so the console's run views (graph/timeline/list) render
 * a queue with zero extra UI. The queue is synthesized as a linear chain: a synthetic queue root
 * (carrying the final output) → step 0 → step 1 → … Per-step logs reuse the worker-Lambda
 * correlation via each step's `workerJobId`.
 *
 * Body: { projectId, queueJobId }
 */

type Body = { projectId?: string; queueJobId?: string }

const STEP_STATUS: Record<QueueStepStatus, JobNode["status"]> = {
  queued: "queued",
  running: "running",
  awaiting_approval: "running", // shown as running; an Approve action is a future enhancement
  completed: "completed",
  failed: "failed",
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const queueJobId = (body.queueJobId || "").trim()
  if (!queueJobId) return NextResponse.json({ error: "queueJobId is required" }, { status: 400 })

  const scope = await resolveWorkerScope((body.projectId || "").trim())
  if (!scope.ok) return scope.response

  if (
    !scope.can("workers.view") &&
    !scope.can("deployment.view") &&
    !scope.can("observability.view")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to view queues for this project" },
      { status: 403 },
    )
  }

  const env = await fetchProjectEnvMerged(body.projectId!.trim(), scope.accessToken)
  if (!env) {
    return NextResponse.json({
      available: false,
      reason: "env_access_required",
      message: "Reading queue output needs the project's job-store credentials (env.view permission).",
    })
  }

  const cfg = resolveQueueStoreConfig(env)
  if (cfg.type === "none") {
    return NextResponse.json({
      available: false,
      reason: "no_job_store",
      message: "No queue job store is configured for this project, so queue status/output can't be read.",
    })
  }

  let doc
  try {
    doc = await loadQueueDoc(cfg, queueJobId)
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read queue store: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    )
  }

  if (!doc) {
    // Not in the store yet (queue just started) — return a placeholder root so the UI can poll.
    const root: JobNode = {
      jobId: queueJobId,
      workerId: "queue",
      status: "queued",
      found: false,
      children: [],
    }
    return NextResponse.json({ available: true, storeType: cfg.type, root })
  }

  // The runtime stores the HITL UI spec inside the parked step's `input` as `{ hitl: { uiSpec } }`
  // and the queue-definition step index under `__hitlPending.stepIndex` (used for schema lookup).
  const extractHitlUi = (input: unknown): unknown => {
    if (input && typeof input === "object" && "hitl" in input) {
      const h = (input as { hitl?: unknown }).hitl
      if (h && typeof h === "object" && "uiSpec" in h) return (h as { uiSpec?: unknown }).uiSpec
    }
    return undefined
  }
  const extractDefStepIndex = (input: unknown): number | undefined => {
    if (input && typeof input === "object" && "__hitlPending" in input) {
      const p = (input as { __hitlPending?: unknown }).__hitlPending
      if (p && typeof p === "object" && "stepIndex" in p) {
        const i = (p as { stepIndex?: unknown }).stepIndex
        if (typeof i === "number") return i
      }
    }
    return undefined
  }
  // When the step parked for approval — `__hitlPending.createdAt` (runtime-stamped). Start of the
  // HITL wait window shown on the timeline. Falls back to the step's own startedAt.
  const extractAwaitingSince = (input: unknown, fallback?: string): string | undefined => {
    if (input && typeof input === "object" && "__hitlPending" in input) {
      const p = (input as { __hitlPending?: unknown }).__hitlPending
      if (p && typeof p === "object" && "createdAt" in p) {
        const c = (p as { createdAt?: unknown }).createdAt
        if (typeof c === "string" && c.trim()) return c
      }
    }
    return fallback
  }

  // Build the step chain (step 0 → step 1 → …).
  const stepNode = (step: QueueStep): JobNode => {
    const awaitingApproval = step.status === "awaiting_approval"
    return {
      jobId: step.workerJobId,
      workerId: step.workerId,
      status: STEP_STATUS[step.status] ?? "unknown",
      output: step.output,
      error: step.error,
      input: step.input,
      createdAt: step.startedAt,
      updatedAt: step.completedAt ?? step.startedAt,
      completedAt: step.completedAt,
      found: true,
      awaitingApproval: awaitingApproval || undefined,
      awaitingSince: awaitingApproval ? extractAwaitingSince(step.input, step.startedAt) : undefined,
      hitlUi: awaitingApproval ? extractHitlUi(step.input) : undefined,
      queueJobId: awaitingApproval ? doc.id : undefined,
      queueId: awaitingApproval ? doc.queueId : undefined,
      queueStepIndex: awaitingApproval ? extractDefStepIndex(step.input) : undefined,
      children: [],
    }
  }

  let chainHead: JobNode | undefined
  let prev: JobNode | undefined
  for (const step of doc.steps) {
    const node = stepNode(step)
    if (!chainHead) chainHead = node
    if (prev) prev.children = [node]
    prev = node
  }

  const lastStep = doc.steps[doc.steps.length - 1]
  const rootStatus: JobNode["status"] =
    doc.status === "completed" ? "completed" : doc.status === "failed" ? "failed" : "running"

  const root: JobNode = {
    // The synthetic queue-summary root MUST have an id distinct from every step. By queue design
    // the queueJobId == the FIRST step's workerJobId, so using queueJobId here collides with step 0
    // — the graph/timeline cycle guards then skip the whole chain (list view, which has no guard,
    // still showed it → the graph/timeline-vs-list discrepancy). Namespace it so ids are unique.
    jobId: `queue:${queueJobId}`,
    workerId: `queue: ${doc.queueId || ""}`.trim(),
    status: rootStatus,
    output: lastStep?.output, // the queue's final output = its last step's output
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
    found: true,
    children: chainHead ? [chainHead] : [],
  }

  return NextResponse.json({ available: true, storeType: cfg.type, root })
}
