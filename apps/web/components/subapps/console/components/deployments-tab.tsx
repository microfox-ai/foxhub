"use client"

import { useEffect, useMemo, useState } from "react"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Upload, RefreshCcw, Pause, Archive, LinkIcon } from "lucide-react"
import { LogsViewer } from "./logs-viewer"
import type { DeploymentDto } from "@/components/subapps/console/lib/console-api"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"

const TimingPieChart = ({ data, chartConfig, title }: { data: any[], chartConfig: ChartConfig, title: string }) => (
    <Card className="flex flex-col">
        <CardHeader className="items-center p-4 pb-0">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-full max-h-[150px]"
            >
                <ResponsiveContainer>
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={30}
                            outerRadius={50}
                            strokeWidth={2}
                        >
                            {data.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_')})`} />
                            ))}
                        </Pie>
                        <ChartLegend
                            content={<ChartLegendContent nameKey="name" />}
                            className="flex-wrap gap-x-4 gap-y-1 [&>*]:basis-auto [&>*]:justify-center"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
    </Card>
);

const MetricsChart = ({ data, chartConfig, title }: { data: any[], chartConfig: ChartConfig, title:string }) => (
    <Card>
        <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="value" radius={4}>
                            {data.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name.toLowerCase().replace(/ /g, '_').replace(/-/g, '_')})`} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
    </Card>
);

export function DeploymentsTab({ projectId }: { projectId: string }) {
  const {
    state,
    loadProjectDeployments,
    refreshDeployment,
    refreshLogs,
    startLocalDeployment,
    stopDeployment,
    archiveDeployment,
    setAutoRefresh,
  } = useConsole()

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const deployments = state.deployments

  useEffect(() => {
    loadProjectDeployments()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId && deployments.length > 0) {
      setSelectedId(deployments[0]?._id)
    }
  }, [deployments, selectedId])

  useEffect(() => {
    if (selectedId) {
      refreshDeployment(selectedId)
      refreshLogs(selectedId)
    }
  }, [selectedId, refreshDeployment, refreshLogs])

  const current: DeploymentDto | null | undefined = state.currentDeployment
  const status = current?.status ?? "unknown"

  const onUpload = async (file?: File | null) => {
    if (!file) return
    await startLocalDeployment(file)
  }

  const duration = useMemo(() => {
    const start = current?.metrics?.timing?.startTime ? new Date(current?.metrics?.timing?.startTime).getTime() : undefined
    const end = current?.metrics?.timing?.endTime ? new Date(current?.metrics?.timing?.endTime).getTime() : Date.now()
    if (!start) return undefined
    const ms = current?.metrics?.timing?.endTime ? end - start : current?.metrics?.timing?.totalDurationMs ?? 0
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }, [current])

  const metricsData = useMemo(() => {
    if (!current?.metrics) return null;

    return {
        timing: [
            { name: "Compiling", value: (current.metrics.timing?.stepDurationsMs?.compiling || 0) / 1000 },
            { name: "Deploying", value: (current.metrics.timing?.stepDurationsMs?.deploying || 0) / 1000 },
            { name: "Post-deployment", value: (current.metrics.timing?.stepDurationsMs?.post_deployment || 0) / 1000 },
        ],
        cpu: [
            { name: "Peak", value: current.metrics.resources?.cpu?.peakPercent || 0 },
            { name: "Average", value: current.metrics.resources?.cpu?.averagePercent || 0 },
        ],
        memory: [
            { name: "Peak", value: current.metrics.resources?.memory?.peakMb || 0 },
            { name: "Average", value: current.metrics.resources?.memory?.averageMb || 0 },
        ],
        disk: [
            { name: "Image Size", value: current.metrics.resources?.disk?.imageSizeMb || 0 },
        ],
        network: [
            { name: "Ingress", value: current.metrics.network?.deploymentDataTransfer?.ingressMb || 0 },
            { name: "Egress", value: current.metrics.network?.deploymentDataTransfer?.egressMb || 0 },
        ],
    };
  }, [current]);

  const chartConfig = {
    value: {
        label: "Value",
    },
    compiling: {
        label: "Compiling",
        color: "var(--color-chart-1)",
    },
    deploying: {
        label: "Deploying",
        color: "var(--color-chart-2)",
    },
    post_deployment: {
        label: "Post-deployment",
        color: "var(--color-chart-3)",
    },
    peak: {
        label: "Peak",
        color: "var(--color-chart-4)",
    },
    average: {
        label: "Average",
        color: "var(--color-chart-5)",
    },
    image_size: {
        label: "Image Size",
        color: "var(--color-chart-1)",
    },
    ingress: {
        label: "Ingress",
        color: "var(--color-chart-2)",
    },
    egress: {
        label: "Egress",
        color: "var(--color-chart-3)",
    },
  } satisfies ChartConfig

  return (
    <div className="grid grid-cols-1">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base">{"Deployments"}</CardTitle>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => onUpload(e.currentTarget.files?.[0])}
              />
              <Button variant="secondary" size="sm" asChild>
                <span>
                  <Upload className="mr-2 size-4" />
                  {"Start local deployment"}
                </span>
              </Button>
            </label>
            <Button variant="outline" size="sm" onClick={() => loadProjectDeployments()}>
              <RefreshCcw className="mr-2 size-4" />
              {"Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
                {deployments?.length === 0 ? (
                    <div className="p-4 text-muted-foreground">{"No deployments yet"}</div>
                ) : (
                    deployments?.map((d) => (
                        <AccordionItem value={d?._id} key={d?._id} className="border-b">
                            <AccordionTrigger onClick={() => setSelectedId(d?._id)} className={`w-full text-left hover:no-underline ${d?._id === selectedId ? "bg-muted hover:bg-muted" : "hover:bg-muted/50"} px-4 py-3 transition-colors`}>
                                <div className="grid grid-cols-4 w-full items-center text-sm gap-4">
                                    <div className="font-mono text-xs truncate" title={d?._id}>{d?._id}</div>
                                    <div className="text-center">
                                        <Badge
                                            variant={
                                            d?.status === "completed" ? "secondary" : d?.status === "failed" ? "destructive" : "outline"
                                            }
                                        >
                                            {String(d?.status)}
                                        </Badge>
                                    </div>
                                    <div className="text-left">{new Date(d?.createdAt).toLocaleString()}</div>
                                    <div className="text-right">
                                    {d?.metrics?.timing?.startTime
                                        ? (() => {
                                            const start = new Date(d?.metrics?.timing?.startTime).getTime()
                                            const end = d?.metrics?.timing?.endTime
                                                ? new Date(d?.metrics?.timing?.endTime).getTime()
                                                : Date.now()
                                            const ms = d?.metrics?.timing?.endTime ? end - start : d?.metrics?.timing?.totalDurationMs
                                            const mins = Math.floor(ms / 60000)
                                            const secs = Math.floor((ms % 60000) / 1000)
                                            return `${mins}m ${secs}s`
                                        })()
                                        : "—"}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                 <div className="p-4 bg-background border-t flex flex-col gap-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                         <div className="flex flex-col gap-3">
                                              <div className="flex items-center justify-between text-sm">
                                                  <span>{"Status"}</span>
                                                  <Badge variant={status === "completed" ? "secondary" : status === "failed" ? "destructive" : "outline"}>
                                                      {String(status)}
                                                  </Badge>
                                              </div>
                                              <div className="flex items-center justify-between text-sm">
                                                  <span>{"Started"}</span>
                                                  <span>{current?.createdAt ? new Date(current?.createdAt).toLocaleString() : "—"}</span>
                                              </div>
                                              <div className="flex items-center justify-between text-sm">
                                                  <span>{"Duration"}</span>
                                                  <span>{duration ?? "—"}</span>
                                              </div>
                                              <div className="flex items-center justify-between text-sm">
                                                  <span>{"URL"}</span>
                                                  <span className="flex justify-end items-center gap-2 text-right">
                                                  {current?.baseUrl ? (
                                                      <a
                                                      href={current?.baseUrl}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="text-primary hover:underline inline-flex items-center gap-1 w-full"
                                                      >
                                                      {current?.baseUrl}
                                                      </a>
                                                  ) : (
                                                      "—"
                                                  )}
                                                  </span>
                                              </div>
                                         </div>
                                         <div className="flex flex-wrap gap-2 items-start">
                                              <Button variant="outline" size="sm" onClick={() => refreshLogs(current?._id)}>
                                                  <RefreshCcw className="mr-2 size-4" />
                                                  {"Refresh logs"}
                                              </Button>
                                              {status === "compiling" || status === "deploying" || status === "post_deployment" ? (
                                                  <Button variant="outline" size="sm" onClick={() => stopDeployment(current?._id)}>
                                                      <Pause className="mr-2 size-4" />
                                                      {"Stop"}
                                                  </Button>
                                              ) : null}
                                              <Button
                                                  variant={state.autoRefresh ? "secondary" : "outline"}
                                                  size="sm"
                                                  onClick={() => setAutoRefresh(!state.autoRefresh)}
                                              >
                                                  {state.autoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}
                                              </Button>
                                         </div>
                                     </div>

                                     <div>
                                         <h3 className="text-base font-semibold mb-2">Logs</h3>
                                         <div className="h-full">
                                             <LogsViewer logs={state.currentLogs} />
                                         </div>
                                     </div>

                                     {metricsData &&<div>
                                         <h3 className="text-base font-semibold mb-2">Metrics</h3>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                             {/* <TimingPieChart data={metricsData?.timing} chartConfig={chartConfig} title="Timing (s)" /> */}
                                             <MetricsChart data={metricsData?.cpu} chartConfig={chartConfig} title="CPU (%)" />
                                             <MetricsChart data={metricsData?.memory} chartConfig={chartConfig} title="Memory (MB)" />
                                             <MetricsChart data={metricsData?.disk} chartConfig={chartConfig} title="Disk (MB)" />
                                             {/* <MetricsChart data={metricsData.network} chartConfig={chartConfig} title="Network (MB)" /> */}
                                         </div>
                                     </div>}
                                 </div>
                            </AccordionContent>
                        </AccordionItem>
                    )})
                )}
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
