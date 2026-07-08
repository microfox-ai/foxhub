import { NextRequest, NextResponse } from "next/server"
import { resolveWorkerScope, resolveWorkersApiKey, findQueueLambda } from "../worker-scope"

/**
 * POST /api/console/workers/queue-trigger
 *
 * Starts a queue through the core `POST /queues/{id}/start` Lambda (mirror of the worker trigger
 * route). The returned `queueJobId` is also the first worker's jobId, so the run can be watched via
 * /api/console/workers/queue-job.
 *
 * Body: { projectId, queueId, input?, jobId?, metadata?, keyOverride?, keyHeaderName?, extraHeaders?, queryParams? }
 */

type Body = {
  projectId?: string
  queueId?: string
  input?: Record<string, unknown>
  jobId?: string
  metadata?: Record<string, unknown>
  keyOverride?: string
  keyHeaderName?: string
  extraHeaders?: Record<string, string>
  queryParams?: Record<string, string>
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const projectId = (body.projectId || "").trim()
  const queueId = (body.queueId || "").trim()
  if (!queueId) return NextResponse.json({ error: "queueId is required" }, { status: 400 })

  try {
    return await startQueue(req, body, projectId, queueId)
  } catch (e) {
    // Never let an unexpected throw become an HTML 500 — the client can't parse that and the run
    // view would mount with no run id. Return structured JSON so the UI shows a clean error.
    console.error("[console/workers/queue-trigger] unhandled error", e)
    return NextResponse.json(
      { ok: false, status: 500, error: `Failed to start queue: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    )
  }
}

async function startQueue(
  req: NextRequest,
  body: Body,
  projectId: string,
  queueId: string,
): Promise<NextResponse> {
  const scope = await resolveWorkerScope(projectId)
  if (!scope.ok) return scope.response

  if (!scope.can("workers.trigger") && !scope.can("deployment.create")) {
    return NextResponse.json(
      { error: "You do not have permission to trigger queues for this project" },
      { status: 403 },
    )
  }
  if (!scope.agentBaseUrl) {
    return NextResponse.json(
      { error: "This project has no deployed core endpoint yet" },
      { status: 409 },
    )
  }

  const jobId =
    (body.jobId && String(body.jobId).trim()) ||
    `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  let key = body.keyOverride?.trim() || null
  let keySource: "manual" | "env" | "derived" | "none" = key ? "manual" : "none"
  if (!key) {
    const resolved = await resolveWorkersApiKey(projectId, scope.accessToken)
    key = resolved.key
    keySource = resolved.source
  }

  const keyHeaderName = (body.keyHeaderName || "x-workers-trigger-key").trim()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (key) headers[keyHeaderName] = key
  for (const [k, v] of Object.entries(body.extraHeaders ?? {})) {
    if (k && typeof v === "string") headers[k] = v
  }

  const url = new URL(`${scope.agentBaseUrl}/queues/${encodeURIComponent(queueId)}/start`)
  for (const [k, v] of Object.entries(body.queryParams ?? {})) {
    if (k && typeof v === "string") url.searchParams.set(k, v)
  }

  let upstream: Response
  try {
    upstream = await fetch(url.toString(), {
      method: "POST",
      headers,
      // The queue starter accepts `input`/`initialInput`, `jobId`, `metadata`.
      body: JSON.stringify({
        input: body.input ?? {},
        initialInput: body.input ?? {},
        jobId,
        // Provenance stamp — flows into the queue doc + step-0 job record, so History can show
        // the queue was started from the console by this user (vs external API / schedule).
        metadata: {
          __trigger: { type: "console", userId: scope.userId, at: new Date().toISOString() },
          ...(body.metadata ?? {}),
        },
      }),
      cache: "no-store",
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to reach queue start endpoint: ${e instanceof Error ? e.message : String(e)}` },
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

  const queueLambda = findQueueLambda(scope, queueId)
  return NextResponse.json(
    {
      ok: upstream.ok,
      status: upstream.status,
      queueJobId: jobId,
      queueId,
      keySource,
      functionName: queueLambda?.functionName ?? null,
      response: parsed,
    },
    { status: upstream.ok ? 200 : 502 },
  )
}
