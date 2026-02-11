"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConsole } from "@/components/subapps/console/context/console-context"
import {
  useAws,
  type IApiEndpoint,
  type UrlMap,
} from "@/components/subapps/console/context/aws-context"
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const timeRanges = [
  { label: "Last hour", value: 1 },
  { label: "Last 6 hours", value: 6 },
  { label: "Last 24 hours", value: 24 },
  { label: "Last 7 days", value: 168 },
  { label: "Last 30 days", value: 720 },
]

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

export function AnalyticsTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const { state: aws, loadAnalytics } = useAws()
  const [rangeHours, setRangeHours] = useState(24)
  const project = state.projects.find((p) => p.id === projectId)

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

  useEffect(() => {
    if (projectId && awsFns.length) {
      loadAnalytics(projectId, awsFns, rangeHours)
    }
  }, [projectId, awsFns, loadAnalytics, rangeHours])

  const items = aws.analyticsByProject[projectId] || []

  const overall = useMemo(() => {
    const totalInvocations = items.reduce((acc, it) => acc + (it.metrics.invocations?.reduce((a, i) => a + i.value, 0) || 0), 0)
    const totalErrors = items.reduce((acc, it) => acc + (it.metrics.errors?.reduce((a, i) => a + i.value, 0) || 0), 0)
    const avgDuration = items.length > 0
        ? items.reduce((acc, it) => acc + (it.metrics.duration?.reduce((a, i) => a + i.value, 0) || 0), 0) /
          items.reduce((acc, it) => acc + (it.metrics.duration?.length || 0), 0)
        : 0
    const successRate = totalInvocations > 0 ? ((totalInvocations - totalErrors) / totalInvocations) * 100 : 100

    return {
      totalInvocations,
      totalErrors,
      avgDuration,
      successRate,
    }
  }, [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{"AWS Lambda Analytics"}</h3>
        <div className="flex items-center gap-2">
          <Select value={String(rangeHours)} onValueChange={(v) => setRangeHours(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map(r => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline">{awsFns.length} {"function(s)"}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(projectId, awsFns, rangeHours)}
            disabled={!awsFns.length || aws.loadingAnalytics}
          >
            {"Refresh"}
          </Button>
        </div>
      </div>

      {aws.loadingAnalytics && items.length === 0 ? (
        <div className="text-muted-foreground">{"Loading analytics..."}</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">{"No AWS serverless functions found"}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Invocations" value={overall.totalInvocations} />
            <MetricCard title="Total Errors" value={overall.totalErrors} />
            <MetricCard title="Success Rate" value={`${overall.successRate.toFixed(2)}%`} />
            <MetricCard title="Avg Duration" value={`${overall.avgDuration.toFixed(2)}`} unit="ms" />
          </div>

          <div className="grid gap-6">
            {items.map((it) => {
              const invocationsData = it.metrics.invocations?.map(d => ({ timestamp: d.timestamp, Invocations: d.value, Errors: it.metrics.errors?.find(e => e.timestamp === d.timestamp)?.value ?? 0 })) || []
              const durationData = it.metrics.duration?.map(d => ({ timestamp: d.timestamp, Duration: d.value, Throttles: it.metrics.throttles?.find(t => t.timestamp === d.timestamp)?.value ?? 0 })) || []
              const concurrencyData = it.metrics.concurrentExecutions?.map(d => ({ timestamp: d.timestamp, "Concurrent Executions": d.value })) || []

              return (
                <Card key={it.ref.arn}>
                  <CardHeader>
                    <CardTitle>{it.ref.name}</CardTitle>
                    <CardDescription>
                      {it.ref.region} - { (it.ref.apiEndpoints || []).map(e => `${e.method} ${e.path}`).join(', ') || "No API endpoints" }
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
                            <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} />
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
                            <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} />
                            <YAxis yAxisId="left" label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Throttles', angle: 90, position: 'insideRight' }} />
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
                            <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleTimeString()} />
                            <YAxis />
                            <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleString()} />
                            <Legend />
                            <Line type="monotone" dataKey="Concurrent Executions" stroke="#ffc658" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {aws.analyticsError ? <div className="text-sm text-destructive mt-3">{aws.analyticsError}</div> : null}
    </div>
  )
}
