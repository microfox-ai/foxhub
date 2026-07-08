import { NextRequest, NextResponse } from "next/server"
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs"
import { resolveWorkerScope, findWorkerLambda, findQueueLambda } from "../worker-scope"

/**
 * POST /api/console/workers/logs
 *
 * Returns the ACTUAL worker (or trigger) Lambda's CloudWatch logs for a specific run. Our jobIds are
 * custom (not the AWS requestId), so a jobId substring filter would only return the *lines that
 * mention* the jobId — not the full invocation. Instead we correlate precisely:
 *
 *   1. Find the authoritative marker line `[AIWORKER_RUN]|[AIWORKER_TRIGGER] {jobId, awsRequestId}`
 *      emitted by the handler → map our jobId → the Lambda's requestId (+ its log stream).
 *   2. Pull that stream's events around the marker and slice the contiguous
 *      `START RequestId: <id> … REPORT RequestId: <id>` block — the EXACT invocation batch.
 *
 * Falls back to a jobId substring filter when no marker is found (older deploys), and returns the
 * whole recent window when no jobId is given.
 *
 * Body: { projectId, workerId? | functionName?, target?, jobId?, startTime?, endTime?, rangeMinutes?, filterPattern? }
 */

type CWEvent = { eventId?: string; timestamp?: number; message?: string; ingestionTime?: number; logStreamName?: string }
type OutEvent = { id?: string; timestamp?: number; message?: string; ingestionTime?: number }

const RUN_MARKER = /\[AIWORKER_(?:RUN|TRIGGER)\]\s*(\{.*\})/

function mapEvent(e: CWEvent): OutEvent {
  return { id: e.eventId, timestamp: e.timestamp, message: e.message, ingestionTime: e.ingestionTime }
}

/** Slice the contiguous block for one invocation from a single stream's (time-sorted) events. */
function extractRequestBlock(events: CWEvent[], requestId: string): CWEvent[] {
  const startIdx = events.findIndex((e) => e.message?.includes(`START RequestId: ${requestId}`))
  if (startIdx === -1) {
    // No START line in the window — best effort: lines mentioning the requestId, else everything.
    const byId = events.filter((e) => e.message?.includes(requestId))
    return byId.length ? byId : events
  }
  let endIdx = events.findIndex(
    (e, i) => i > startIdx && e.message?.includes(`REPORT RequestId: ${requestId}`),
  )
  if (endIdx === -1) endIdx = events.length - 1
  return events.slice(startIdx, endIdx + 1)
}

type LogsBody = {
  projectId?: string
  workerId?: string
  functionName?: string
  /** "trigger" → workers/trigger Lambda; "queue" → a queue-starter Lambda (needs queueId); else worker. */
  target?: "worker" | "trigger" | "queue"
  /** Required when target === "queue": the queue id whose starter Lambda's logs to fetch. */
  queueId?: string
  jobId?: string
  startTime?: number
  endTime?: number
  rangeMinutes?: number
  filterPattern?: string
}

export async function POST(req: NextRequest) {
  let body: LogsBody
  try {
    body = (await req.json()) as LogsBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const scope = await resolveWorkerScope((body.projectId || "").trim())
  if (!scope.ok) return scope.response

  if (
    !scope.can("workers.view") &&
    !scope.can("deployment.logs.view") &&
    !scope.can("observability.view")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to view worker logs for this project" },
      { status: 403 },
    )
  }

  // Resolve the target Lambda — never trust a client-sent function name beyond matching it
  // against the in-scope Lambdas resolved server-side from the project's urlsMap.
  let target =
    body.target === "trigger"
      ? scope.triggerLambda ?? undefined
      : body.target === "queue"
        ? body.queueId
          ? findQueueLambda(scope, body.queueId)
          : scope.queueLambdas.find((l) => l.functionName === body.functionName)
        : body.functionName
          ? scope.workerLambdas.find((l) => l.functionName === body.functionName) ??
            scope.queueLambdas.find((l) => l.functionName === body.functionName) ??
            (scope.triggerLambda?.functionName === body.functionName ? scope.triggerLambda : undefined)
          : body.workerId
            ? findWorkerLambda(scope, body.workerId)
            : undefined

  if (!target) {
    return NextResponse.json(
      { error: "Worker Lambda not found for this project (not deployed yet?)" },
      { status: 404 },
    )
  }

  const now = Date.now()
  let startTime: number
  let endTime: number
  if (body.startTime != null && body.endTime != null) {
    startTime = body.startTime
    endTime = body.endTime
  } else {
    const rangeMs = Math.max(60000, (body.rangeMinutes ?? 60) * 60 * 1000)
    startTime = now - rangeMs
    endTime = now
  }

  const logGroupName = `/aws/lambda/${target.functionName}`
  const jobId = body.jobId?.trim()
  const userFilter = body.filterPattern?.trim()

  const client = new CloudWatchLogsClient({
    region: target.region,
    credentials: {
      accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
    },
  })

  const sortByTime = (a: CWEvent, b: CWEvent) =>
    (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.ingestionTime ?? 0) - (b.ingestionTime ?? 0)

  try {
    let events: CWEvent[]

    if (!jobId) {
      // No specific run — return the recent window (optionally user-filtered).
      const res = await client.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime,
          endTime,
          filterPattern: userFilter || undefined,
          interleaved: true,
        }),
      )
      events = (res.events ?? []).slice().sort(sortByTime)
    } else {
      // Step 1: find the jobId↔requestId marker(s) to learn which invocation(s) to pull.
      const markerRes = await client.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime,
          endTime,
          filterPattern: `"${jobId}"`,
          interleaved: true,
        }),
      )
      const markerEvents = markerRes.events ?? []
      const invocations = new Map<string, { requestId: string; stream: string; ts: number }>()
      for (const e of markerEvents) {
        const m = e.message?.match(RUN_MARKER)
        if (!m || !m[1]) continue
        try {
          const o = JSON.parse(m[1]) as { jobId?: string; awsRequestId?: string }
          if (o.jobId === jobId && o.awsRequestId && e.logStreamName && !invocations.has(o.awsRequestId)) {
            invocations.set(o.awsRequestId, {
              requestId: o.awsRequestId,
              stream: e.logStreamName,
              ts: e.timestamp ?? now,
            })
          }
        } catch {
          // ignore malformed marker
        }
      }

      if (invocations.size === 0) {
        // Fallback (older deploy without the marker): the substring-filtered lines, best effort.
        events = (markerEvents as CWEvent[]).slice().sort(sortByTime)
      } else {
        // Step 2: for each invocation, pull its stream window and slice the START..REPORT block.
        const collected: CWEvent[] = []
        for (const inv of invocations.values()) {
          const batch = await client.send(
            new FilterLogEventsCommand({
              logGroupName,
              logStreamNames: [inv.stream],
              startTime: inv.ts - 5 * 60 * 1000,
              endTime: inv.ts + 16 * 60 * 1000, // Lambda max duration is 15 min
              interleaved: true,
            }),
          )
          const streamEvents = (batch.events ?? []).slice().sort(sortByTime)
          collected.push(...extractRequestBlock(streamEvents, inv.requestId))
        }
        // De-dupe across invocations and sort.
        const seen = new Set<string>()
        events = collected
          .filter((e) => {
            const k = e.eventId ?? `${e.timestamp}:${e.message}`
            if (seen.has(k)) return false
            seen.add(k)
            return true
          })
          .sort(sortByTime)
      }
    }

    // Apply an optional user text filter client-side (keeps the full invocation context intact).
    if (userFilter) {
      const needle = userFilter.toLowerCase()
      events = events.filter((e) => e.message?.toLowerCase().includes(needle))
    }

    return NextResponse.json({ functionName: target.functionName, events: events.map(mapEvent) })
  } catch (error) {
    // A missing log group means the worker hasn't run yet — return empty, not an error.
    const name = (error as { name?: string })?.name
    if (name === "ResourceNotFoundException") {
      return NextResponse.json({ functionName: target.functionName, events: [] })
    }
    console.error(`Error fetching worker logs for ${target.functionName}:`, error)
    return NextResponse.json({ error: "Failed to fetch worker logs" }, { status: 500 })
  }
}
