"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { useAws, type UrlMap } from "@/components/subapps/console/context/aws-context"
import { beautifyFunctionName } from "@/components/subapps/console/lib/console-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { CloudWatchLogsViewer } from "@/components/subapps/console/components/cloudwatch-logs-viewer"
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

export function LogsTab({ projectId }: { projectId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabsListRef = useRef<HTMLDivElement>(null)
  const { state } = useConsole()
  const { state: aws, loadLogs } = useAws()
  const project = state.projects.find((p) => p.id === projectId)

  const logsFn = searchParams.get("logs_fn") ?? "ALL"
  const logsRangeMinutes = parseRangeMinutes(searchParams.get("logs_range"))
  const [logsPattern, setLogsPattern] = useState("")
  const logsCustomStart = searchParams.get("logs_start")
  const logsCustomEnd = searchParams.get("logs_end")
  const useCustomRange = !!(logsCustomStart && logsCustomEnd)

  const updateParams = useCallback(
    (updates: {
      logs_fn?: string
      logs_range?: number
      logs_start?: string | null
      logs_end?: string | null
    }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.logs_fn !== undefined) params.set("logs_fn", updates.logs_fn)
      if (updates.logs_range !== undefined)
        params.set("logs_range", String(updates.logs_range))
      if (updates.logs_start !== undefined) {
        if (updates.logs_start) params.set("logs_start", updates.logs_start)
        else params.delete("logs_start")
      }
      if (updates.logs_end !== undefined) {
        if (updates.logs_end) params.set("logs_end", updates.logs_end)
        else params.delete("logs_end")
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

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

  const sortedFns = useMemo(() => {
    return [...awsFns].sort((a, b) =>
      beautifyFunctionName(a.name).localeCompare(beautifyFunctionName(b.name)),
    )
  }, [awsFns])

  const loadOpts = useMemo(() => {
    if (useCustomRange && logsCustomStart && logsCustomEnd) {
      const start = new Date(logsCustomStart).getTime()
      const end = new Date(logsCustomEnd).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && start < end) {
        return { startTime: start, endTime: end } as const
      }
    }
    return { rangeMinutes: logsRangeMinutes } as const
  }, [useCustomRange, logsCustomStart, logsCustomEnd, logsRangeMinutes])

  useEffect(() => {
    if (projectId && awsFns.length) {
      loadLogs(projectId, awsFns, {
        ...loadOpts,
        filterPattern: logsPattern || undefined,
        functionName: "ALL",
      })
    }
  }, [projectId, awsFns.length, loadOpts]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => {
    loadLogs(projectId, awsFns, {
      ...loadOpts,
      filterPattern: logsPattern || undefined,
      functionName: "ALL",
    })
  }

  const scrollTabs = useCallback((dir: "left" | "right") => {
    const el = tabsListRef.current
    if (!el) return
    el.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" })
  }, [])

  const resp = aws.logsByProject[projectId]
  const byFn = resp?.byFunction || {}

  const [visibleFunctions, setVisibleFunctions] = useState<Set<string> | null>(null)
  const visibleFns = useMemo(() => {
    if (visibleFunctions === null) return new Set(sortedFns.map((f) => f.name))
    return visibleFunctions
  }, [visibleFunctions, sortedFns])
  const toggleFunctionVisibility = useCallback((name: string) => {
    setVisibleFunctions((prev) => {
      const base = prev ?? new Set(sortedFns.map((f) => f.name))
      const next = new Set(base)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [sortedFns])
  const showAllFunctions = useCallback(() => {
    setVisibleFunctions(null)
  }, [])
  const hideAllFunctions = useCallback(() => {
    setVisibleFunctions(new Set())
  }, [])

  const fnTabValue = logsFn === "ALL" ? "ALL" : logsFn
  const validFnTab =
    fnTabValue === "ALL" || awsFns.some((f) => f.name === fnTabValue)
      ? fnTabValue
      : "ALL"

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {TIME_PRESETS.map((p) => (
            <Button
              key={p.minutes}
              variant={
                !useCustomRange && logsRangeMinutes === p.minutes
                  ? "secondary"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                updateParams({
                  logs_range: p.minutes,
                  logs_start: null,
                  logs_end: null,
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
                    value={toDatetimeLocalValue(logsCustomStart)}
                    onChange={(e) => {
                      const v = e.target.value
                      updateParams({
                        logs_start: v ? new Date(v).toISOString() : null,
                      })
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocalValue(logsCustomEnd)}
                    onChange={(e) => {
                      const v = e.target.value
                      updateParams({
                        logs_end: v ? new Date(v).toISOString() : null,
                      })
                    }}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateParams({ logs_start: null, logs_end: null })
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
          value={logsPattern}
          onChange={(e) => setLogsPattern(e.target.value)}
          className="max-w-[200px] h-9"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={!awsFns.length || aws.loadingLogs}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
        {aws.loadingLogs && (
          <span className="text-sm text-muted-foreground">Loading logs...</span>
        )}
        {aws.logsError && (
          <span className="text-sm text-destructive">{aws.logsError}</span>
        )}
      </div>

      <Tabs
        value={validFnTab}
        onValueChange={(v) => updateParams({ logs_fn: v })}
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
            ref={tabsListRef}
            className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth"
          >
            <TabsList className="inline-flex flex-nowrap h-9 w-max gap-1 [&>button]:flex-shrink-0">
              <TabsTrigger value="ALL">All Function Logs</TabsTrigger>
              {sortedFns.map((f) => (
                <TabsTrigger key={f.arn} value={f.name}>
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
        <TabsContent value={validFnTab} className="mt-4 min-w-0">
          {aws.loadingLogs && !resp ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-[300px] flex-1 rounded-lg" />
                <Skeleton className="h-[300px] flex-1 rounded-lg" />
              </div>
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <RefreshCcw className="size-4 animate-spin" />
                <span>Fetching CloudWatch logs...</span>
              </div>
            </div>
          ) : validFnTab === "ALL" ? (
            <>
              <div className="flex flex-wrap items-center gap-4 px-1 py-2 mb-2">
                <span className="text-xs text-muted-foreground">Show functions:</span>
                {sortedFns.map((f) => (
                  <label
                    key={f.arn}
                    className="flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={visibleFns.has(f.name)}
                      onCheckedChange={() => toggleFunctionVisibility(f.name)}
                    />
                    <span>{beautifyFunctionName(f.name)}</span>
                  </label>
                ))}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={showAllFunctions}>
                  All
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={hideAllFunctions}>
                  None
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedFns.filter((f) => visibleFns.has(f.name)).map((f) => {
                const events = (byFn[f.name] || []).sort(
                  (a, b) => a.timestamp - b.timestamp,
                )
                return (
                  <Card key={f.arn} className="min-w-0 overflow-hidden">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        {beautifyFunctionName(f.name)}
                      </CardTitle>
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
                        isLoading={aws.loadingLogs}
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            </>
          ) : (
            <CloudWatchLogsViewer
              events={(byFn[validFnTab] || []).sort(
                (a, b) => a.timestamp - b.timestamp,
              )}
              isLoading={aws.loadingLogs}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
