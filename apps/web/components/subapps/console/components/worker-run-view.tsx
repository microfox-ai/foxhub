"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type WorkerJobNode,
  type WorkerJobResult,
} from "@/components/subapps/console/lib/console-api"
import {
  isTerminal,
  treeSettled,
  countNodes,
  formatDuration,
  StatusPill,
  DispatchBadge,
  ApprovalBadge,
  TriggerBadge,
  nodeTrigger,
  InputPanel,
  LambdaLogs,
  stringifyValue,
} from "@/components/subapps/console/components/worker-run-shared"
import { HitlApprovalPanel } from "@/components/subapps/console/components/worker-hitl-approval"
import { WorkerRunFlow } from "@/components/subapps/console/components/worker-run-flow"
import { WorkerRunTimeline } from "@/components/subapps/console/components/worker-run-timeline"
import { RunErrorBoundary } from "@/components/subapps/console/components/run-error-boundary"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  RefreshCcw,
  Send,
  ScrollText,
  Braces,
  CircleSlash,
  Loader2,
  Workflow,
  List,
  GanttChartSquare,
} from "lucide-react"

/** A normalized trigger result — works for both worker and queue starts. */
export type RunStart = { jobId: string; ok: boolean; status: number; response: unknown }

type WorkerRunViewProps = {
  projectId: string
  run: RunStart
  /** Fetches the run tree (getWorkerJob for workers, getQueueJob for queues). */
  loadRun: () => Promise<WorkerJobResult>
  triggerLabel?: string
  /** Which Lambda's logs back the "trigger response" block. */
  triggerLog?: { target: "trigger" | "queue"; queueId?: string }
}

/**
 * Public entry — wraps the run view in an error boundary so a malformed job tree / unexpected
 * node shape can never white-screen the console (there's no boundary above this in the subapp).
 */
export function WorkerRunView(props: WorkerRunViewProps) {
  return (
    <RunErrorBoundary label="Couldn't render this run">
      <WorkerRunViewInner {...props} />
    </RunErrorBoundary>
  )
}

function WorkerRunViewInner({
  projectId,
  run,
  loadRun,
  triggerLabel = "Trigger response",
  triggerLog = { target: "trigger" },
}: WorkerRunViewProps) {
  const [job, setJob] = useState<WorkerJobResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polls, setPolls] = useState(0)
  const [showTrigger, setShowTrigger] = useState(false)
  const [view, setView] = useState<"graph" | "timeline" | "list">("graph")

  const root = job && job.available ? job.root : null

  // Keep the latest loadRun in a ref so the poll loop is STABLE — call sites pass a fresh
  // `loadRun={() => …}` arrow each render, and depending on it directly would tear down + restart
  // the interval (and fire an extra immediate load) on every parent render. The `key` on this
  // component already remounts it when the run changes, so a ref is safe.
  const loadRunRef = useRef(loadRun)
  loadRunRef.current = loadRun
  // Serialize loads: getQueueJob/getWorkerJob can be slow (store read). Without this guard a slow
  // request lets the 3s interval stack overlapping in-flight loads, each setState-ing on return —
  // a re-render storm that pegs the main thread ("this page is slowing down").
  const inFlight = useRef(false)
  const jobRef = useRef<WorkerJobResult | null>(null)
  jobRef.current = job

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      setJob(await loadRunRef.current())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  // Poll until the tree settles (or ~2 min). Mounts ONCE (stable `load` + in-flight guard), so slow
  // store reads can't stack overlapping loads into a re-render storm. A run parked at HITL approval
  // keeps polling (bounded) so the trace refreshes once a reviewer approves and it resumes.
  useEffect(() => {
    let ticks = 0
    let stopped = false
    void load()
    const timer = setInterval(() => {
      const j = jobRef.current
      const done = !!j?.available && treeSettled(j.root)
      ticks += 1
      setPolls(ticks)
      if (stopped || done || ticks >= 40) {
        clearInterval(timer)
        stopped = true
        return
      }
      void load()
    }, 3000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [load])

  const progress = useMemo(() => countNodes(root), [root])
  const settled = treeSettled(root)

  return (
    <div className="space-y-4">
      {/* Trigger response (type 1) + trigger Lambda logs (log type 1) */}
      <div className="rounded-md border">
        <button
          onClick={() => setShowTrigger((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-accent/50"
        >
          {showTrigger ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          <Send className="size-3.5 text-muted-foreground" />
          {triggerLabel}
          <Badge variant={run.ok ? "default" : "destructive"} className="ml-1 text-[10px]">
            {run.ok ? "Queued" : `Error ${run.status}`}
          </Badge>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">{run.jobId}</span>
        </button>
        {showTrigger && (
          <div className="space-y-3 border-t px-3 py-3">
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                {triggerLog.target === "queue" ? "queues/{id}/start response" : "workers/trigger Lambda response"}
              </div>
              <pre className="max-h-48 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px]">
                {stringifyValue(run.response)}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                {triggerLog.target === "queue" ? "queue-starter Lambda logs" : "workers/trigger Lambda logs"}
              </div>
              <LambdaLogs
                projectId={projectId}
                target={triggerLog.target}
                queueId={triggerLog.queueId}
                jobId={run.jobId}
                startedAt={root?.createdAt}
                completedAt={root?.completedAt}
              />
            </div>
          </div>
        )}
      </div>

      {/* Run: status + output (type 2) + per-worker logs (log type 2) — as a graph or list */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Workflow className="size-4" />
          <span>Run trace</span>
          {root && (
            <span>
              · {progress.done}/{progress.total} settled
            </span>
          )}
          {!settled && (loading || polls > 0) && <Loader2 className="size-3.5 animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex overflow-hidden rounded-md border">
            <Button
              variant={view === "graph" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-none px-2 text-xs"
              onClick={() => setView("graph")}
            >
              <Workflow className="mr-1.5 size-3.5" /> Graph
            </Button>
            <Button
              variant={view === "timeline" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-none px-2 text-xs"
              onClick={() => setView("timeline")}
            >
              <GanttChartSquare className="mr-1.5 size-3.5" /> Timeline
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-none px-2 text-xs"
              onClick={() => setView("list")}
            >
              <List className="mr-1.5 size-3.5" /> List
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && <div className="text-xs text-destructive">{error}</div>}

      {job && !job.available ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center">
          <CircleSlash className="size-6 text-muted-foreground" />
          <p className="max-w-md text-xs text-muted-foreground">{job.message}</p>
        </div>
      ) : root ? (
        view === "graph" ? (
          <WorkerRunFlow root={root} projectId={projectId} />
        ) : view === "timeline" ? (
          <WorkerRunTimeline root={root} projectId={projectId} />
        ) : (
          <div className="rounded-md border p-1">
            <JobTreeNode node={root} projectId={projectId} depth={0} defaultOpen />
          </div>
        )
      ) : (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Reading job status…
        </div>
      )}
    </div>
  )
}

// --- list view (compact fallback) ------------------------------------------

function JobTreeNode({
  node,
  projectId,
  depth,
  defaultOpen = false,
}: {
  node: WorkerJobNode
  projectId: string
  depth: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen || depth === 0)
  const [panel, setPanel] = useState<"output" | "input" | "logs" | null>(null)
  const duration = formatDuration(node)
  const hasError = node.status === "failed" || node.error != null
  const childCount = node.children.length

  return (
    <div className={depth > 0 ? "ml-3 border-l pl-3" : ""}>
      <div className="rounded-md hover:bg-accent/40">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {childCount > 0 ? (
              open ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="inline-block size-3.5 shrink-0" />
            )}
            <span className="truncate text-sm font-medium">{node.workerId || "(worker)"}</span>
            <StatusPill status={node.status} />
            <TriggerBadge trigger={nodeTrigger(node)} />
            <DispatchBadge awaited={node.awaited} delaySeconds={node.delaySeconds} />
            {node.awaitingApproval && <ApprovalBadge />}
            {childCount > 0 && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                {childCount} child{childCount === 1 ? "" : "ren"}
              </Badge>
            )}
            {!node.found && (
              <span className="text-[10px] text-muted-foreground">not in store yet</span>
            )}
          </button>
          {duration && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{duration}</span>}
        </div>

        {open && (
          <div className="px-2 pb-2 pl-7">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{node.jobId}</span>
              <Button
                variant={panel === "output" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setPanel(panel === "output" ? null : "output")}
              >
                <Braces className="mr-1 size-3" /> {hasError ? "Output / Error" : "Output"}
              </Button>
              <Button
                variant={panel === "input" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setPanel(panel === "input" ? null : "input")}
              >
                <CornerDownRight className="mr-1 size-3" /> Input
              </Button>
              <Button
                variant={panel === "logs" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setPanel(panel === "logs" ? null : "logs")}
              >
                <ScrollText className="mr-1 size-3" /> Logs
              </Button>
            </div>

            {panel === "output" && (
              <div className="space-y-2">
                {node.awaitingApproval && (
                  <div className="space-y-2">
                    <div className="rounded border border-violet-400/50 bg-violet-500/10 p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                        Waiting for human approval
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        This step is paused (HITL). It resumes once a reviewer approves; rejecting fails the step.
                      </p>
                    </div>
                    <HitlApprovalPanel projectId={projectId} node={node} />
                  </div>
                )}
                {node.error != null && (
                  <pre className="max-h-48 overflow-auto rounded border border-destructive/40 bg-destructive/10 p-2 font-mono text-[11px] text-destructive">
                    {stringifyValue(node.error)}
                  </pre>
                )}
                {node.output !== undefined ? (
                  <pre className="max-h-72 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px]">
                    {stringifyValue(node.output)}
                  </pre>
                ) : node.error == null ? (
                  <p className="text-[11px] text-muted-foreground">
                    {isTerminal(node.status) ? "No output." : "Waiting for the worker to finish…"}
                  </p>
                ) : null}
              </div>
            )}

            {panel === "input" && <InputPanel input={node.input} status={node.status} />}

            {panel === "logs" && (
              <LambdaLogs
                projectId={projectId}
                workerId={node.workerId}
                jobId={node.jobId}
                startedAt={node.createdAt}
                completedAt={node.completedAt}
              />
            )}
          </div>
        )}
      </div>

      {open && node.children.map((c) => (
        <JobTreeNode key={c.jobId} node={c} projectId={projectId} depth={depth + 1} />
      ))}
    </div>
  )
}
