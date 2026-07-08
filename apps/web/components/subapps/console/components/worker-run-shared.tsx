"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  consoleApi,
  type RunTrigger,
  type WorkerJobNode,
  type WorkerJobStatus,
  type WorkerLogEvent,
} from "@/components/subapps/console/lib/console-api"
import { CloudWatchLogsViewer } from "@/components/subapps/console/components/cloudwatch-logs-viewer"
import { HitlApprovalPanel } from "@/components/subapps/console/components/worker-hitl-approval"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCcw,
  Braces,
  ScrollText,
  ChevronRight,
  CornerDownRight,
  Crown,
  Hourglass,
  Zap,
  UserCheck,
  Globe,
  Layers,
  MousePointerClick,
  CalendarClock,
} from "lucide-react"

// Shared status/format helpers + the per-run logs panel, used by both the list and graph views.

export const STATUS_META: Record<
  WorkerJobStatus,
  { label: string; dot: string; text: string; border: string; pulse?: boolean }
> = {
  queued: {
    label: "Queued",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    border: "#f59e0b",
  },
  running: {
    label: "Running",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    border: "#3b82f6",
    pulse: true,
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "#10b981",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    border: "#ef4444",
  },
  unknown: {
    label: "Pending",
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    border: "#94a3b8",
  },
}

export function isTerminal(s: WorkerJobStatus): boolean {
  return s === "completed" || s === "failed"
}

/** Hard cap on nodes any walker/render will process — defends against a malformed or runaway
 * (e.g. a looping-queue store bug) tree that would otherwise recurse forever / render thousands of
 * nodes and hang the tab. */
export const MAX_RUN_NODES = 300

/**
 * Depth-first walk with a cycle guard (`seen`) and a hard node cap. ALL tree traversal in the run
 * views must go through this — the raw recursion had neither guard, so a self-referential or huge
 * tree pegged the main thread. `visit` returns false to stop early. Returns whether the cap/cycle
 * truncated the walk.
 */
export function walkTree(
  root: WorkerJobNode | null,
  visit: (node: WorkerJobNode, depth: number, parentId: string | null) => void,
): { truncated: boolean } {
  if (!root) return { truncated: false }
  const seen = new Set<string>()
  let count = 0
  let truncated = false
  const stack: { node: WorkerJobNode; depth: number; parentId: string | null }[] = [
    { node: root, depth: 0, parentId: null },
  ]
  while (stack.length) {
    const { node, depth, parentId } = stack.shift()!
    if (!node) continue
    if (node.jobId && seen.has(node.jobId)) continue // cycle / shared node — skip
    if (node.jobId) seen.add(node.jobId)
    if (count >= MAX_RUN_NODES) {
      truncated = true
      break
    }
    count += 1
    visit(node, depth, parentId)
    for (const c of node.children ?? []) {
      stack.push({ node: c, depth: depth + 1, parentId: node.jobId })
    }
  }
  return { truncated }
}

/** True once every discovered node has reached a terminal status (cycle-safe, bounded). */
export function treeSettled(node: WorkerJobNode | null): boolean {
  if (!node) return false
  let settled = true
  walkTree(node, (n) => {
    if (!n.found || !isTerminal(n.status)) settled = false
  })
  return settled
}

/** Whether any node in the tree is parked awaiting HITL approval (cycle-safe, bounded). */
export function hasAwaitingApproval(node: WorkerJobNode | null): boolean {
  return firstAwaitingJobId(node) != null
}

/** jobId of the first node parked awaiting HITL approval, or null. Used to auto-focus the reviewer. */
export function firstAwaitingJobId(node: WorkerJobNode | null): string | null {
  if (!node) return null
  let id: string | null = null
  walkTree(node, (n) => {
    if (id == null && n.awaitingApproval) id = n.jobId
  })
  return id
}

export function countNodes(node: WorkerJobNode | null): { total: number; done: number } {
  let total = 0
  let done = 0
  walkTree(node, (n) => {
    total += 1
    if (isTerminal(n.status)) done += 1
  })
  return { total, done }
}

export function formatDuration(node: WorkerJobNode): string | null {
  if (!node.createdAt) return null
  const start = new Date(node.createdAt).getTime()
  const end = node.completedAt
    ? new Date(node.completedAt).getTime()
    : node.updatedAt
      ? new Date(node.updatedAt).getTime()
      : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

/** How the parent spawned this child: awaited (blocked on it) vs fire-and-forget. */
export function DispatchBadge({
  awaited,
  delaySeconds,
  className = "",
}: {
  awaited?: boolean
  delaySeconds?: number
  className?: string
}) {
  if (awaited === undefined) return null
  if (awaited) {
    return (
      <span
        title="Parent awaited this child (dispatchWorker await:true)"
        className={`inline-flex h-4 items-center gap-1 rounded border px-1.5 text-[9px] font-medium text-violet-600 dark:text-violet-400 ${className}`}
      >
        <Hourglass className="size-2.5" /> awaited
      </span>
    )
  }
  return (
    <span
      title="Fire-and-forget dispatch (dispatchWorker await:false)"
      className={`inline-flex h-4 items-center gap-1 rounded border border-dashed px-1.5 text-[9px] font-medium text-muted-foreground ${className}`}
    >
      <Zap className="size-2.5" /> dispatched{delaySeconds ? ` +${delaySeconds}s` : ""}
    </span>
  )
}

/** Shown on a queue step parked for human-in-the-loop approval. */
export function ApprovalBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="This queue step is paused for human approval (HITL)"
      className={`inline-flex h-4 items-center gap-1 rounded border border-violet-400 px-1.5 text-[9px] font-medium text-violet-600 dark:text-violet-400 ${className}`}
    >
      <UserCheck className="size-2.5" /> awaiting approval
    </span>
  )
}

/** Pull a human-readable HITL title out of the stored UI spec, if present. */
export function hitlTitle(uiSpec: unknown): string | null {
  if (uiSpec && typeof uiSpec === "object" && "title" in uiSpec) {
    const t = (uiSpec as { title?: unknown }).title
    if (typeof t === "string" && t.trim()) return t
  }
  return null
}

export function StatusPill({ status }: { status: WorkerJobStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.text}`}>
      <span className={`size-2 rounded-full ${m.dot} ${m.pulse ? "animate-pulse" : ""}`} />
      {m.label}
    </span>
  )
}

/** The chain of nodes from the root down to `jobId` (inclusive), or [] if not found.
 * Cycle-guarded so a self-referential tree can't recurse forever. */
export function findAncestry(root: WorkerJobNode, jobId: string): WorkerJobNode[] {
  const seen = new Set<string>()
  const walk = (n: WorkerJobNode, path: WorkerJobNode[]): WorkerJobNode[] | null => {
    if (n.jobId && seen.has(n.jobId)) return null
    if (n.jobId) seen.add(n.jobId)
    const next = [...path, n]
    if (n.jobId === jobId) return next
    for (const c of n.children ?? []) {
      const found = walk(c, next)
      if (found) return found
    }
    return null
  }
  return walk(root, []) ?? []
}

/** Pretty-print any output/error value for display. */
export function stringifyValue(v: unknown): string {
  if (v === undefined) return ""
  if (typeof v === "string") return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Queue/HITL envelope keys the runtime strips before the user handler runs — mirror of
 * QUEUE_ORCHESTRATION_KEYS (+ __workerQueue) in ai-worker `queue.ts`. Hidden from the Input
 * display by default so the user sees the same domain input their handler actually received.
 */
const INPUT_ENVELOPE_KEYS = ["__workerQueue", "__hitlInput", "__hitlDecision", "__hitlPending", "hitl"]

export function splitDomainInput(input: unknown): {
  domain: unknown
  envelope: Record<string, unknown> | null
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { domain: input, envelope: null }
  const envelope: Record<string, unknown> = {}
  const domain: Record<string, unknown> = {}
  let hasEnvelope = false
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (INPUT_ENVELOPE_KEYS.includes(k)) {
      envelope[k] = v
      hasEnvelope = true
    } else {
      domain[k] = v
    }
  }
  return { domain, envelope: hasEnvelope ? envelope : null }
}

/** The input a run received, as persisted in the job store by the runtime. */
export function InputPanel({ input, status }: { input: unknown; status: WorkerJobStatus }) {
  const [showEnvelope, setShowEnvelope] = useState(false)
  const { domain, envelope } = useMemo(() => splitDomainInput(input), [input])
  if (input === undefined) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {status === "unknown"
          ? "Not in the job store yet."
          : "No input recorded for this run (it predates input storage or the store entry expired)."}
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <pre className="max-h-72 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px]">
        {stringifyValue(showEnvelope ? input : domain)}
      </pre>
      {envelope && (
        <label
          className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground"
          title="Queue/HITL orchestration keys (__workerQueue, __hitl*) that the runtime strips before your handler runs."
        >
          <input
            type="checkbox"
            checked={showEnvelope}
            onChange={(e) => setShowEnvelope(e.target.checked)}
            className="size-3"
          />
          Show queue envelope keys ({Object.keys(envelope).join(", ")})
        </label>
      )}
    </div>
  )
}

/** Pull the trigger-provenance stamp off a run node's metadata, if the runtime recorded one. */
export function nodeTrigger(node: WorkerJobNode): RunTrigger | null {
  const t = (node.metadata as { __trigger?: RunTrigger } | undefined)?.__trigger
  return t && typeof t === "object" && t.type ? t : null
}

/** Short human label for how a run was triggered. */
export function triggerLabel(t?: RunTrigger | null): string {
  if (!t) return "—"
  switch (t.type) {
    case "console":
      return "Console"
    case "worker":
      return t.parentWorkerId ? `by ${t.parentWorkerId}` : "by worker"
    case "queue":
      return t.queueId ? `Queue: ${t.queueId}` : "Queue"
    case "schedule":
      return "Schedule"
    default:
      return "External"
  }
}

/** How a run was triggered: console user / parent worker / queue / schedule / external API. */
export function TriggerBadge({
  trigger,
  className = "",
}: {
  trigger?: RunTrigger | null
  className?: string
}) {
  if (!trigger) return null
  const detail = [
    trigger.type === "console" && trigger.userId ? `user ${trigger.userId}` : null,
    trigger.parentJobId ? `parent job ${trigger.parentJobId}` : null,
    trigger.queueJobId ? `queue run ${trigger.queueJobId}` : null,
    trigger.at ? `at ${trigger.at}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const Icon =
    trigger.type === "console"
      ? MousePointerClick
      : trigger.type === "worker"
        ? Zap
        : trigger.type === "queue"
          ? Layers
          : trigger.type === "schedule"
            ? CalendarClock
            : Globe
  const tone =
    trigger.type === "external"
      ? "text-sky-600 dark:text-sky-400"
      : trigger.type === "console"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-muted-foreground"
  return (
    <span
      title={`Triggered: ${triggerLabel(trigger)}${detail ? ` (${detail})` : ""}`}
      className={`inline-flex h-4 items-center gap-1 rounded border px-1.5 text-[9px] font-medium ${tone} ${className}`}
    >
      <Icon className="size-2.5" /> {triggerLabel(trigger)}
    </span>
  )
}

/** Padding around a run's own timestamps when building its CloudWatch search window. */
const LOG_WINDOW_PAD_MS = 10 * 60 * 1000

/** Per-run CloudWatch logs for a worker (or the trigger) Lambda, filtered to one invocation. */
export function LambdaLogs({
  projectId,
  workerId,
  functionName,
  target,
  queueId,
  jobId,
  startedAt,
  completedAt,
}: {
  projectId: string
  workerId?: string
  functionName?: string
  target?: "worker" | "trigger" | "queue"
  queueId?: string
  jobId: string
  /** ISO time the run started — anchors the CloudWatch window to the run instead of "last 60 min". */
  startedAt?: string
  /** ISO time the run settled; open-ended (now) while still running. */
  completedAt?: string
}) {
  const [events, setEvents] = useState<WorkerLogEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterByJob, setFilterByJob] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // A history run can be arbitrarily old — a "last 60 minutes" window would miss it entirely.
      // When the run's own timestamps are known, search CloudWatch around THEM (padded); only fall
      // back to the recent window when the node has no times (old record / not found).
      const startedMs = startedAt ? Date.parse(startedAt) : NaN
      const completedMs = completedAt ? Date.parse(completedAt) : NaN
      const window = Number.isFinite(startedMs)
        ? {
            startTime: startedMs - LOG_WINDOW_PAD_MS,
            endTime: (Number.isFinite(completedMs) ? completedMs : Date.now()) + LOG_WINDOW_PAD_MS,
          }
        : { rangeMinutes: 60 }
      const res = await consoleApi.getWorkerLogs({
        projectId,
        workerId,
        functionName,
        target,
        queueId,
        jobId: filterByJob ? jobId : undefined,
        ...window,
      })
      setEvents(res.events)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [projectId, workerId, functionName, target, queueId, jobId, filterByJob, startedAt, completedAt])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => load()} disabled={loading}>
          <RefreshCcw className={`mr-1.5 size-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={filterByJob}
            onChange={(e) => setFilterByJob(e.target.checked)}
            className="size-3"
          />
          Only this run
        </label>
      </div>
      {error && <div className="text-[11px] text-destructive">{error}</div>}
      {!events.length && !loading ? (
        <p className="py-3 text-center text-[11px] text-muted-foreground">
          {`No log events yet${filterByJob ? " for this run" : ""}.`}
        </p>
      ) : (
        <CloudWatchLogsViewer events={events} isLoading={loading} compact defaultLogView="app" />
      )}
    </div>
  )
}

/**
 * Detail panel for a selected run node — shared by the graph and timeline views. Shows the node's
 * Output/Error and per-run Logs, a clickable trace breadcrumb (root → … → node), and a collapsible
 * "Outputs up to this point" listing each ancestor's output in order.
 */
export function NodeDetailPanel({
  projectId,
  node,
  trace,
  isRoot,
  onSelect,
}: {
  projectId: string
  node: WorkerJobNode
  /** Ancestor chain including the node itself (root first). */
  trace: WorkerJobNode[]
  isRoot: boolean
  onSelect: (jobId: string) => void
}) {
  const [tab, setTab] = useState("output")
  const [showUpstream, setShowUpstream] = useState(false)
  const duration = formatDuration(node)
  const hasError = node.status === "failed" || node.error != null
  const upstream = useMemo(() => trace.slice(0, -1), [trace]) // ancestors, excluding the node itself

  return (
    <div className="flex min-h-[560px] flex-col rounded-lg border">
      <div className="border-b p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isRoot && <Crown className="size-4 text-amber-500" />}
              <span className="truncate text-sm font-semibold">{node.workerId || "(worker)"}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusPill status={node.status} />
              <TriggerBadge trigger={nodeTrigger(node)} />
              <DispatchBadge awaited={node.awaited} delaySeconds={node.delaySeconds} />
              {node.awaitingApproval && <ApprovalBadge />}
              {duration && <span className="font-mono text-[10px] text-muted-foreground">{duration}</span>}
            </div>
          </div>
          {isRoot && (
            <Badge variant="outline" className="shrink-0 border-amber-500 text-[10px] text-amber-600 dark:text-amber-400">
              Final output
            </Badge>
          )}
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted-foreground">{node.jobId}</div>

        {trace.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
            <span className="text-muted-foreground">Trace:</span>
            {trace.map((t, i) => (
              <span key={t.jobId} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
                <button
                  onClick={() => onSelect(t.jobId)}
                  className={`rounded px-1 py-0.5 hover:bg-accent ${
                    t.jobId === node.jobId ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t.workerId || "worker"}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 pt-2">
          <TabsList className="h-8">
            <TabsTrigger value="output" className="text-xs">
              <Braces className="mr-1.5 size-3.5" /> {hasError ? "Output / Error" : "Output"}
            </TabsTrigger>
            <TabsTrigger value="input" className="text-xs">
              <CornerDownRight className="mr-1.5 size-3.5" /> Input
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">
              <ScrollText className="mr-1.5 size-3.5" /> Logs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="output" className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {node.awaitingApproval && (
            <div className="space-y-2">
              <div className="rounded border border-violet-400/50 bg-violet-500/10 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                  <UserCheck className="size-3.5" />
                  {hitlTitle(node.hitlUi) ?? "Waiting for human approval"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  This step is paused (HITL). It resumes once a reviewer approves; rejecting fails the step.
                  The pending input below is what will be dispatched on approval.
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
            <pre className="overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px]">
              {stringifyValue(node.output)}
            </pre>
          ) : node.error == null ? (
            <p className="text-[11px] text-muted-foreground">
              {isTerminal(node.status) ? "No output." : "Waiting for the worker to finish…"}
            </p>
          ) : null}

          {upstream.length > 0 && (
            <div className="rounded border">
              <button
                onClick={() => setShowUpstream((v) => !v)}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-medium hover:bg-accent/50"
              >
                <ChevronRight className={`size-3 transition-transform ${showUpstream ? "rotate-90" : ""}`} />
                <CornerDownRight className="size-3 text-muted-foreground" />
                Outputs up to this point ({upstream.length})
              </button>
              {showUpstream && (
                <div className="space-y-2 border-t p-2">
                  {upstream.map((u) => (
                    <div key={u.jobId}>
                      <button
                        onClick={() => onSelect(u.jobId)}
                        className="mb-1 flex items-center gap-1.5 text-[11px] font-medium hover:underline"
                      >
                        <span>{u.workerId || "worker"}</span>
                        <StatusPill status={u.status} />
                      </button>
                      <pre className="max-h-32 overflow-auto rounded border bg-muted/30 p-1.5 font-mono text-[10px]">
                        {u.output !== undefined ? stringifyValue(u.output) : "(no output)"}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="input" className="min-h-0 flex-1 overflow-auto p-3">
          <InputPanel input={node.input} status={node.status} />
        </TabsContent>

        <TabsContent value="logs" className="min-h-0 flex-1 overflow-auto p-3">
          <LambdaLogs
            projectId={projectId}
            workerId={node.workerId}
            jobId={node.jobId}
            startedAt={node.createdAt}
            completedAt={node.completedAt}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
