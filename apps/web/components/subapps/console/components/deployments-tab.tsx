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

const MetricItem = ({ label, value, unit }: { label: string; value?: number; unit?: string }) => (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span>{value ? `${value.toFixed(2)} ${unit || ""}`.trim() : "—"}</span>
    </div>
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
                        <AccordionItem value={d?._id} key={d?._id} className={`cursor-pointer`}>
                            <AccordionTrigger onClick={() => setSelectedId(d?._id)} className={`${d?._id === selectedId ? "bg-muted/80 hover:bg-muted/80" : ""} px-3`}>
                                <Table className="w-full">
                                <TableBody>
                                <TableRow
                                    key={d._id}
                                >
                                    <TableCell className="font-mono text-xs">{d?._id}</TableCell>
                                    <TableCell>
                                    <Badge
                                        variant={
                                        d?.status === "completed" ? "secondary" : d?.status === "failed" ? "destructive" : "outline"
                                        }
                                    >
                                        {String(d?.status)}
                                    </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(d?.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                </TableRow>
                                </TableBody>
                                </Table>
                            </AccordionTrigger>
                            <AccordionContent>
                                 <div className="p-4 bg-muted/50 b-2 rounded-b-2xl">
                                    <ResizablePanelGroup direction="horizontal">
                                        <ResizablePanel defaultSize={75}>
                                            <LogsViewer logs={state.currentLogs} />
                                        </ResizablePanel>
                                        <ResizableHandle withHandle className="bg-muted/50" />
                                        <ResizablePanel defaultSize={25}>
                                            <div className="bg-muted/50 p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm">{"Status"}</div>
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

                                                <Accordion type="single" collapsible className="w-full">
                                                    <AccordionItem value="metrics">
                                                        <AccordionTrigger>Metrics</AccordionTrigger>
                                                        <AccordionContent>
                                                        <div className="space-y-2">
                                                            <div className="font-semibold text-sm">Timing</div>
                                                            <MetricItem label="Compiling" value={current?.metrics?.timing?.stepDurationsMs?.compiling} unit="ms" />
                                                            <MetricItem label="Deploying" value={current?.metrics?.timing?.stepDurationsMs?.deploying} unit="ms" />
                                                            <MetricItem label="Post-deployment" value={current?.metrics?.timing?.stepDurationsMs?.post_deployment} unit="ms" />
                                                            <Separator />
                                                            <div className="font-semibold text-sm">Resources</div>
                                                            <MetricItem label="CPU Peak" value={current?.metrics?.resources?.cpu?.peakPercent} unit="%" />
                                                            <MetricItem label="CPU Average" value={current?.metrics?.resources?.cpu?.averagePercent} unit="%" />
                                                            <MetricItem label="Memory Peak" value={current?.metrics?.resources?.memory?.peakMb} unit="MB" />
                                                            <MetricItem label="Memory Average" value={current?.metrics?.resources?.memory?.averageMb} unit="MB" />
                                                            <MetricItem label="Disk Image Size" value={current?.metrics?.resources?.disk?.imageSizeMb} unit="MB" />
                                                            <Separator />
                                                            <div className="font-semibold text-sm">Network</div>
                                                            <MetricItem label="Ingress" value={current?.metrics?.network?.deploymentDataTransfer?.ingressMb} unit="MB" />
                                                            <MetricItem label="Egress" value={current?.metrics?.network?.deploymentDataTransfer?.egressMb} unit="MB" />
                                                        </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>

                                                <Separator className="my-2" />
                                                <div className="flex flex-wrap gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => refreshLogs(current?._id)}>
                                                    <RefreshCcw className="mr-2 size-4" />
                                                    {"Refresh logs"}
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => stopDeployment(current?._id)}>
                                                    <Pause className="mr-2 size-4" />
                                                    {"Stop"}
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => archiveDeployment(current?._id)}>
                                                    <Archive className="mr-2 size-4" />
                                                    {"Archive"}
                                                    </Button>
                                                    <Button
                                                    variant={state.autoRefresh ? "secondary" : "outline"}
                                                    size="sm"
                                                    onClick={() => setAutoRefresh(!state.autoRefresh)}
                                                    >
                                                    {state.autoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                 </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))
                )}
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
