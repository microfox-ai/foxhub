"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { normalizeStage } from "@/components/subapps/console/lib/console-api"
import { useAws, type UrlMap } from "@/components/subapps/console/context/aws-context"
import { beautifyFunctionName } from "@/components/subapps/console/lib/console-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { CloudWatchLogsViewer } from "@/components/subapps/console/components/cloudwatch-logs-viewer"
import { FunctionAnalyticsPanel } from "@/components/subapps/console/components/function-analytics-panel"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { RefreshCcw, ChevronLeft, ChevronRight, Calendar } from "lucide-react"

const TIME_PRESETS = [
  { label: "10m", minutes: 10 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "3h", minutes: 180 },
  { label: "6h", minutes: 360 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
] as const

function parseRangeMinutes(val: string | null): number {
  if (!val) return 30
  const n = parseInt(val, 10)
  if (Number.isNaN(n)) return 360
  return Math.max(1, Math.min(43200, n))
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MetricCard({
  title,
  value,
  unit,
  tone = "default",
}: {
  title: string
  value: string | number
  unit?: string
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "danger"
          ? "text-red-600 dark:text-red-400"
          : ""
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>
          {value}
          {unit ? (
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function getPeriodMsForRangeMinutes(rangeMinutes: number): number {
  if (rangeMinutes <= 24 * 60) return 5 * 60 * 1000
  if (rangeMinutes <= 7 * 24 * 60) return 60 * 60 * 1000
  return 6 * 60 * 60 * 1000
}

export function InfrastructureTab({ projectId }: { projectId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fnTabsListRef = useRef<HTMLDivElement>(null)
  const { state } = useConsole()
  const { state: aws, loadLogs, loadAnalytics, cacheKey } = useAws()
  // Scope observability to the selected stage. Mirrors env-tab: only multi-stage projects
  // send a stage (single-stage/legacy projects stay on the all-stages request shape).
  const stageParam =
    state.availableStages.length > 1 ? state.selectedStage : undefined
  const project = state.currentProject && state.currentProject.id === projectId ? state.currentProject : undefined

  const obsFn = searchParams.get("obs_fn") ?? "ALL"
  const obsGroup = searchParams.get("obs_group")
  const obsRangeMinutes = parseRangeMinutes(searchParams.get("obs_range"))
  const [obsPattern, setObsPattern] = useState("")
  const obsCustomStart = searchParams.get("obs_start")
  const obsCustomEnd = searchParams.get("obs_end")
  const useCustomRange = !!(obsCustomStart && obsCustomEnd)

  const updateParams = useCallback(
    (updates: {
      obs_fn?: string
      obs_group?: string | null
      obs_range?: number
      obs_start?: string | null
      obs_end?: string | null
    }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.obs_fn !== undefined) params.set("obs_fn", updates.obs_fn)
      if (updates.obs_group !== undefined) {
        if (updates.obs_group) params.set("obs_group", updates.obs_group)
        else params.delete("obs_group")
      }
      if (updates.obs_range !== undefined)
        params.set("obs_range", String(updates.obs_range))
      if (updates.obs_start !== undefined) {
        if (updates.obs_start) params.set("obs_start", updates.obs_start)
        else params.delete("obs_start")
      }
      if (updates.obs_end !== undefined) {
        if (updates.obs_end) params.set("obs_end", updates.obs_end)
        else params.delete("obs_end")
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const urlsMap = useMemo(() => (project?.urlsMap || []) as UrlMap[], [project])

  const awsFns = useMemo(() => {
    const allFunctions = urlsMap
      .filter(
        (u) =>
          (!stageParam || normalizeStage(u.stage) === stageParam) &&
          u.type === "agent" &&
          !!u.service?.providerConfig?.resources?.length
      )
      .flatMap((u) => {
        const urlMapGroup = getGroupLabel(u.group)
        const resources = u.service?.providerConfig?.resources || []
        return resources.flatMap((resource) => {
          if (resource.type !== "lambda" || !resource.name) return []
          const group = getGroupLabel((resource as { group?: string }).group || urlMapGroup)
          return [{
            arn: resource.arn,
            region: resource.region || "us-east-1",
            name: resource.name,
            group,
            apiEndpoints: resource.apiEndpoints || [],
          }]
        })
      })

    const deduped = new Map<string, (typeof allFunctions)[number]>()
    for (const fn of allFunctions) {
      const key = `${fn.group}:${fn.name}:${fn.arn || "no-arn"}`
      if (!deduped.has(key)) deduped.set(key, fn)
    }
    return Array.from(deduped.values())
  }, [urlsMap, stageParam])

  const sortedFns = useMemo(() => {
    return [...awsFns].sort((a, b) =>
      a.group !== b.group
        ? a.group!.localeCompare(b.group!)
        : beautifyFunctionName(a.name).localeCompare(beautifyFunctionName(b.name))
    )
  }, [awsFns])

  const groupedFunctions = useMemo(() => {
    const grouped = new Map<string, typeof sortedFns>()
    for (const fn of sortedFns) {
      const key = getGroupLabel(fn.group)
      const existing = grouped.get(key) || []
      existing.push(fn)
      grouped.set(key, existing)
    }
    return grouped
  }, [sortedFns])

  const groupNames = useMemo(
    () => Array.from(groupedFunctions.keys()).sort((a, b) => a.localeCompare(b)),
    [groupedFunctions]
  )

  const loadOpts = useMemo(() => {
    if (useCustomRange && obsCustomStart && obsCustomEnd) {
      const start = new Date(obsCustomStart).getTime()
      const end = new Date(obsCustomEnd).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && start < end) {
        return { startTime: start, endTime: end } as const
      }
    }
    return { rangeMinutes: obsRangeMinutes } as const
  }, [useCustomRange, obsCustomStart, obsCustomEnd, obsRangeMinutes])

  useEffect(() => {
    if (projectId && awsFns.length) {
      loadLogs(projectId, awsFns, {
        ...loadOpts,
        filterPattern: obsPattern || undefined,
        functionName: "ALL",
      }, stageParam)
      const analyticsOpts =
        "startTime" in loadOpts && "endTime" in loadOpts
          ? { startTime: loadOpts.startTime, endTime: loadOpts.endTime }
          : { rangeHours: loadOpts.rangeMinutes / 60 }
      queueMicrotask(() => {
        loadAnalytics(projectId, awsFns, analyticsOpts, stageParam)
      })
    }
  }, [projectId, awsFns.length, loadOpts, stageParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => {
    loadLogs(projectId, awsFns, {
      ...loadOpts,
      filterPattern: obsPattern || undefined,
      functionName: "ALL",
    }, stageParam)
    const analyticsOpts =
      "startTime" in loadOpts && "endTime" in loadOpts
        ? { startTime: loadOpts.startTime, endTime: loadOpts.endTime }
        : { rangeHours: loadOpts.rangeMinutes / 60 }
    queueMicrotask(() => {
      loadAnalytics(projectId, awsFns, analyticsOpts, stageParam)
    })
  }

  const scrollTabs = useCallback((dir: "left" | "right") => {
    const el = fnTabsListRef.current
    if (!el) return
    el.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" })
  }, [])

  const awsKey = cacheKey(projectId, stageParam)
  const resp = aws.logsByProject[awsKey]
  const byFn = resp?.byFunction || {}
  const items = aws.analyticsByProject[awsKey] || []

  const overall = useMemo(() => {
    const totalInvocations = items.reduce(
      (acc, it) =>
        acc + (it.metrics.invocations?.reduce((a, i) => a + i.value, 0) || 0),
      0
    )
    const totalErrors = items.reduce(
      (acc, it) =>
        acc + (it.metrics.errors?.reduce((a, i) => a + i.value, 0) || 0),
      0
    )
    const avgDuration =
      items.length > 0
        ? items.reduce(
            (acc, it) =>
              acc +
              (it.metrics.duration?.reduce((a, i) => a + i.value, 0) || 0),
            0
          ) /
          items.reduce(
            (acc, it) => acc + (it.metrics.duration?.length || 0),
            0
          )
        : 0
    const successRate =
      totalInvocations > 0
        ? ((totalInvocations - totalErrors) / totalInvocations) * 100
        : 100
    return {
      totalInvocations,
      totalErrors,
      avgDuration,
      successRate,
    }
  }, [items])

  const [showAnalytics, setShowAnalytics] = useState(true)
  const [visibleFunctions, setVisibleFunctions] = useState<Set<string> | null>(
    null
  )
  const getFnVisibilityKey = useCallback(
    (f: { group?: string; name: string; arn?: string }) =>
      `${getGroupLabel(f.group)}::${f.name}::${f.arn || "no-arn"}`,
    []
  )
  const visibleFns = useMemo(() => {
    if (visibleFunctions === null)
      return new Set(sortedFns.map((f) => getFnVisibilityKey(f)))
    return visibleFunctions
  }, [visibleFunctions, sortedFns, getFnVisibilityKey])
  const toggleFunctionVisibility = useCallback((key: string) => {
    setVisibleFunctions((prev) => {
      const base = prev ?? new Set(sortedFns.map((f) => getFnVisibilityKey(f)))
      const next = new Set(base)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [sortedFns, getFnVisibilityKey])
  const showAllFunctions = useCallback(() => {
    setVisibleFunctions(null)
  }, [])
  const hideAllFunctions = useCallback(() => {
    setVisibleFunctions(new Set())
  }, [])
  const showGroupFunctions = useCallback((groupName: string) => {
    setVisibleFunctions((prev) => {
      const base = prev ?? new Set(sortedFns.map((f) => getFnVisibilityKey(f)))
      const next = new Set(base)
      const groupFns = groupedFunctions.get(groupName) || []
      for (const fn of groupFns) next.add(getFnVisibilityKey(fn))
      return next
    })
  }, [groupedFunctions, sortedFns, getFnVisibilityKey])
  const hideGroupFunctions = useCallback((groupName: string) => {
    setVisibleFunctions((prev) => {
      const base = prev ?? new Set(sortedFns.map((f) => getFnVisibilityKey(f)))
      const next = new Set(base)
      const groupFns = groupedFunctions.get(groupName) || []
      for (const fn of groupFns) next.delete(getFnVisibilityKey(fn))
      return next
    })
  }, [groupedFunctions, sortedFns, getFnVisibilityKey])

  const fnToGroup = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of sortedFns) {
      if (!m.has(f.name)) m.set(f.name, getGroupLabel(f.group))
    }
    return m
  }, [sortedFns])

  const inferredGroupFromFn = obsFn !== "ALL" ? fnToGroup.get(obsFn) : null
  const selectedGroup =
    inferredGroupFromFn ||
    (obsGroup && groupNames.includes(obsGroup) ? obsGroup : null)

  const functionsInSelectedGroup = selectedGroup
    ? groupedFunctions.get(selectedGroup) || []
    : []
  const selectedGroupColor = getGroupColorToken(selectedGroup || undefined)

  const validFnTab = sortedFns.some((f) => f.name === obsFn) ? obsFn : "ALL"
  const effectiveFnTab =
    validFnTab === "ALL" && functionsInSelectedGroup.length > 0 && selectedGroup
      ? functionsInSelectedGroup[0]!.name
      : validFnTab

  const isLoading = aws.loadingLogs || aws.loadingAnalytics
  const periodMs = useMemo(() => {
    if (useCustomRange && obsCustomStart && obsCustomEnd) {
      const start = new Date(obsCustomStart).getTime()
      const end = new Date(obsCustomEnd).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && start < end) {
        const spanMinutes = (end - start) / (60 * 1000)
        return getPeriodMsForRangeMinutes(spanMinutes)
      }
    }
    return getPeriodMsForRangeMinutes(obsRangeMinutes)
  }, [useCustomRange, obsCustomStart, obsCustomEnd, obsRangeMinutes])

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {TIME_PRESETS.map((p) => (
            <Button
              key={p.minutes}
              variant={
                !useCustomRange && obsRangeMinutes === p.minutes
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                updateParams({
                  obs_range: p.minutes,
                  obs_start: null,
                  obs_end: null,
                })
              }
            >
              {p.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={useCustomRange ? "secondary" : "outline"}
                size="sm"
              >
                <Calendar className="mr-2 size-4" />
                Custom range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocalValue(obsCustomStart)}
                    onChange={(e) => {
                      const v = e.target.value
                      updateParams({
                        obs_start: v ? new Date(v).toISOString() : null,
                      })
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocalValue(obsCustomEnd)}
                    onChange={(e) => {
                      const v = e.target.value
                      updateParams({
                        obs_end: v ? new Date(v).toISOString() : null,
                      })
                    }}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateParams({ obs_start: null, obs_end: null })
                  }
                >
                  Clear custom range
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Input
          placeholder="Filter pattern (e.g. ERROR)"
          value={obsPattern}
          onChange={(e) => setObsPattern(e.target.value)}
          className="max-w-[200px] h-9"
        />
        {obsFn !== "ALL" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics((v) => !v)}
          >
            {showAnalytics ? "Hide" : "Show"} analytics
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={!awsFns.length || isLoading}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
        {isLoading && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
        {aws.logsError && (
          <span className="text-sm text-destructive">{aws.logsError}</span>
        )}
        {aws.analyticsError && (
          <span className="text-sm text-destructive">{aws.analyticsError}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={obsFn === "ALL" ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateParams({ obs_fn: "ALL", obs_group: null })}
        >
          Compact View
        </Button>
        {groupNames.map((groupName) => {
          const token = getGroupColorToken(groupName)
          const isActive = selectedGroup === groupName && obsFn !== "ALL"
          return (
            <Button
              key={groupName}
              variant="outline"
              size="sm"
              onClick={() => {
                const groupFns = groupedFunctions.get(groupName) || []
                const nextFn = groupFns.some((f) => f.name === obsFn)
                  ? obsFn
                  : (groupFns[0]?.name ?? "ALL")
                updateParams({ obs_group: groupName, obs_fn: nextFn })
              }}
              style={{
                backgroundColor: token.bg,
                borderColor: isActive ? token.border : `${token.border}99`,
                color: token.text,
              }}
            >
              {groupName}
            </Button>
          )
        })}
      </div>

      {selectedGroup && functionsInSelectedGroup.length > 0 && obsFn !== "ALL" && (
        <Tabs
          value={effectiveFnTab}
          onValueChange={(v) => updateParams({ obs_fn: v, obs_group: selectedGroup })}
          className="w-full min-w-0"
        >
          <div className="flex items-center gap-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => scrollTabs("left")}
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div
              ref={fnTabsListRef}
              className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth"
            >
              <TabsList
                className="inline-flex flex-nowrap h-9 w-max gap-1 [&>button]:flex-shrink-0"
                style={{
                  backgroundColor: selectedGroupColor.bg,
                  border: `1px solid ${selectedGroupColor.border}`,
                }}
              >
                {functionsInSelectedGroup.map((f) => (
                  <TabsTrigger key={getFnVisibilityKey(f)} value={f.name}>
                    {beautifyFunctionName(f.name)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => scrollTabs("right")}
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </Tabs>
      )}

      <div className="mt-1 min-w-0">
        {isLoading && !resp && items.length === 0 ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-[300px] flex-1 rounded-lg" />
              <Skeleton className="h-[300px] flex-1 rounded-lg" />
            </div>
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <RefreshCcw className="size-4 animate-spin" />
              <span>Fetching data...</span>
            </div>
          </div>
        ) : obsFn === "ALL" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <MetricCard
                title="Total Invocations"
                value={overall.totalInvocations.toLocaleString()}
              />
              <MetricCard
                title="Total Errors"
                value={overall.totalErrors.toLocaleString()}
                tone={overall.totalErrors > 0 ? "danger" : "default"}
              />
              <MetricCard
                title="Success Rate"
                value={`${overall.successRate.toFixed(2)}%`}
                tone={
                  overall.successRate >= 99
                    ? "success"
                    : overall.successRate >= 90
                      ? "warning"
                      : "danger"
                }
              />
              <MetricCard
                title="Avg Duration"
                value={overall.avgDuration.toFixed(2)}
                unit="ms"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-1 py-2 mb-2">
              <span className="text-xs text-muted-foreground">
                Showing {sortedFns.filter((f) => visibleFns.has(getFnVisibilityKey(f))).length}/
                {sortedFns.length} functions
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={showAllFunctions}
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={hideAllFunctions}
                >
                  None
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Manage functions
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[380px] p-3">
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {groupNames.map((groupName) => {
                        const token = getGroupColorToken(groupName)
                        const groupFns = groupedFunctions.get(groupName) || []
                        const visibleInGroup = groupFns.filter((f) =>
                          visibleFns.has(getFnVisibilityKey(f))
                        ).length
                        return (
                          <div
                            key={groupName}
                            className="rounded-md border p-2 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  variant="outline"
                                  style={{
                                    backgroundColor: token.bg,
                                    borderColor: token.border,
                                    color: token.text,
                                  }}
                                >
                                  {groupName}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {visibleInGroup}/{groupFns.length}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => showGroupFunctions(groupName)}
                                >
                                  Show
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => hideGroupFunctions(groupName)}
                                >
                                  Hide
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 max-h-[120px] overflow-auto pr-1">
                              {groupFns.map((f) => (
                                <label
                                  key={getFnVisibilityKey(f)}
                                  className="flex items-center gap-2 text-xs cursor-pointer"
                                >
                                  <Checkbox
                                    checked={visibleFns.has(getFnVisibilityKey(f))}
                                    onCheckedChange={() =>
                                      toggleFunctionVisibility(getFnVisibilityKey(f))
                                    }
                                  />
                                  <span className="truncate">
                                    {beautifyFunctionName(f.name)}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedFns
                .filter((f) => visibleFns.has(getFnVisibilityKey(f)))
                .map((f) => {
                  const events = (byFn[f.name] || []).sort(
                    (a, b) => a.timestamp - b.timestamp
                  )
                  const groupLabel = getGroupLabel(f.group)
                  const token = getGroupColorToken(groupLabel)
                  return (
                    <Card key={getFnVisibilityKey(f)} className="min-w-0 overflow-hidden">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm">
                            {beautifyFunctionName(f.name)}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: token.bg,
                              borderColor: token.border,
                              color: token.text,
                            }}
                          >
                            {groupLabel}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(f.apiEndpoints || [])
                            .map((e) => `${e.method} ${e.path}`)
                            .join(", ") || "No API endpoints"}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 pt-0">
                        <CloudWatchLogsViewer
                          events={events}
                          className="border-0"
                          compact
                          isLoading={isLoading}
                        />
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </>
        ) : (
          <FunctionSplitView
            functionName={effectiveFnTab}
            events={(byFn[effectiveFnTab] || []).sort(
              (a, b) => a.timestamp - b.timestamp
            )}
            analyticsItem={items.find((it) => it.ref.name === effectiveFnTab)}
            isLoading={isLoading}
            periodMs={periodMs}
            showAnalytics={showAnalytics}
          />
        )}
      </div>
    </div>
  )
}

const ANALYTICS_MIN_HEIGHT = 652

function FunctionSplitView({
  functionName,
  events,
  analyticsItem,
  isLoading,
  periodMs,
  showAnalytics,
}: {
  functionName: string
  events: { id?: string; timestamp: number; message: string }[]
  analyticsItem?:
    | {
        ref: { name: string }
        metrics: Record<string, { timestamp: number; value: number }[]>
      }
    | undefined
  isLoading: boolean
  periodMs: number
  showAnalytics: boolean
}) {
  const [highlightTimeRange, setHighlightTimeRange] = useState<{
    start: number
    end: number
  } | null>(null)

  const handleDataPointClick = useCallback((start: number, end: number) => {
    setHighlightTimeRange({ start, end })
  }, [])

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {highlightTimeRange && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Highlighting logs for selected time range.{" "}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setHighlightTimeRange(null)}
          >
            Clear highlight
          </Button>
        </div>
      )}
      <div
        className={
          showAnalytics
            ? "grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4 min-w-0"
            : "min-w-0"
        }
      >
        <div
          className="min-w-0"
          style={{ minHeight: showAnalytics ? ANALYTICS_MIN_HEIGHT : undefined }}
        >
          <CloudWatchLogsViewer
            events={events}
            isLoading={isLoading}
            highlightTimeRange={highlightTimeRange}
            scrollMinHeight={showAnalytics ? ANALYTICS_MIN_HEIGHT : undefined}
          />
        </div>
        {showAnalytics && (
          <div className="min-w-0 overflow-auto">
            {analyticsItem ? (
              <FunctionAnalyticsPanel
                metrics={analyticsItem.metrics}
                periodMs={periodMs}
                onDataPointClick={handleDataPointClick}
                highlightTimeRange={highlightTimeRange}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[400px] rounded-lg border border-dashed bg-muted/30 text-muted-foreground text-sm">
                No analytics data for {beautifyFunctionName(functionName)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
