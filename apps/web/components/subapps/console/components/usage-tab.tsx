"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { consoleApi, type UsageResult } from "@/components/subapps/console/lib/console-api"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, AlertTriangle, RefreshCcw, DollarSign, Zap, Layers, Info } from "lucide-react"

const RANGES: { label: string; hours: number }[] = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
]

function fmtUsd(n: number): string {
  if (n === 0) return "$0.00"
  if (n < 0.01) return "<$0.01"
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString()
}
function fmtGbs(n: number): string {
  if (n < 1) return `${n.toFixed(2)} GB-s`
  return `${Math.round(n).toLocaleString()} GB-s`
}
function fmtMs(n: number): string {
  if (!n) return "—"
  if (n < 1000) return `${Math.round(n)}ms`
  return `${(n / 1000).toFixed(2)}s`
}

export function UsageTab({ projectId }: { projectId: string }) {
  const [rangeHours, setRangeHours] = useState(24)
  const [groupBy, setGroupBy] = useState<"function" | "group">("function")

  // Scope usage to the selected stage (multi-stage projects only), so prod and staging
  // costs are never summed together. Stage is part of the SWR key → switching refetches.
  const { state } = useConsole()
  const stageParam = state.availableStages.length > 1 ? state.selectedStage : undefined

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    projectId ? (["console:usage", projectId, rangeHours, stageParam ?? "all"] as const) : null,
    ([, id, hours]) => consoleApi.getUsage({ projectId: id, rangeHours: hours, stage: stageParam }),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <DollarSign className="size-4 text-muted-foreground" /> Usage &amp; cost
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            {RANGES.map((r) => (
              <Button
                key={r.hours}
                variant={rangeHours === r.hours ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-none px-3 text-xs"
                onClick={() => setRangeHours(r.hours)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`mr-2 size-4 ${isValidating ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="size-3" /> Costs are <strong>estimates</strong> from CloudWatch metrics + public
        Lambda pricing (us-east-1 on-demand). They exclude the free tier, provisioned concurrency, and data
        transfer — treat them as directional, not your AWS bill.
      </p>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="size-8 text-amber-500" />
            <div className="text-sm text-muted-foreground">{(error as Error).message || "Failed to load usage."}</div>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCcw className="mr-2 size-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <UsageView data={data} groupBy={groupBy} setGroupBy={setGroupBy} />
      )}
    </div>
  )
}

function UsageView({
  data,
  groupBy,
  setGroupBy,
}: {
  data: UsageResult
  groupBy: "function" | "group"
  setGroupBy: (v: "function" | "group") => void
}) {
  const maxCost = useMemo(() => Math.max(1e-9, ...data.timeline.map((b) => b.estCostUsd)), [data.timeline])

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Estimated cost" value={fmtUsd(data.totals.estCostUsd)} accent />
        <StatCard label="Invocations" value={fmtNum(data.totals.invocations)} />
        <StatCard label="Compute" value={fmtGbs(data.totals.gbSeconds)} />
        <StatCard
          label="Errors"
          value={fmtNum(data.totals.errors)}
          sub={data.totals.invocations > 0 ? `${((data.totals.errors / data.totals.invocations) * 100).toFixed(1)}%` : undefined}
        />
      </div>

      {/* Cost-over-time bar chart */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Activity className="size-3.5" /> Estimated cost over time
          </div>
          {data.timeline.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No activity in this window.</p>
          ) : (
            <div className="flex h-40 items-end gap-px">
              {data.timeline.map((b) => (
                <div
                  key={b.timestamp}
                  className="group relative flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
                  style={{ height: `${Math.max(2, (b.estCostUsd / maxCost) * 100)}%` }}
                  title={`${new Date(b.timestamp).toLocaleString()}\n${fmtUsd(b.estCostUsd)} · ${fmtNum(b.invocations)} invocations`}
                />
              ))}
            </div>
          )}
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>{new Date(data.startTime).toLocaleString()}</span>
            <span>{new Date(data.endTime).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown table */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Breakdown by</span>
        <div className="flex overflow-hidden rounded-md border">
          <Button
            variant={groupBy === "function" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 rounded-none px-3 text-xs"
            onClick={() => setGroupBy("function")}
          >
            <Zap className="mr-1.5 size-3.5" /> Function
          </Button>
          <Button
            variant={groupBy === "group" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 rounded-none px-3 text-xs"
            onClick={() => setGroupBy("group")}
          >
            <Layers className="mr-1.5 size-3.5" /> Group
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <th className="px-3 py-2 font-medium">{groupBy === "group" ? "Group" : "Function"}</th>
              <th className="px-3 py-2 text-right font-medium">Invocations</th>
              <th className="px-3 py-2 text-right font-medium">Errors</th>
              {groupBy === "function" && <th className="px-3 py-2 text-right font-medium">Avg dur</th>}
              <th className="px-3 py-2 text-right font-medium">Compute</th>
              <th className="px-3 py-2 text-right font-medium">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {groupBy === "group"
              ? data.byGroup.map((g) => {
                  const token = getGroupColorToken(getGroupLabel(g.group))
                  return (
                    <tr key={g.group} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px]"
                          style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
                        >
                          {getGroupLabel(g.group)}
                        </Badge>
                        <span className="ml-2 text-[10px] text-muted-foreground">{g.functions} fn</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(g.invocations)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(g.errors)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtGbs(g.gbSeconds)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtUsd(g.estCostUsd)}</td>
                    </tr>
                  )
                })
              : data.byFunction.map((f) => {
                  const token = getGroupColorToken(getGroupLabel(f.group))
                  return (
                    <tr key={f.name} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{f.beautifiedName}</span>
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px]"
                            style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
                          >
                            {getGroupLabel(f.group)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {f.memoryMb}MB · {f.arch === "arm64" ? "arm" : "x86"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(f.invocations)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${f.errors > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                        {fmtNum(f.errors)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtMs(f.avgDurationMs)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtGbs(f.gbSeconds)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtUsd(f.estCostUsd)}</td>
                    </tr>
                  )
                })}
            {((groupBy === "group" && !data.byGroup.length) || (groupBy === "function" && !data.byFunction.length)) && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No functions found for this project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/40" : undefined}>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}
