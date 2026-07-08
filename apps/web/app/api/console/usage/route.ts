import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, GetFunctionConfigurationCommand } from "@aws-sdk/client-lambda"
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch"
import { resolveProjectLambdaScope, type ScopedFunction } from "../../aws/lambda/scope"

/**
 * POST /api/console/usage
 *
 * Per-function / per-group / whole-project Lambda usage + ESTIMATED cost over an interval, for the
 * console's Monitoring → Usage page. Pulls AWS/Lambda CloudWatch metrics (Invocations, Errors,
 * Duration Sum, ConcurrentExecutions) via GetMetricData and each function's MemorySize via
 * GetFunctionConfiguration, then estimates cost from public Lambda pricing:
 *   request cost = invocations × $/request
 *   compute cost = GB-seconds × $/GB-s   (GB-seconds = Σ duration[s] × memory[GB])
 *
 * ⚠ Cost is an ESTIMATE (region-default pricing, ignores free tier / provisioned concurrency /
 * ephemeral storage). It is NOT your AWS bill. Function list + group scope are resolved server-side.
 *
 * Body: { projectId, rangeHours?, startTime?, endTime? }
 */

// us-east-1 on-demand Lambda pricing (USD). Estimate only — varies by region.
const REQUEST_USD = 0.2 / 1_000_000 // $0.20 per 1M requests
const GB_SECOND_USD_X86 = 0.0000166667
const GB_SECOND_USD_ARM = 0.0000133334

function periodForSpan(spanMs: number): number {
  const h = spanMs / 3_600_000
  if (h <= 24) return 300 // 5 min
  if (h <= 7 * 24) return 3600 // 1 h
  if (h <= 30 * 24) return 21600 // 6 h
  return 86400 // 1 day
}

function beautify(name: string): string {
  // Mirror the console's beautifyFunctionName (rightmost stage token → next segment).
  const STAGE = ["prod", "dev", "staging", "test", "uat"]
  const parts = name.split("-")
  let idx = -1
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    if (STAGE.includes((parts[i] ?? "").toLowerCase())) {
      idx = i
      break
    }
  }
  const logical = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1] ?? name
  return (logical ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ")
}

type FnUsage = {
  name: string
  beautifiedName: string
  group: string
  region: string
  memoryMb: number
  arch: "x86_64" | "arm64"
  invocations: number
  errors: number
  gbSeconds: number
  avgDurationMs: number
  maxConcurrent: number
  estCostUsd: number
}

type Bucket = { timestamp: number; invocations: number; gbSeconds: number; estCostUsd: number }

async function fetchFnUsage(
  lambda: LambdaClient,
  cw: CloudWatchClient,
  ref: ScopedFunction,
  startTime: Date,
  endTime: Date,
  period: number,
  timeline: Map<number, Bucket>,
): Promise<FnUsage> {
  let memoryMb = 128
  let arch: "x86_64" | "arm64" = "x86_64"
  try {
    const cfg = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: ref.name }))
    if (cfg.MemorySize) memoryMb = cfg.MemorySize
    if (cfg.Architectures?.[0] === "arm64") arch = "arm64"
  } catch {
    /* keep defaults */
  }
  const gbPrice = arch === "arm64" ? GB_SECOND_USD_ARM : GB_SECOND_USD_X86
  const memGb = memoryMb / 1024

  const dims = [{ Name: "FunctionName", Value: ref.name }]
  let res
  try {
    res = await cw.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          { Id: "inv", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Invocations", Dimensions: dims }, Period: period, Stat: "Sum" }, ReturnData: true },
          { Id: "err", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Errors", Dimensions: dims }, Period: period, Stat: "Sum" }, ReturnData: true },
          { Id: "durSum", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Duration", Dimensions: dims }, Period: period, Stat: "Sum" }, ReturnData: true },
          { Id: "conc", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "ConcurrentExecutions", Dimensions: dims }, Period: period, Stat: "Maximum" }, ReturnData: true },
        ],
      }),
    )
  } catch {
    return {
      name: ref.name, beautifiedName: beautify(ref.name), group: ref.group || "default",
      region: ref.region, memoryMb, arch, invocations: 0, errors: 0, gbSeconds: 0,
      avgDurationMs: 0, maxConcurrent: 0, estCostUsd: 0,
    }
  }

  const series = (id: string) => res!.MetricDataResults?.find((m) => m.Id === id)
  const inv = series("inv")
  const durSum = series("durSum")
  const conc = series("conc")

  let invocations = 0
  let durationSumMs = 0
  let errors = 0
  let maxConcurrent = 0
  for (const v of inv?.Values ?? []) invocations += v || 0
  for (const v of series("err")?.Values ?? []) errors += v || 0
  for (const v of durSum?.Values ?? []) durationSumMs += v || 0
  for (const v of conc?.Values ?? []) maxConcurrent = Math.max(maxConcurrent, v || 0)

  const gbSeconds = (durationSumMs / 1000) * memGb
  const estCostUsd = invocations * REQUEST_USD + gbSeconds * gbPrice
  const avgDurationMs = invocations > 0 ? durationSumMs / invocations : 0

  // Fold per-bucket contributions into the shared project timeline (aligned by period timestamp).
  const ts = inv?.Timestamps ?? durSum?.Timestamps ?? []
  for (let i = 0; i < ts.length; i += 1) {
    const t = ts[i]!.getTime()
    const invB = inv?.Values?.[i] ?? 0
    const durB = durSum?.Values?.[i] ?? 0
    const gbB = (durB / 1000) * memGb
    const costB = invB * REQUEST_USD + gbB * gbPrice
    const b = timeline.get(t) ?? { timestamp: t, invocations: 0, gbSeconds: 0, estCostUsd: 0 }
    b.invocations += invB
    b.gbSeconds += gbB
    b.estCostUsd += costB
    timeline.set(t, b)
  }

  return {
    name: ref.name, beautifiedName: beautify(ref.name), group: ref.group || "default",
    region: ref.region, memoryMb, arch, invocations, errors, gbSeconds, avgDurationMs,
    maxConcurrent, estCostUsd,
  }
}

export async function POST(req: NextRequest) {
  let body: { projectId?: string; rangeHours?: number; startTime?: number; endTime?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const scope = await resolveProjectLambdaScope(body)
  if (!scope.ok) return scope.response
  const fns = scope.functions

  let startTime: Date
  let endTime: Date
  if (body.startTime != null && body.endTime != null) {
    startTime = new Date(body.startTime)
    endTime = new Date(body.endTime)
  } else {
    endTime = new Date()
    startTime = new Date(Date.now() - (body.rangeHours ?? 24) * 3_600_000)
  }
  const period = periodForSpan(endTime.getTime() - startTime.getTime())

  const timeline = new Map<number, Bucket>()
  const byFunction = await Promise.all(
    fns.map((ref) => {
      const creds = {
        accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
      }
      const lambda = new LambdaClient({ region: ref.region, credentials: creds })
      const cw = new CloudWatchClient({ region: ref.region, credentials: creds })
      return fetchFnUsage(lambda, cw, ref, startTime, endTime, period, timeline)
    }),
  )

  // Roll up per group.
  const groupMap = new Map<string, { group: string; invocations: number; errors: number; gbSeconds: number; estCostUsd: number; functions: number }>()
  for (const f of byFunction) {
    const g = groupMap.get(f.group) ?? { group: f.group, invocations: 0, errors: 0, gbSeconds: 0, estCostUsd: 0, functions: 0 }
    g.invocations += f.invocations
    g.errors += f.errors
    g.gbSeconds += f.gbSeconds
    g.estCostUsd += f.estCostUsd
    g.functions += 1
    groupMap.set(f.group, g)
  }

  const totals = byFunction.reduce(
    (acc, f) => {
      acc.invocations += f.invocations
      acc.errors += f.errors
      acc.gbSeconds += f.gbSeconds
      acc.estCostUsd += f.estCostUsd
      return acc
    },
    { invocations: 0, errors: 0, gbSeconds: 0, estCostUsd: 0 },
  )

  return NextResponse.json({
    estimated: true,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    period,
    totals,
    byFunction: byFunction.sort((a, b) => b.estCostUsd - a.estCostUsd),
    byGroup: Array.from(groupMap.values()).sort((a, b) => b.estCostUsd - a.estCostUsd),
    timeline: Array.from(timeline.values()).sort((a, b) => a.timestamp - b.timestamp),
    pricing: { requestUsdPerMillion: 0.2, gbSecondUsdX86: GB_SECOND_USD_X86, gbSecondUsdArm: GB_SECOND_USD_ARM, note: "Estimate using us-east-1 on-demand pricing; excludes free tier, provisioned concurrency, and ephemeral storage." },
  })
}
