import { NextRequest, NextResponse } from "next/server"
import {
  resolveWorkerScope,
  resolveWorkersApiKey,
  findWorkerLambda,
} from "../worker-scope"

/**
 * POST /api/console/workers/trigger
 *
 * Triggers a single worker through the core `POST /workers/trigger` Lambda (the only entry
 * point — workers have no individual API gateway; the trigger Lambda fans the message out to
 * the worker's SQS queue). This server route resolves the worker-endpoint API key so it never
 * touches the browser, but the caller MAY override the key/headers/query for a Postman-style
 * manual request.
 *
 * Body:
 *   projectId      (required)
 *   workerId       (required)
 *   input          domain input object (validated by the worker Lambda); ignored if `rawBody` set
 *   rawBody        full SQS message body override (object) — replaces the generated envelope
 *   jobId          optional client-supplied job id (else generated; used for log correlation)
 *   webhookUrl, metadata, context   optional envelope fields
 *   keyOverride    optional explicit key (manual mode); wins over the resolved key
 *   keyHeaderName  header to send the key on (default: x-workers-trigger-key)
 *   extraHeaders   { [name]: value } additional request headers (Postman-style)
 *   queryParams    { [name]: value } additional query-string params
 */

type TriggerBody = {
  projectId?: string
  workerId?: string
  input?: Record<string, unknown>
  rawBody?: Record<string, unknown>
  jobId?: string
  webhookUrl?: string
  metadata?: Record<string, unknown>
  context?: Record<string, unknown>
  keyOverride?: string
  keyHeaderName?: string
  extraHeaders?: Record<string, string>
  queryParams?: Record<string, string>
}

export async function POST(req: NextRequest) {
  let body: TriggerBody
  try {
    body = (await req.json()) as TriggerBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const projectId = (body.projectId || "").trim()
  const workerId = (body.workerId || "").trim()
  if (!workerId) return NextResponse.json({ error: "workerId is required" }, { status: 400 })

  const scope = await resolveWorkerScope(projectId)
  if (!scope.ok) return scope.response

  // Prefer the dedicated workers.trigger permission; fall back to deployment.create for
  // members configured before workers.* existed.
  if (!scope.can("workers.trigger") && !scope.can("deployment.create")) {
    return NextResponse.json(
      { error: "You do not have permission to trigger workers for this project" },
      { status: 403 },
    )
  }
  if (!scope.agentBaseUrl) {
    return NextResponse.json(
      { error: "This project has no deployed core worker endpoint yet" },
      { status: 409 },
    )
  }

  const jobId =
    (body.jobId && String(body.jobId).trim()) ||
    `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  // Build the SQS message body the worker Lambda expects, mirroring @microfox/ai-worker's
  // dispatch(). A `rawBody` override lets advanced users send an arbitrary message body.
  const messageBody =
    body.rawBody && typeof body.rawBody === "object"
      ? body.rawBody
      : {
          workerId,
          jobId,
          input: body.input ?? {},
          context: body.context ?? {},
          webhookUrl: body.webhookUrl,
          // Provenance stamp: persisted verbatim into the job record's metadata by the runtime,
          // so History can show "triggered from the console by <user>" (vs external API / worker /
          // queue). A caller-supplied __trigger in metadata wins.
          metadata: {
            __trigger: { type: "console", userId: scope.userId, at: new Date().toISOString() },
            ...(body.metadata ?? {}),
          },
          timestamp: new Date().toISOString(),
        }

  // Resolve the worker-endpoint key (manual override wins, else env → derived).
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

  const url = new URL(`${scope.agentBaseUrl}/workers/trigger`)
  for (const [k, v] of Object.entries(body.queryParams ?? {})) {
    if (k && typeof v === "string") url.searchParams.set(k, v)
  }

  let upstream: Response
  try {
    upstream = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({ workerId, body: messageBody }),
      cache: "no-store",
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to reach worker trigger endpoint: ${e instanceof Error ? e.message : String(e)}` },
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

  const lambda = findWorkerLambda(scope, workerId)
  return NextResponse.json(
    {
      ok: upstream.ok,
      status: upstream.status,
      jobId,
      workerId,
      keySource,
      // The deployed worker Lambda so the UI can stream its logs, filtered by this jobId.
      functionName: lambda?.functionName ?? null,
      region: lambda?.region ?? null,
      // The trigger Lambda's response (messageId / queueName / error).
      response: parsed,
    },
    { status: upstream.ok ? 200 : 502 },
  )
}
