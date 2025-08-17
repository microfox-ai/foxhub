import { NextRequest, NextResponse } from "next/server"
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs"

type AwsFunctionRef = {
  arn: string
  region: string
  name: string
}

type LogsRequest = {
  items: AwsFunctionRef[]
  rangeHours?: number
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
  rangeHours: number,
  filterPattern?: string
) {
  try {
    const command = new FilterLogEventsCommand({
      logGroupName: `/aws/lambda/${ref.name}`,
      startTime: new Date(Date.now() - rangeHours * 3600 * 1000).getTime(),
      endTime: new Date().getTime(),
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
    const {
      items,
      rangeHours = 6,
      filterPattern,
      functionName = "ALL",
    } = (await req.json()) as LogsRequest

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Missing or invalid items array" },
        { status: 400 }
      )
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
        rangeHours,
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
