"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, RefreshCcw, RefreshCw, Pause, Rocket } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LogsViewer } from "./logs-viewer"
import { CopyableUrl } from "./copyable-url"
import type { DeploymentDto } from "@/components/subapps/console/lib/console-api"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { getDeploymentStatusVisual } from "@/components/subapps/console/lib/deployment-status"
import { usePermissions } from "@/components/subapps/console/lib/use-permissions"
import { timeAgo, cn } from "@/lib/utils"

/** Consistent status pill (dot + label) used across the list and detail panel. */
function StatusPill({ status, className }: { status?: string; className?: string }) {
  const v = getDeploymentStatusVisual(status)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        v.badgeClass,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", v.dotClass)} />
      {v.label}
    </span>
  )
}

/** Compact label-over-value cell for the deployment detail grid. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="truncate text-sm">{children}</div>
    </div>
  )
}

function formatDuration(startTime?: string | Date, endTime?: string | Date, fallbackNow?: number): string {
  if (!startTime) return "—"
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : (fallbackNow ?? Date.now())
  const ms = Math.max(0, end - start)
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

/** Compact metric value cell (replaces the oversized bar charts). */
function MetricCell({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">
        {value}
        {unit ? <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  )
}

export function DeploymentsTab({ projectId }: { projectId: string }) {
  const {
    state,
    loadProjectDeployments,
    loadMoreDeployments,
    refreshDeployment,
    refreshLogs,
    startLocalDeployment,
    stopDeployment,
    setAutoRefresh,
  } = useConsole()

  const { can } = usePermissions(projectId)
  const canDeploy = can("deployment.create")
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const deployments = state.deployments
  const hasActive = useMemo(
    () => deployments.some((d) => getDeploymentStatusVisual(d.status).active),
    [deployments],
  )

  // Tick every second to update live durations — only while something is running.
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasActive])

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
  const currentGroupLabel = getGroupLabel(current?.group)
  const currentGroupColor = getGroupColorToken(currentGroupLabel)

  const onUpload = async (file?: File | null) => {
    if (!file) return
    await startLocalDeployment(file)
  }

  const duration = useMemo(() => {
    const start = current?.metrics?.timing?.startTime ? new Date(current?.metrics?.timing?.startTime).getTime() : undefined
    const end = current?.metrics?.timing?.endTime ? new Date(current?.metrics?.timing?.endTime).getTime() : now
    if (!start) return undefined
    const ms = end - start
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }, [current, now])

  const isActive = getDeploymentStatusVisual(status).active

  const metrics = useMemo(() => {
    const r = current?.metrics?.resources
    if (!r) return null
    return {
      cpuPeak: Math.round(r.cpu?.peakPercent || 0),
      cpuAvg: Math.round(r.cpu?.averagePercent || 0),
      memPeak: Math.round(r.memory?.peakMb || 0),
      memAvg: Math.round(r.memory?.averageMb || 0),
      disk: Math.round(r.disk?.imageSizeMb || 0),
    }
  }, [current])

  return (
    <div className="grid grid-cols-1">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base">{"Deployments"}</CardTitle>
          <div className="flex items-center gap-2">
            {canDeploy ? (
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
            ) : null}
            <Button variant="outline" size="sm" onClick={() => loadProjectDeployments()}>
              <RefreshCcw className="mr-2 size-4" />
              {"Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.loadingDeployments && deployments.length === 0 ? (
            <div className="rounded-md border divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <Skeleton className="size-2 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="ml-auto h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-14 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted">
                <Rocket className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{"No deployments yet"}</p>
                <p className="text-xs text-muted-foreground">
                  {"Use “Start local deployment” to upload a .zip and create your first one."}
                </p>
              </div>
            </div>
          ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="hidden md:flex items-center justify-between gap-4 border-b bg-muted/40 px-4 py-2 pr-10 text-xs font-medium text-muted-foreground">
              <span>{"Deployment"}</span>
              <span>{"Started · Duration"}</span>
            </div>
            <Accordion type="single" collapsible className="w-full">
                {deployments.map((d) => {
                        const isSelected = d?._id === selectedId;
                        // Use the more up-to-date `current` deployment data if this is the selected item
                        const displayDeployment = isSelected && current ? current : d;
                        const displayGroupLabel = getGroupLabel(displayDeployment?.group)
                        const displayGroupColor = getGroupColorToken(displayGroupLabel)
                        const dotClass = getDeploymentStatusVisual(displayDeployment?.status).dotClass
                        return (
                        <AccordionItem value={d?._id} key={d?._id} className="border-b last:border-b-0">
                            <AccordionTrigger
                              onClick={() => setSelectedId(d?._id)}
                              className={cn(
                                "w-full text-left hover:no-underline px-4 py-3 transition-colors",
                                isSelected ? "bg-muted/60" : "hover:bg-muted/40",
                              )}
                            >
                                <div className="flex w-full min-w-0 items-center gap-3 text-sm">
                                    <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
                                    <span className="font-mono text-xs truncate text-muted-foreground max-w-[45%]" title={displayDeployment?._id}>{displayDeployment?._id}</span>
                                    <Badge
                                      variant="outline"
                                      className="hidden md:inline-flex shrink-0"
                                      style={{
                                        backgroundColor: displayGroupColor.bg,
                                        borderColor: displayGroupColor.border,
                                        color: displayGroupColor.text,
                                      }}
                                      title={`Group: ${displayGroupLabel}`}
                                    >
                                      {displayGroupLabel}
                                    </Badge>
                                    <StatusPill status={displayDeployment?.status} className="shrink-0" />
                                    <div className="ml-auto shrink-0 text-right leading-tight">
                                      <span title={new Date(displayDeployment?.createdAt).toLocaleString()}>{timeAgo(displayDeployment?.createdAt)}</span>
                                      <span className="block text-xs text-muted-foreground">
                                        {formatDuration(displayDeployment?.metrics?.timing?.startTime, displayDeployment?.metrics?.timing?.endTime, now)}
                                      </span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                 <div
                                   className="p-4 border-t flex flex-col gap-6 bg-background"
                                 >
                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 rounded-md border bg-muted/30 p-4">
                                         <Field label="Group">
                                           <Badge
                                             variant="outline"
                                             style={{
                                               backgroundColor: currentGroupColor.bg,
                                               borderColor: currentGroupColor.border,
                                               color: currentGroupColor.text,
                                             }}
                                           >
                                             {currentGroupLabel}
                                           </Badge>
                                         </Field>
                                         <Field label="Status">
                                           <StatusPill status={status} />
                                         </Field>
                                         <Field label="Duration">{duration ?? "—"}</Field>
                                         <Field label="Started">
                                           <span title={current?.createdAt ? new Date(current.createdAt).toLocaleString() : undefined}>
                                             {current?.createdAt ? timeAgo(current.createdAt) : "—"}
                                           </span>
                                         </Field>
                                         <Field label="Triggered by">
                                           {current?.triggeredBy?.email ||
                                             current?.triggeredBy?.name ||
                                             current?.triggeredBy?.userId ||
                                             current?.userId ||
                                             "—"}
                                           {current?.triggeredBy?.via ? ` (${current.triggeredBy.via})` : ""}
                                         </Field>
                                         <Field label="URL">
                                           <CopyableUrl url={current?.baseUrl} />
                                         </Field>
                                     </div>

                                     <div>
                                         <div className="flex items-center justify-between gap-2 mb-2">
                                             <h3 className="text-sm font-semibold">Logs</h3>
                                             <TooltipProvider delayDuration={150}>
                                               <div className="flex items-center gap-1">
                                                 <Tooltip>
                                                   <TooltipTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="size-8" aria-label="Refresh logs" onClick={() => refreshLogs(current?._id)}>
                                                       <RefreshCcw className="size-4" />
                                                     </Button>
                                                   </TooltipTrigger>
                                                   <TooltipContent>{"Refresh logs"}</TooltipContent>
                                                 </Tooltip>
                                                 {isActive && (
                                                   <>
                                                     <Tooltip>
                                                       <TooltipTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="size-8" aria-label="Stop deployment" onClick={() => stopDeployment(current?._id)}>
                                                           <Pause className="size-4" />
                                                         </Button>
                                                       </TooltipTrigger>
                                                       <TooltipContent>{"Stop deployment"}</TooltipContent>
                                                     </Tooltip>
                                                     <Tooltip>
                                                       <TooltipTrigger asChild>
                                                         <Button
                                                           variant="ghost"
                                                           size="icon"
                                                           aria-label={state.autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
                                                           aria-pressed={state.autoRefresh}
                                                           onClick={() => setAutoRefresh(!state.autoRefresh)}
                                                           className={cn(
                                                             "size-8",
                                                             state.autoRefresh &&
                                                               "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                                                           )}
                                                         >
                                                           <RefreshCw className="size-4" />
                                                         </Button>
                                                       </TooltipTrigger>
                                                       <TooltipContent>{state.autoRefresh ? "Auto-refresh: on" : "Auto-refresh: off"}</TooltipContent>
                                                     </Tooltip>
                                                   </>
                                                 )}
                                               </div>
                                             </TooltipProvider>
                                         </div>
                                         <LogsViewer logs={state.currentLogs} isLoading={state.loadingLogs} />
                                     </div>

                                     {metrics && (
                                       <div>
                                         <h3 className="text-sm font-semibold mb-2">Metrics</h3>
                                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                           <MetricCell label="CPU peak" value={metrics.cpuPeak} unit="%" />
                                           <MetricCell label="CPU avg" value={metrics.cpuAvg} unit="%" />
                                           <MetricCell label="Mem peak" value={metrics.memPeak} unit="MB" />
                                           <MetricCell label="Mem avg" value={metrics.memAvg} unit="MB" />
                                           <MetricCell label="Image size" value={metrics.disk} unit="MB" />
                                         </div>
                                       </div>
                                     )}
                                 </div>
                            </AccordionContent>
                        </AccordionItem>
                        )
                    })}
            </Accordion>
            {state.hasMoreDeployments && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => loadMoreDeployments()}
                  disabled={state.loadingMoreDeployments}
                >
                  {state.loadingMoreDeployments ? (
                    <>
                      <RefreshCcw className="mr-2 size-4 animate-spin" />
                      {"Loading…"}
                    </>
                  ) : (
                    "Load more deployments"
                  )}
                </Button>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
