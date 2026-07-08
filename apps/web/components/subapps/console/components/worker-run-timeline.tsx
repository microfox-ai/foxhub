"use client"

import { useEffect, useMemo, useState } from "react"
import type { WorkerJobNode } from "@/components/subapps/console/lib/console-api"
import {
  STATUS_META,
  isTerminal,
  treeSettled,
  findAncestry,
  firstAwaitingJobId,
  walkTree,
  NodeDetailPanel,
} from "@/components/subapps/console/components/worker-run-shared"
import { Badge } from "@/components/ui/badge"
import { Crown } from "lucide-react"

const ROW_H = 30 // px per timeline row
const GUTTER = "180px"
const HITL_COLOR = "#8b5cf6" // violet — matches the HITL approval badge; the "waiting on a human" bar

/** ms a step has been parked awaiting HITL approval (from awaitingSince → now), or 0 if not parked. */
function hitlWaitMs(n: WorkerJobNode, now: number): number {
  if (!n.awaitingApproval) return 0
  const since = n.awaitingSince ?? n.createdAt
  const t = since ? Date.parse(since) : NaN
  return Number.isNaN(t) ? 0 : Math.max(0, now - t)
}

type Row = {
  node: WorkerJobNode
  depth: number
  start: number
  end: number
  parallel: boolean // overlaps another node in the same depth layer
}

function nodeTimes(n: WorkerJobNode, now: number): { start: number; end: number } {
  const start = n.createdAt ? Date.parse(n.createdAt) : n.updatedAt ? Date.parse(n.updatedAt) : now
  let end: number
  if (n.completedAt) end = Date.parse(n.completedAt)
  else if (isTerminal(n.status)) end = n.updatedAt ? Date.parse(n.updatedAt) : start
  else end = now // queued/running → live edge
  const s = Number.isNaN(start) ? now : start
  let e = Number.isNaN(end) ? s : end
  if (e < s) e = s
  return { start: s, end: e }
}

function fmtOffset(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return `${m}m${s ? ` ${s}s` : ""}`
}

export function WorkerRunTimeline({
  root,
  projectId,
}: {
  root: WorkerJobNode
  projectId: string
}) {
  // Focus the HITL step by default so the reviewer form is visible immediately (else the root).
  const [selectedId, setSelectedId] = useState<string>(() => firstAwaitingJobId(root) ?? root.jobId)
  const now = Date.now()
  const settled = treeSettled(root)

  const { rows, domainStart, span, layerBoundaries } = useMemo(() => {
    const flat: Row[] = []
    // Bounded + cycle-guarded walk (shared) so a malformed/runaway tree can't hang the tab.
    walkTree(root, (n, depth) => {
      const { start, end } = nodeTimes(n, now)
      flat.push({ node: n, depth, start, end, parallel: false })
    })

    // Mark parallelism within each depth layer (any time-overlap with a sibling-layer row).
    const byDepth = new Map<number, Row[]>()
    for (const r of flat) {
      const arr = byDepth.get(r.depth) ?? []
      arr.push(r)
      byDepth.set(r.depth, arr)
    }
    for (const arr of byDepth.values()) {
      for (const a of arr) {
        for (const b of arr) {
          if (a === b) continue
          if (a.start < b.end && b.start < a.end) {
            a.parallel = true
            break
          }
        }
      }
    }

    const domainStart = Math.min(...flat.map((r) => r.start))
    const domainEnd = Math.max(...flat.map((r) => r.end), settled ? -Infinity : now)
    const span = Math.max(1, domainEnd - domainStart)

    // Order rows by depth (layer), then start time.
    flat.sort((a, b) => a.depth - b.depth || a.start - b.start)

    // Record where each new depth layer begins (for separators + labels).
    const layerBoundaries: { index: number; depth: number; parallel: boolean }[] = []
    let lastDepth = -1
    flat.forEach((r, i) => {
      if (r.depth !== lastDepth) {
        layerBoundaries.push({ index: i, depth: r.depth, parallel: false })
        lastDepth = r.depth
      }
    })
    for (const lb of layerBoundaries) {
      lb.parallel = flat.some((r) => r.depth === lb.depth && r.parallel)
    }

    return { rows: flat, domainStart, span, layerBoundaries }
  }, [root, now, settled])

  // Auto-select the awaiting-approval step whenever the tree refreshes so the
  // reviewer panel is visible immediately without requiring a manual click.
  useEffect(() => {
    const current = rows.find((r) => r.node.jobId === selectedId)?.node
    if (current?.awaitingApproval) return // already on the right node
    const hitl = rows.find((r) => r.node.awaitingApproval)
    if (hitl) setSelectedId(hitl.node.jobId)
  }, [rows, selectedId])

  const pct = (t: number) => Math.max(0, Math.min(100, ((t - domainStart) / span) * 100))
  const nowPct = pct(now)
  const boundaryAt = new Map(layerBoundaries.map((b) => [b.index, b]))

  // Axis ticks (~5 evenly spaced).
  const ticks = useMemo(() => {
    const n = 5
    return Array.from({ length: n + 1 }, (_, i) => ({
      left: (i / n) * 100,
      label: fmtOffset((span * i) / n),
    }))
  }, [span])

  const selectedNode = rows.find((r) => r.node.jobId === selectedId)?.node ?? root
  const trace = useMemo(() => findAncestry(root, selectedId), [root, selectedId])

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Execution timeline · layers = depth · overlapping bars ran in parallel
          </span>
          <div className="flex items-center gap-3">
            {rows.some((r) => r.node.awaitingApproval) && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: HITL_COLOR }}>
                <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: HITL_COLOR }} />
                awaiting approval (HITL wait)
              </span>
            )}
            {!settled && <span className="text-[10px] text-blue-600 dark:text-blue-400">live</span>}
          </div>
        </div>

        <div className="overflow-x-auto p-3">
          {/* Time axis */}
          <div className="relative mb-1 h-4" style={{ marginLeft: GUTTER }}>
            {ticks.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 -translate-x-1/2 text-[9px] text-muted-foreground"
                style={{ left: `${t.left}%` }}
              >
                {t.label}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Gutter: per-row labels */}
            <div style={{ width: GUTTER }} className="shrink-0">
              {rows.map((r) => {
                const isRoot = r.node.jobId === root.jobId
                const selected = r.node.jobId === selectedId
                return (
                  <button
                    key={r.node.jobId}
                    onClick={() => setSelectedId(r.node.jobId)}
                    className={`flex h-[30px] w-full items-center gap-1.5 pr-2 text-left ${
                      selected ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    style={{ height: ROW_H }}
                  >
                    <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">
                      L{r.depth}
                    </Badge>
                    <span className={`size-2 shrink-0 rounded-full ${STATUS_META[r.node.status].dot}`} />
                    {isRoot && <Crown className="size-3 shrink-0 text-amber-500" />}
                    <span className="truncate text-[11px]">{r.node.workerId || "worker"}</span>
                    {r.node.awaited === false && (
                      <span className="shrink-0 text-[9px] text-muted-foreground" title="fire-and-forget dispatch">
                        ⤳
                      </span>
                    )}
                    {r.node.awaited === true && (
                      <span className="shrink-0 text-[9px] text-violet-500" title="parent awaited this child">
                        ⏳
                      </span>
                    )}
                    {r.node.awaitingApproval && (
                      <span
                        className="ml-auto shrink-0 font-mono text-[9px] font-semibold tabular-nums"
                        style={{ color: HITL_COLOR }}
                        title={`Awaiting human approval · waiting ${fmtOffset(hitlWaitMs(r.node, now))}`}
                      >
                        ⏳ {fmtOffset(hitlWaitMs(r.node, now))}
                      </span>
                    )}
                    {r.parallel && !r.node.awaitingApproval && (
                      <span className="ml-auto shrink-0 text-[9px] font-semibold text-primary" title="ran in parallel">
                        ∥
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Track: bars + now-line + layer separators */}
            <div
              className="relative flex-1"
              style={{ height: rows.length * ROW_H, minWidth: 240 }}
            >
              {/* layer separators */}
              {layerBoundaries.slice(1).map((b) => (
                <div
                  key={`sep-${b.index}`}
                  className="absolute inset-x-0 border-t border-dashed border-border"
                  style={{ top: b.index * ROW_H }}
                />
              ))}
              {/* now cursor */}
              {!settled && (
                <div
                  className="absolute top-0 z-10 w-px bg-blue-500/70"
                  style={{ left: `${nowPct}%`, height: rows.length * ROW_H }}
                />
              )}
              {/* bars */}
              {rows.map((r, i) => {
                const meta = STATUS_META[r.node.status]
                const left = pct(r.start)
                const width = Math.max(1.2, pct(r.end) - left)
                const selected = r.node.jobId === selectedId
                const running = !isTerminal(r.node.status)
                const awaiting = !!r.node.awaitingApproval
                const waitMs = hitlWaitMs(r.node, now)
                const dur = fmtOffset(r.end - r.start)
                // Parked-for-approval bars read as a HITL wait: violet + a ⏳ wait-duration label,
                // so the human-in-the-loop time is visible distinctly from compute time.
                const barColor = awaiting ? HITL_COLOR : meta.border
                const label = awaiting ? `⏳ ${fmtOffset(waitMs)}` : dur
                const title = awaiting
                  ? `${r.node.workerId} · awaiting approval · waiting ${fmtOffset(waitMs)}`
                  : `${r.node.workerId} · ${meta.label} · ${dur}`
                return (
                  <div key={r.node.jobId} className="absolute inset-x-0" style={{ top: i * ROW_H, height: ROW_H }}>
                    <button
                      onClick={() => setSelectedId(r.node.jobId)}
                      title={title}
                      className={`absolute top-1/2 flex h-4 -translate-y-1/2 items-center overflow-hidden rounded px-1 text-[9px] text-white transition-all ${
                        running && !awaiting ? "animate-pulse" : ""
                      } ${awaiting ? "ring-1 ring-violet-300/60" : ""} ${
                        selected ? "ring-2 ring-offset-1 ring-primary" : "hover:brightness-110"
                      }`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: barColor,
                        minWidth: 6,
                        ...(awaiting
                          ? { backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.18) 4px,rgba(255,255,255,.18) 8px)" }
                          : {}),
                      }}
                    >
                      {width > 8 && <span className="truncate">{label}</span>}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedNode && (
        <NodeDetailPanel
          projectId={projectId}
          node={selectedNode}
          trace={trace}
          isRoot={selectedNode.jobId === root.jobId}
          onSelect={setSelectedId}
        />
      )}
    </div>
  )
}
