"use client"

import { useCallback, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { useAws, type UrlMap } from "@/components/subapps/console/context/aws-context"
import { beautifyFunctionName } from "@/components/subapps/console/lib/console-utils"
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCcw } from "lucide-react"

const TIME_PRESETS = [
  { label: "1h", value: 1 },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
] as const

function MetricCard({ title, value, unit }: { title: string; value: string | number; unit?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function FunctionAnalyticsCard({
  item,
}: {
  item: { ref: { name: string; region: string; apiEndpoints?: { method: string; path: string }[] }; metrics: any }
}) {
  const invocationsData =
    item.metrics.invocations?.map((d: { timestamp: number; value: number }) => ({
      timestamp: d.timestamp,
      Invocations: d.value,
      Errors:
        item.metrics.errors?.find((e: { timestamp: number }) => e.timestamp === d.timestamp)?.value ?? 0,
    })) ?? []
  const durationData =
    item.metrics.duration?.map((d: { timestamp: number; value: number }) => ({
      timestamp: d.timestamp,
      Duration: d.value,
      Throttles:
        item.metrics.throttles?.find((t: { timestamp: number }) => t.timestamp === d.timestamp)
          ?.value ?? 0,
    })) ?? []
  const concurrencyData =
    item.metrics.concurrentExecutions?.map((d: { timestamp: number; value: number }) => ({
      timestamp: d.timestamp,
      "Concurrent Executions": d.value,
    })) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{beautifyFunctionName(item.ref.name)}</CardTitle>
        <CardDescription>
          {item.ref.region} -{" "}
          {(item.ref.apiEndpoints || [])
            .map((e) => `${e.method} ${e.path}`)
            .join(", ") || "No API endpoints"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invocations">
          <TabsList>
            <TabsTrigger value="invocations">Invocations & Errors</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="concurrency">Concurrency</TabsTrigger>
          </TabsList>
          <TabsContent value="invocations">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={invocationsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="Invocations" stroke="#8884d8" dot={false} />
                <Line type="monotone" dataKey="Errors" stroke="#e53e3e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="performance">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: "Duration (ms)", angle: -90, position: "insideLeft" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: "Throttles", angle: 90, position: "insideRight" }}
                />
                <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleString()} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Duration" stroke="#8884d8" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Throttles" stroke="#82ca9d" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="concurrency">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={concurrencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleString()} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Concurrent Executions"
                  stroke="#ffc658"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export function AnalyticsTab({ projectId }: { projectId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state } = useConsole()
  const { state: aws, loadAnalytics } = useAws()
  const project = state.projects.find((p) => p.id === projectId)

  const analyticsFn = searchParams.get("analytics_fn") ?? "ALL"
  const analyticsRange = parseInt(searchParams.get("analytics_range") ?? "24", 10) || 24

  const updateParams = useCallback(
    (updates: { analytics_fn?: string; analytics_range?: number }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.analytics_fn !== undefined) params.set("analytics_fn", updates.analytics_fn)
      if (updates.analytics_range !== undefined)
        params.set("analytics_range", String(updates.analytics_range))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const awsFns = useMemo(() => {
    const urlsMap = (project?.urlsMap || []) as UrlMap[]
    const agentUrlMap = urlsMap.find((u) => u.type === "agent")
    if (!agentUrlMap?.service) return []
    const { resources } = agentUrlMap.service.providerConfig
    const arr = resources.filter((r) => r.type === "lambda")
    return arr.map((f) => ({
      arn: f.arn!,
      region: f.region || "us-east-1",
      name: f.name,
      apiEndpoints: f.apiEndpoints || [],
    }))
  }, [project])

  const sortedFns = useMemo(() => {
    return [...awsFns].sort((a, b) =>
      beautifyFunctionName(a.name).localeCompare(beautifyFunctionName(b.name)),
    )
  }, [awsFns])

  useEffect(() => {
    if (projectId && awsFns.length) {
      loadAnalytics(projectId, awsFns, analyticsRange)
    }
  }, [projectId, awsFns.length, analyticsRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => {
    loadAnalytics(projectId, awsFns, analyticsRange)
  }

  const items = aws.analyticsByProject[projectId] || []

  const overall = useMemo(() => {
    const totalInvocations = items.reduce(
      (acc, it) => acc + (it.metrics.invocations?.reduce((a, i) => a + i.value, 0) || 0),
      0,
    )
    const totalErrors = items.reduce(
      (acc, it) => acc + (it.metrics.errors?.reduce((a, i) => a + i.value, 0) || 0),
      0,
    )
    const avgDuration =
      items.length > 0
        ? items.reduce(
            (acc, it) => acc + (it.metrics.duration?.reduce((a, i) => a + i.value, 0) || 0),
            0,
          ) /
          items.reduce((acc, it) => acc + (it.metrics.duration?.length || 0), 0)
        : 0
    const successRate =
      totalInvocations > 0 ? ((totalInvocations - totalErrors) / totalInvocations) * 100 : 100
    return {
      totalInvocations,
      totalErrors,
      avgDuration,
      successRate,
    }
  }, [items])

  const displayItems = useMemo(() => {
    if (analyticsFn === "ALL") return items
    return items.filter((it) => it.ref.name === analyticsFn)
  }, [items, analyticsFn])

  const fnTabValue = analyticsFn === "ALL" ? "ALL" : analyticsFn
  const validFnTab =
    fnTabValue === "ALL" || awsFns.some((f) => f.name === fnTabValue) ? fnTabValue : "ALL"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold">AWS Lambda Analytics</h3>
        <div className="flex items-center gap-2">
          {TIME_PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={analyticsRange === p.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => updateParams({ analytics_range: p.value })}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Badge variant="outline">{awsFns.length} function(s)</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={!awsFns.length || aws.loadingAnalytics}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
        {aws.analyticsError && (
          <span className="text-sm text-destructive">{aws.analyticsError}</span>
        )}
      </div>

      {aws.loadingAnalytics && items.length === 0 ? (
        <div className="text-muted-foreground">Loading analytics...</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">No AWS serverless functions found</div>
      ) : (
        <>
          <Tabs
            value={validFnTab}
            onValueChange={(v) => updateParams({ analytics_fn: v })}
            className="w-full"
          >
            <TabsList className="flex-wrap h-auto gap-1 overflow-x-auto">
              <TabsTrigger value="ALL">All Functions</TabsTrigger>
              {sortedFns.map((f) => (
                <TabsTrigger key={f.arn} value={f.name}>
                  {beautifyFunctionName(f.name)}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={validFnTab} className="mt-4">
              {validFnTab === "ALL" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <MetricCard title="Total Invocations" value={overall.totalInvocations} />
                  <MetricCard title="Total Errors" value={overall.totalErrors} />
                  <MetricCard title="Success Rate" value={`${overall.successRate.toFixed(2)}%`} />
                  <MetricCard title="Avg Duration" value={overall.avgDuration.toFixed(2)} unit="ms" />
                </div>
              )}
              <div className="grid gap-6">
                {displayItems.map((it) => (
                  <FunctionAnalyticsCard key={it.ref.arn} item={it} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
