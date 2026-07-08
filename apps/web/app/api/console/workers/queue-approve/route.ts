import { NextRequest, NextResponse } from "next/server"
import {
  resolveWorkerScope,
  resolveWorkersApiKey,
  fetchProjectEnvMerged,
  resolveQueueStoreConfig,
} from "../worker-scope"
import { loadQueueDoc, updateQueueStep, type QueueStep } from "../queue-store"

/**
 * POST /api/console/workers/queue-approve
 *
 * Human-in-the-loop approve/reject for a queue step parked at `awaiting_approval`. Mirrors the
 * boilerplate `handleQueueApprove`, but driven from the console:
 *   1. Find the awaiting step in the queue run.
 *   2. On APPROVE: validate the reviewer `input` against the step's HITL JSON schema (fail-closed
 *      when the schema is available from /workers/config), write the step → running, then re-dispatch
 *      the same worker job via the core /workers/trigger with `__hitlInput`/`__hitlDecision`.
 *   3. On REJECT: write the step → failed.
 *
 * The reviewer input is validated SERVER-SIDE (never trust the client). Generic — no per-queue code.
 *
 * ⚠ This is a MUTATION (writes the queue store + re-dispatches). Gated on workers.trigger.
 *
 * Body: { projectId, queueJobId, stepIndex?, decision:'approve'|'reject', input?, comment?, reviewerId? }
 */

type Body = {
  projectId?: string
  queueJobId?: string
  /** Array index of the step in the run's steps[]. Omit to auto-find the awaiting step. */
  stepIndex?: number
  decision?: "approve" | "reject"
  input?: Record<string, unknown>
  comment?: string
  reviewerId?: string
}

type JsonSchema = {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: unknown[]
  items?: JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  additionalProperties?: boolean | JsonSchema
}

/**
 * Minimal, dependency-free JSON-Schema validator (no ajv in this app). Covers the keywords zod →
 * JSON Schema emits for HITL reviewer forms: type, required, properties, enum, min/max length,
 * minimum/maximum, additionalProperties:false, items, anyOf/oneOf. Unknown keywords are ignored
 * (lenient); the enforced keywords fail closed. Defense-in-depth — the worker's `resume()` is the
 * final gate. NOT a full JSON-Schema implementation.
 */
function validate(schema: JsonSchema, value: unknown, path = ""): string[] {
  const errs: string[] = []
  const at = (p: string) => (p ? p : "(root)")

  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    if (!schema.anyOf.some((b) => validate(b, value, path).length === 0))
      errs.push(`${at(path)}: does not match any allowed shape`)
    return errs
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
    const matches = schema.oneOf.filter((b) => validate(b, value, path).length === 0).length
    if (matches !== 1) errs.push(`${at(path)}: must match exactly one allowed shape`)
    return errs
  }

  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []
  const effectiveType = types[0] ?? (schema.properties ? "object" : undefined)

  if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === value)) {
    errs.push(`${at(path)}: must be one of ${JSON.stringify(schema.enum)}`)
  }

  if (effectiveType === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      errs.push(`${at(path)}: expected an object`)
      return errs
    }
    const obj = value as Record<string, unknown>
    for (const req of schema.required ?? []) {
      if (!(req in obj) || obj[req] === undefined) errs.push(`${path ? path + "." : ""}${req}: required`)
    }
    const props = schema.properties ?? {}
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(obj)) {
        if (!(k in props)) errs.push(`${path ? path + "." : ""}${k}: unexpected field`)
      }
    }
    for (const [k, sub] of Object.entries(props)) {
      if (k in obj && obj[k] !== undefined) errs.push(...validate(sub, obj[k], path ? `${path}.${k}` : k))
    }
    return errs
  }

  if (effectiveType === "array") {
    if (!Array.isArray(value)) {
      errs.push(`${at(path)}: expected an array`)
      return errs
    }
    if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items!, v, `${path}[${i}]`)))
    return errs
  }

  if (effectiveType === "string") {
    if (typeof value !== "string") errs.push(`${at(path)}: expected a string`)
    else {
      if (schema.minLength != null && value.length < schema.minLength)
        errs.push(`${at(path)}: must be at least ${schema.minLength} chars`)
      if (schema.maxLength != null && value.length > schema.maxLength)
        errs.push(`${at(path)}: must be at most ${schema.maxLength} chars`)
    }
    return errs
  }

  if (effectiveType === "number" || effectiveType === "integer") {
    if (typeof value !== "number" || Number.isNaN(value)) errs.push(`${at(path)}: expected a number`)
    else {
      if (effectiveType === "integer" && !Number.isInteger(value)) errs.push(`${at(path)}: expected an integer`)
      if (schema.minimum != null && value < schema.minimum) errs.push(`${at(path)}: must be ≥ ${schema.minimum}`)
      if (schema.maximum != null && value > schema.maximum) errs.push(`${at(path)}: must be ≤ ${schema.maximum}`)
    }
    return errs
  }

  if (effectiveType === "boolean" && typeof value !== "boolean") errs.push(`${at(path)}: expected a boolean`)
  return errs
}

/** The queue-definition step index parked the step recorded under `__hitlPending.stepIndex`. */
function pendingStepIndex(input: unknown): number | undefined {
  if (input && typeof input === "object" && "__hitlPending" in input) {
    const p = (input as { __hitlPending?: unknown }).__hitlPending
    if (p && typeof p === "object" && "stepIndex" in p) {
      const i = (p as { stepIndex?: unknown }).stepIndex
      if (typeof i === "number") return i
    }
  }
  return undefined
}

/** Fetch the awaiting step's HITL reviewer JSON schema from /workers/config, if exposed yet. */
async function fetchHitlSchema(
  agentBaseUrl: string,
  key: string | null,
  queueId: string,
  defStepIndex: number | undefined,
): Promise<JsonSchema | undefined> {
  if (defStepIndex == null) return undefined
  try {
    const headers: Record<string, string> = {}
    if (key) headers["x-workers-config-key"] = key
    const res = await fetch(`${agentBaseUrl}/workers/config`, { headers, cache: "no-store" })
    if (!res.ok) return undefined
    const data = (await res.json()) as {
      queues?: { id: string; steps?: { hitlInputSchema?: JsonSchema }[] }[]
    }
    const queue = (data.queues ?? []).find((q) => q.id === queueId)
    return queue?.steps?.[defStepIndex]?.hitlInputSchema
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const projectId = (body.projectId || "").trim()
  const queueJobId = (body.queueJobId || "").trim()
  const decision = body.decision === "reject" ? "reject" : "approve"
  if (!queueJobId) return NextResponse.json({ error: "queueJobId is required" }, { status: 400 })

  const scope = await resolveWorkerScope(projectId)
  if (!scope.ok) return scope.response

  if (!scope.can("workers.trigger") && !scope.can("deployment.create")) {
    return NextResponse.json(
      { error: "You do not have permission to approve queue steps for this project" },
      { status: 403 },
    )
  }
  if (!scope.agentBaseUrl) {
    return NextResponse.json({ error: "This project has no deployed core endpoint yet" }, { status: 409 })
  }

  const env = await fetchProjectEnvMerged(projectId, scope.accessToken)
  const cfg = env ? resolveQueueStoreConfig(env) : { type: "none" as const }
  if (cfg.type === "none") {
    return NextResponse.json(
      { error: "No queue job store is configured (or env access is missing), so the step can't be updated." },
      { status: 400 },
    )
  }

  const doc = await loadQueueDoc(cfg, queueJobId)
  if (!doc) return NextResponse.json({ error: "Queue run not found" }, { status: 404 })

  // Resolve the awaiting step (explicit array index, else the first awaiting one).
  const arrayIndex =
    typeof body.stepIndex === "number" && body.stepIndex >= 0
      ? body.stepIndex
      : doc.steps.findIndex((s) => s.status === "awaiting_approval")
  const step: QueueStep | undefined = doc.steps[arrayIndex]
  if (!step) return NextResponse.json({ error: "No awaiting_approval step found for this run" }, { status: 400 })
  if (step.status !== "awaiting_approval") {
    return NextResponse.json({ error: `Step ${arrayIndex} is not awaiting approval` }, { status: 400 })
  }

  // --- Reject ---------------------------------------------------------------
  if (decision === "reject") {
    await updateQueueStep(cfg, queueJobId, arrayIndex, {
      status: "failed",
      error: { message: body.comment || "Rejected by reviewer" },
      completedAt: new Date().toISOString(),
    })
    return NextResponse.json({
      ok: true,
      decision,
      queueJobId,
      stepIndex: arrayIndex,
      workerId: step.workerId,
      status: "failed",
    })
  }

  // --- Approve: validate reviewer input against the HITL schema (fail-closed when present) ----
  const reviewerInput = (body.input && typeof body.input === "object" ? body.input : {}) as Record<string, unknown>
  const { key } = await resolveWorkersApiKey(projectId, scope.accessToken)
  const schema = await fetchHitlSchema(scope.agentBaseUrl, key, doc.queueId, pendingStepIndex(step.input))
  let validated = false
  if (schema) {
    const errors = validate(schema, reviewerInput)
    if (errors.length) {
      return NextResponse.json(
        { error: "Reviewer input failed HITL schema validation", details: errors },
        { status: 400 },
      )
    }
    validated = true
  }

  // Forward the stored pending input + the HITL envelope; the worker runtime runs `resume()` and
  // strips all envelope keys before the user handler sees the input.
  const pendingInput =
    step.input && typeof step.input === "object" ? (step.input as Record<string, unknown>) : {}
  const dispatchInput = {
    ...pendingInput,
    __hitlInput: reviewerInput,
    __hitlDecision: {
      decision: "approve" as const,
      reviewerId: body.reviewerId ?? scope.userId ?? null,
      comment: body.comment ?? null,
      reviewedAt: new Date().toISOString(),
    },
  }

  // Write the step to running BEFORE dispatching so the worker can't append/overwrite the steps
  // array before this read-modify-write lands (mirrors the boilerplate's race fix).
  await updateQueueStep(cfg, queueJobId, arrayIndex, {
    status: "running",
    startedAt: new Date().toISOString(),
    input: dispatchInput,
  })

  // Re-dispatch the SAME worker job via the core trigger endpoint (mirror the trigger route envelope).
  const messageBody = {
    workerId: step.workerId,
    jobId: step.workerJobId,
    input: dispatchInput,
    context: {},
    metadata: {
      source: "queue-hitl-approve",
      queueId: doc.queueId,
      queueJobId,
      stepIndex: arrayIndex,
      reviewerId: body.reviewerId ?? scope.userId ?? null,
    },
    timestamp: new Date().toISOString(),
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (key) headers["x-workers-trigger-key"] = key

  let upstream: Response
  try {
    upstream = await fetch(`${scope.agentBaseUrl}/workers/trigger`, {
      method: "POST",
      headers,
      body: JSON.stringify({ workerId: step.workerId, body: messageBody }),
      cache: "no-store",
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Step marked running but re-dispatch failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    )
  }
  const text = await upstream.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = text
  }

  return NextResponse.json(
    {
      ok: upstream.ok,
      decision,
      queueJobId,
      stepIndex: arrayIndex,
      workerId: step.workerId,
      workerJobId: step.workerJobId,
      status: "running",
      validated,
      response: parsed,
    },
    { status: upstream.ok ? 200 : 502 },
  )
}
