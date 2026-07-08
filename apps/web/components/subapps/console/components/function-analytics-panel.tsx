"use client"

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts"

type LambdaMetrics = {
  invocations?: { timestamp: number; value: number }[]
  errors?: { timestamp: number; value: number }[]
  throttles?: { timestamp: number; value: number }[]
  duration?: { timestamp: number; value: number }[]
  concurrentExecutions?: { timestamp: number; value: number }[]
}

type DataPoint = {
  timestamp: number
  Invocations?: number
  Errors?: number
  Duration?: number
  Throttles?: number
  "Concurrent Executions"?: number
}

type FunctionAnalyticsPanelProps = {
  metrics: LambdaMetrics
  periodMs?: number
  onDataPointClick?: (start: number, end: number) => void
  highlightTimeRange?: { start: number; end: number } | null
}

function hasNonZeroValue(p: DataPoint): boolean {
  return (
    (p.Invocations != null && p.Invocations > 0) ||
    (p.Errors != null && p.Errors > 0) ||
    (p.Duration != null && p.Duration > 0) ||
    (p.Throttles != null && p.Throttles > 0) ||
    (p["Concurrent Executions"] != null && p["Concurrent Executions"] > 0)
  )
}

function createDotProps(
  periodMs: number,
  onDataPointClick: (start: number, end: number) => void
) {
  return (props: { payload?: DataPoint; cx?: number; cy?: number }) => {
    const { payload, cx = 0, cy = 0 } = props
    if (!payload?.timestamp || !hasNonZeroValue(payload))
      return <g />
    const half = periodMs / 2
    const handleClick = () => {
      onDataPointClick(payload.timestamp - half, payload.timestamp + half)
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onClick={handleClick}
      />
    )
  }
}

export function FunctionAnalyticsPanel({
  metrics,
  periodMs = 5 * 60 * 1000,
  onDataPointClick,
  highlightTimeRange,
}: FunctionAnalyticsPanelProps) {
  const invocationsData =
    metrics.invocations?.map((d) => ({
      timestamp: d.timestamp,
      Invocations: d.value,
      Errors:
        metrics.errors?.find((e) => e.timestamp === d.timestamp)?.value ?? 0,
    })) ?? []
  const durationData =
    metrics.duration?.map((d) => ({
      timestamp: d.timestamp,
      Duration: d.value,
      Throttles:
        metrics.throttles?.find((t) => t.timestamp === d.timestamp)?.value ?? 0,
    })) ?? []
  const concurrencyData =
    metrics.concurrentExecutions?.map((d) => ({
      timestamp: d.timestamp,
      "Concurrent Executions": d.value,
    })) ?? []

  const dotProps = onDataPointClick
    ? createDotProps(periodMs, onDataPointClick)
    : undefined

  const chartHeight = 200

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Invocations & Errors
        </p>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={invocationsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {highlightTimeRange && (
              <ReferenceArea
                x1={highlightTimeRange.start}
                x2={highlightTimeRange.end}
                strokeOpacity={0.2}
                fill="#8884d8"
              />
            )}
            <Line
              type="monotone"
              dataKey="Invocations"
              stroke="#8884d8"
              dot={dotProps ?? false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Errors"
              stroke="#e53e3e"
              dot={dotProps ?? false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Performance
        </p>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={durationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              yAxisId="left"
              label={{
                value: "Duration (ms)",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
              }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: "Throttles",
                angle: 90,
                position: "insideRight",
                fontSize: 10,
              }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {highlightTimeRange && (
              <ReferenceArea
                x1={highlightTimeRange.start}
                x2={highlightTimeRange.end}
                strokeOpacity={0.2}
                fill="#8884d8"
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Duration"
              stroke="#8884d8"
              dot={dotProps ?? false}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Throttles"
              stroke="#82ca9d"
              dot={dotProps ?? false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Concurrency
        </p>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={concurrencyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {highlightTimeRange && (
              <ReferenceArea
                x1={highlightTimeRange.start}
                x2={highlightTimeRange.end}
                strokeOpacity={0.2}
                fill="#ffc658"
              />
            )}
            <Line
              type="monotone"
              dataKey="Concurrent Executions"
              stroke="#ffc658"
              dot={dotProps ?? false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
