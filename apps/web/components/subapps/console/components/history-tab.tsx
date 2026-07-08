"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWRInfinite from "swr/infinite"
import {
  consoleApi,
  type HistoryRun,
} from "@/components/subapps/console/lib/console-api"
import { WorkerRunView } from "@/components/subapps/console/components/worker-run-view"
import { TriggerBadge } from "@/components/subapps/console/components/worker-run-shared"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  History,
  RefreshCcw,
  Search,
  Zap,
  Layers,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ListTree,
  List as ListIcon,
  Crown,
} from "lucide-react"

const RANGE_OPTIONS: { label: string; minutes: number }[] = [
  { label: "Last hour", minutes: 60 },
  { label: "Last 6 hours", minutes: 360 },
  { label: "Last 24 hours", minutes: 1440 },
  { label: "Last 7 days", minutes: 10080 },
  { label: "Last 30 days", minutes: 43200 },
]

const STATUS_STYLE: Record<HistoryRun["status"], { label: string; dot: string; text: string }> = {
  queued: { label: "Queued", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  running: { label: "Running", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  awaiting_approval: { label: "Awaiting approval", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  failed: { label: "Failed", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  unknown: { label: "—", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
}

function timeAgo(iso?: string): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/** Row model for the hierarchical rendering: a run + its depth and expandability. */
type TreeRow = { run: HistoryRun; depth: number; childCount: number }

const PAGE_SIZE = 50

export function HistoryTab({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams()
  const [rangeMinutes, setRangeMinutes] = useState(1440)
  const [kind, setKind] = useState<"all" | "worker" | "queue">("all")
  // Flat = every run as its own row (current behavior). Tree = children nested under the run
  // that dispatched them (expand/collapse). Roots = only top-level runs (nothing dispatched them).
  const [viewMode, setViewMode] = useState<"flat" | "tree" | "roots">("flat")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Seed the search from a deep link (Workers/Queues page "History →"), once.
  const [search, setSearch] = useState(() => searchParams.get("runq") ?? "")
  const [selected, setSelected] = useState<HistoryRun | null>(null)
  // Bump to force a fresh server scan (bypass the window cache). Part of the SWR key so incrementing
  // it refetches page 0 with refresh=1 (which re-scans + re-caches); later pages read the fresh cache.
  const [reloadKey, setReloadKey] = useState(0)

  // Paginated + accumulated: each "Load more" appends a page; hierarchy grouping recomputes over the
  // accumulated set so Tree/Roots stay correct as more loads. The server slices a cached full list,
  // so paging never re-scans CloudWatch.
  const { data: pages, error, isLoading, isValidating, size, setSize } = useSWRInfinite(
    (pageIndex: number, prev: import("@/components/subapps/console/lib/console-api").WorkerHistory | null) => {
      if (!projectId) return null
      if (prev && prev.hasMore === false) return null // no more pages
      return ["workers:history", projectId, rangeMinutes, kind, reloadKey, pageIndex] as const
    },
    ([, id, range, k, rk, pageIndex]) =>
      consoleApi.getWorkersHistory({
        projectId: id,
        rangeMinutes: range,
        kind: k,
        offset: pageIndex * PAGE_SIZE,
        pageSize: PAGE_SIZE,
        // Only page 0 of an explicit reload forces a fresh scan; the rest read the freshened cache.
        refresh: rk > 0 && pageIndex === 0,
      }),
    { revalidateOnFocus: false, shouldRetryOnError: false, revalidateFirstPage: false },
  )

  const data = pages?.[0] // window-level flags (enriched / queueStoreAvailable) come from any page
  const lastPage = pages?.[pages.length - 1]
  const hasMore = !!lastPage?.hasMore
  const total = lastPage?.total ?? pages?.reduce((n, p) => n + p.runs.length, 0) ?? 0
  const loadingMore = isValidating && !!pages && size > pages.length

  const runs = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = pages ? pages.flatMap((p) => p.runs) : []
    if (!q) return list
    return list.filter(
      (r) =>
        r.workerId.toLowerCase().includes(q) ||
        r.jobId.toLowerCase().includes(q) ||
        (r.queueId ?? "").toLowerCase().includes(q),
    )
  }, [pages, search])

  // Hierarchy over the (filtered) list: children grouped under their dispatching parent.
  // A run whose parent isn't in the list (out of window / filtered away) renders as a root.
  const { roots, childrenOf } = useMemo(() => {
    const byId = new Set(runs.map((r) => r.jobId))
    const childrenOf = new Map<string, HistoryRun[]>()
    const roots: HistoryRun[] = []
    for (const r of runs) {
      if (r.parentJobId && byId.has(r.parentJobId)) {
        const list = childrenOf.get(r.parentJobId) ?? []
        list.push(r)
        childrenOf.set(r.parentJobId, list)
      } else {
        roots.push(r)
      }
    }
    // Children in execution order (oldest first); roots stay newest-first from the API.
    for (const list of childrenOf.values())
      list.sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""))
    return { roots, childrenOf }
  }, [runs])

  // Whether any run actually nests under another (worker dispatch) — if not, Flat/Tree/Roots are
  // identical, so we surface a hint explaining why rather than leaving the toggle looking broken.
  const hasHierarchy = useMemo(() => runs.some((r) => !!r.parentJobId), [runs])

  // The rows to render for the current view mode (tree rows carry depth for indentation).
  const rows = useMemo((): TreeRow[] => {
    if (viewMode === "flat") return runs.map((run) => ({ run, depth: 0, childCount: 0 }))
    if (viewMode === "roots")
      return roots.map((run) => ({ run, depth: 0, childCount: childrenOf.get(run.jobId)?.length ?? 0 }))
    const out: TreeRow[] = []
    const push = (run: HistoryRun, depth: number) => {
      const kids = childrenOf.get(run.jobId) ?? []
      out.push({ run, depth, childCount: kids.length })
      if (kids.length && expanded.has(run.jobId)) for (const k of kids) push(k, depth + 1)
    }
    for (const r of roots) push(r, 0)
    return out
  }, [viewMode, runs, roots, childrenOf, expanded])

  const toggleExpanded = (jobId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  // Detail view — rendered full-width (not a cramped modal) so the graph/timeline fit properly.
  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelected(null)}>
            <ArrowLeft className="mr-1.5 size-4" /> Back to history
          </Button>
          <div className="flex items-center gap-2">
            {selected.kind === "queue" ? (
              <Layers className="size-4 text-primary" />
            ) : (
              <Zap className="size-4 text-amber-500" />
            )}
            <span className="text-sm font-semibold">
              {selected.kind === "queue" ? selected.queueId : selected.workerId}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{selected.jobId}</span>
            <TriggerBadge trigger={selected.trigger} />
          </div>
        </div>
        <WorkerRunView
          key={`${selected.kind}:${selected.jobId}`}
          projectId={projectId}
          run={{ jobId: selected.jobId, ok: true, status: 200, response: { openedFrom: "history" } }}
          loadRun={() =>
            selected.kind === "queue"
              ? consoleApi.getQueueJob({ projectId, queueJobId: selected.jobId })
              : consoleApi.getWorkerJob({ projectId, jobId: selected.jobId, workerId: selected.workerId })
          }
          triggerLabel="Run opened from history"
          triggerLog={
            selected.kind === "queue"
              ? { target: "queue", queueId: selected.queueId }
              : { target: "trigger" }
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by worker, queue, or job id…"
            className="h-9 pl-7 text-xs"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border">
          {(["all", "worker", "queue"] as const).map((k) => (
            <Button
              key={k}
              variant={kind === k ? "secondary" : "ghost"}
              size="sm"
              className="h-9 rounded-none px-3 text-xs capitalize"
              onClick={() => setKind(k)}
            >
              {k === "worker" ? "Workers" : k === "queue" ? "Queues" : "All"}
            </Button>
          ))}
        </div>
        <Select value={String(rangeMinutes)} onValueChange={(v) => setRangeMinutes(Number(v))}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.minutes} value={String(o.minutes)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Flat / Tree / Roots — how dispatch hierarchy is shown */}
        <div className="flex overflow-hidden rounded-md border">
          <Button
            variant={viewMode === "flat" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-none px-3 text-xs"
            title="Every run as its own row"
            onClick={() => setViewMode("flat")}
          >
            <ListIcon className="mr-1.5 size-3.5" /> Flat
          </Button>
          <Button
            variant={viewMode === "tree" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-none px-3 text-xs"
            title="Nest runs under the worker that dispatched them (expand/collapse)"
            onClick={() => setViewMode("tree")}
          >
            <ListTree className="mr-1.5 size-3.5" /> Tree
          </Button>
          <Button
            variant={viewMode === "roots" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-none px-3 text-xs"
            title="Only top-level runs — hide runs dispatched by another worker"
            onClick={() => setViewMode("roots")}
          >
            <Crown className="mr-1.5 size-3.5" /> Roots
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => {
            setSize(1)
            setReloadKey((k) => k + 1)
          }}
          disabled={isValidating}
        >
          <RefreshCcw className={`mr-2 size-4 ${isValidating ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {data && !data.queueStoreAvailable && kind !== "worker" && (
        <p className="text-[11px] text-muted-foreground">
          Queue history needs the project&apos;s job-store credentials (env access). Showing worker runs only.
        </p>
      )}
      {data && !data.enriched && (
        <p className="text-[11px] text-muted-foreground">
          Hierarchy and &quot;triggered by&quot; need the project&apos;s job-store credentials (env
          access) — runs are shown flat and unlabeled.
        </p>
      )}
      {data?.enriched && viewMode !== "flat" && !hasHierarchy && (
        <p className="text-[11px] text-muted-foreground">
          Tree and Roots only differ from Flat when a worker <strong>dispatches other workers</strong>
          {" "}— none in this window, so every run is top-level. (A queue&apos;s steps aren&apos;t
          separate rows; open a queue run to see its step chain.)
        </p>
      )}

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="size-8 text-amber-500" />
            <div className="text-sm text-muted-foreground">
              {(error as Error).message || "Failed to load run history."}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSize(1); setReloadKey((k) => k + 1) }}>
              <RefreshCcw className="mr-2 size-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : !runs.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <History className="size-8 text-muted-foreground" />
            <div className="text-sm font-medium">No runs in this window</div>
            <p className="max-w-md text-xs text-muted-foreground">
              Trigger a worker or queue, or widen the time range. Worker runs appear here once the
              redeployed runtime has emitted its run markers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">Run</th>
                <th className="px-3 py-2 font-medium">Triggered by</th>
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ run: r, depth, childCount }) => {
                const st = STATUS_STYLE[r.status]
                const token = getGroupColorToken(getGroupLabel(r.group))
                const isExpanded = expanded.has(r.jobId)
                return (
                  <tr
                    key={`${r.kind}:${r.jobId}`}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2" style={depth ? { paddingLeft: depth * 20 } : undefined}>
                        {viewMode === "tree" && childCount > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(r.jobId)
                            }}
                            title={isExpanded ? "Collapse children" : `Expand ${childCount} child run${childCount === 1 ? "" : "s"}`}
                            className="-ml-1 rounded p-0.5 hover:bg-accent"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-3.5 text-muted-foreground" />
                            )}
                          </button>
                        ) : viewMode === "tree" ? (
                          <span className="inline-block w-4 shrink-0" />
                        ) : null}
                        {r.kind === "queue" ? (
                          <Layers className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <Zap className="size-3.5 shrink-0 text-amber-500" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {r.kind === "queue" ? r.queueId || r.jobId : r.workerId}
                            {r.kind === "queue" && r.stepCount != null && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground">
                                {r.stepCount} step{r.stepCount === 1 ? "" : "s"}
                              </span>
                            )}
                            {viewMode !== "flat" && childCount > 0 && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground">
                                {childCount} child{childCount === 1 ? "" : "ren"}
                              </span>
                            )}
                          </div>
                          <div className="truncate font-mono text-[10px] text-muted-foreground">{r.jobId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.trigger ? (
                        <TriggerBadge trigger={r.trigger} />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.group && r.group !== "—" ? (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[10px]"
                          style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
                        >
                          {getGroupLabel(r.group)}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                        <span className={`size-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground" title={r.startedAt}>
                      {timeAgo(r.startedAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Load more — appends the next page from the cached full list (no re-scan). Hidden when
              a client-side search is active (paging over a filtered subset would be confusing). */}
          {hasMore && !search.trim() && (
            <div className="flex items-center justify-center gap-3 border-t p-2">
              <span className="text-[11px] text-muted-foreground">
                Showing {runs.length} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={loadingMore}
                onClick={() => setSize(size + 1)}
              >
                {loadingMore ? (
                  <RefreshCcw className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="mr-1.5 size-3.5" />
                )}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
