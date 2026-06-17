import { NextRequest, NextResponse } from "next/server"
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs"
import { resolveProjectLambdaScope, type ScopedFunction } from "../scope"

type AwsFunctionRef = ScopedFunction

type LogsRequest = {
  projectId: string
  rangeHours?: number
  rangeMinutes?: number
  startTime?: number
  endTime?: number
  filterPattern?: string
  functionName?: string | "ALL"
}

type CloudWatchLogEvent = {
  id?: string
  timestamp: number
  message: string
  ingestionTime?: number
}

async function getLogsForFunction(
  client: CloudWatchLogsClient,
  ref: AwsFunctionRef,
  startTime: number,
  endTime: number,
  filterPattern?: string
) {
  try {
    const command = new FilterLogEventsCommand({
      logGroupName: `/aws/lambda/${ref.name}`,
      startTime,
      endTime,
      filterPattern,
      interleaved: true,
    })
    const response = await client.send(command)
    return (
      response.events?.map(
        (e) =>
          ({
            id: e.eventId,
            timestamp: e.timestamp,
            message: e.message,
            ingestionTime: e.ingestionTime,
          } as CloudWatchLogEvent)
      ) || []
    )
  } catch (error) {
    console.error(`Error fetching logs for ${ref.name}:`, error)
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LogsRequest
    const {
      rangeHours = 6,
      rangeMinutes,
      startTime: reqStartTime,
      endTime: reqEndTime,
      filterPattern,
      functionName = "ALL",
    } = body

    // SECURITY: authenticate the caller and resolve the allowed function list server-side
    // from the project's urlsMap. Client-sent function names are never trusted.
    const scope = await resolveProjectLambdaScope(body)
    if (!scope.ok) return scope.response
    const items = scope.functions

    const now = Date.now()
    let startTime: number
    let endTime: number
    if (reqStartTime != null && reqEndTime != null) {
      startTime = reqStartTime
      endTime = reqEndTime
    } else {
      const rangeMs =
        rangeMinutes != null
          ? Math.max(60000, rangeMinutes * 60 * 1000)
          : (rangeHours ?? 6) * 3600 * 1000
      startTime = now - rangeMs
      endTime = now
    }

    const functionsToFetch =
      functionName === "ALL"
        ? items
        : items.filter((i) => i.name === functionName)

    const byFunction: Record<string, CloudWatchLogEvent[]> = {}
    const promises = functionsToFetch.map(async (ref) => {
      const client = new CloudWatchLogsClient({
        region: ref.region,
        credentials: {
          accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
        },
      })
      const logs = await getLogsForFunction(
        client,
        ref,
        startTime,
        endTime,
        filterPattern
      )
      byFunction[ref.name] = logs
    })
    await Promise.all(promises)

    const combined = Object.values(byFunction)
      .flat()
      .sort((a, b) => a.timestamp - b.timestamp)

    return NextResponse.json({ byFunction, combined })
  } catch (error) {
    console.error("Error fetching lambda logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch lambda logs" },
      { status: 500 }
    )
  }
}
