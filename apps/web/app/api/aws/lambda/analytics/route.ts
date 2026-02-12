import { NextRequest, NextResponse } from "next/server"
import {
  LambdaClient,
  GetFunctionConfigurationCommand,
  ListTagsCommand,
} from "@aws-sdk/client-lambda"
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch"

type AwsFunctionRef = {
  arn: string
  region: string
  name: string
}

// Helper to determine the optimal period for CloudWatch metrics based on the time span
function getPeriodForSpan(spanMs: number): number {
  const spanHours = spanMs / (3600 * 1000)
  if (spanHours <= 24) return 60 * 5 // 5 minutes
  if (spanHours <= 7 * 24) return 60 * 60 // 1 hour
  if (spanHours <= 30 * 24) return 60 * 60 * 6 // 6 hours
  return 60 * 60 * 24 // 1 day
}

async function getFunctionDetails(
  lambdaClient: LambdaClient,
  cloudWatchClient: CloudWatchClient,
  ref: AwsFunctionRef,
  startTime: Date,
  endTime: Date
) {
  try {
    const spanMs = endTime.getTime() - startTime.getTime()
    const period = getPeriodForSpan(spanMs)

    const [config, tags, metrics] = await Promise.all([
      lambdaClient.send(
        new GetFunctionConfigurationCommand({ FunctionName: ref.name })
      ),
      lambdaClient.send(new ListTagsCommand({ Resource: ref.arn })),
      cloudWatchClient.send(
        new GetMetricDataCommand({
          StartTime: startTime,
          EndTime: endTime,
          MetricDataQueries: [
            { Id: "invocations", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Invocations", Dimensions: [{ Name: "FunctionName", Value: ref.name }] }, Period: period, Stat: "Sum" }, ReturnData: true },
            { Id: "errors", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Errors", Dimensions: [{ Name: "FunctionName", Value: ref.name }] }, Period: period, Stat: "Sum" }, ReturnData: true },
            { Id: "throttles", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Throttles", Dimensions: [{ Name: "FunctionName", Value: ref.name }] }, Period: period, Stat: "Sum" }, ReturnData: true },
            { Id: "duration", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Duration", Dimensions: [{ Name: "FunctionName", Value: ref.name }] }, Period: period, Stat: "Average" }, ReturnData: true },
            { Id: "concurrentExecutions", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "ConcurrentExecutions", Dimensions: [{ Name: "FunctionName", Value: ref.name }] }, Period: period, Stat: "Maximum" }, ReturnData: true },
          ],
        })
      ),
    ])
    
    // Helper to transform CloudWatch data into a more usable format
    const transformMetricData = (id: string) => {
      const metric = metrics.MetricDataResults?.find((m) => m.Id === id)
      if (!metric || !metric.Timestamps || !metric.Values) return []
      return metric.Timestamps.map((t, i) => ({ timestamp: t.getTime(), value: metric.Values?.[i] || 0 })).sort((a, b) => a.timestamp - b.timestamp)
    }

    return {
      ref,
      config: {
        FunctionName: config.FunctionName,
        FunctionArn: config.FunctionArn,
        Runtime: config.Runtime,
        Handler: config.Handler,
        MemorySize: config.MemorySize,
        Timeout: config.Timeout,
        LastModified: config.LastModified,
        TracingConfig: { Mode: config.TracingConfig?.Mode },
        Architectures: config.Architectures,
        PackageType: config.PackageType,
        EphemeralStorage: { Size: config.EphemeralStorage?.Size },
        KMSKeyArn: config.KMSKeyArn,
        Environment: { Variables: config.Environment?.Variables },
        Version: config.Version,
      },
      metrics: {
        invocations: transformMetricData("invocations"),
        errors: transformMetricData("errors"),
        throttles: transformMetricData("throttles"),
        duration: transformMetricData("duration"),
        concurrentExecutions: transformMetricData("concurrentExecutions"),
      },
      tags: tags.Tags,
    }
  } catch (error) {
    console.error(`Error fetching details for ${ref.name}:`, error)
    return {
      ref,
      config: {},
      metrics: {},
      tags: {},
      error: (error as Error).message,
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      items: AwsFunctionRef[]
      rangeHours?: number
      startTime?: number
      endTime?: number
    }
    const { items, rangeHours = 24, startTime: reqStartTime, endTime: reqEndTime } = body
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing or invalid items array" }, { status: 400 })
    }

    let startTime: Date
    let endTime: Date
    if (reqStartTime != null && reqEndTime != null) {
      startTime = new Date(reqStartTime)
      endTime = new Date(reqEndTime)
    } else {
      const rangeMs = rangeHours * 3600 * 1000
      endTime = new Date()
      startTime = new Date(Date.now() - rangeMs)
    }

    const results = await Promise.all(
      items.map((ref) => {
        const lambdaClient = new LambdaClient({
          region: ref.region,
          credentials: {
            accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
          },
        })
        const cloudWatchClient = new CloudWatchClient({
          region: ref.region,
          credentials: {
            accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
          },
        })
        return getFunctionDetails(lambdaClient, cloudWatchClient, ref, startTime, endTime)
      })
    )

    return NextResponse.json({ items: results })
  } catch (error) {
    console.error("Error fetching lambda analytics:", error)
    return NextResponse.json({ error: "Failed to fetch lambda analytics" }, { status: 500 })
  }
}
