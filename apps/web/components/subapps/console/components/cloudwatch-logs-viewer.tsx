"use client"

import { useMemo, useState } from "react"
import type { CloudWatchLogEvent } from "@/components/subapps/console/context/aws-context"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Search,
  CaseSensitive,
  WholeWord,
  Server,
  ServerOff,
  Clock,
  Timer,
  MemoryStick,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

type RequestSortKey = "timestamp" | "duration" | "memory" | "lines"

const LOG_LEVELS = ["INFO", "WARN", "ERROR", "DEBUG", "MEDIUM"] as const
type LogLevel = (typeof LOG_LEVELS)[number]

function parseLogLevel(message: string): LogLevel | null {
  const match = message.match(/\b(INFO|WARN|ERROR|DEBUG|MEDIUM)\b/)
  return match ? (match[1] as LogLevel) : null
}

function isAwsBoilerplate(message: string): boolean {
  return (
    message.includes("INIT_START") ||
    /START RequestId:/.test(message) ||
    /END RequestId:/.test(message) ||
    /REPORT RequestId:/.test(message)
  )
}

function parseReportMetrics(message: string): {
  requestId?: string
  duration?: number
  billedDuration?: number
  memorySize?: number
  maxMemoryUsed?: number
  initDuration?: number
} | null {
  if (!/REPORT RequestId:/.test(message)) return null
  const rid = parseRequestId(message)
  const durationMatch = message.match(/Duration: ([\d.]+) ms/)
  const billedMatch = message.match(/Billed Duration: ([\d.]+) ms/)
  const memSizeMatch = message.match(/Memory Size: ([\d]+) MB/)
  const maxMemMatch = message.match(/Max Memory Used: ([\d]+) MB/)
  const initMatch = message.match(/Init Duration: ([\d.]+) ms/)
  const d = durationMatch?.[1]
  const b = billedMatch?.[1]
  const mem = memSizeMatch?.[1]
  const max = maxMemMatch?.[1]
  const i = initMatch?.[1]
  return {
    requestId: rid ?? undefined,
    duration: d != null ? parseFloat(d) : undefined,
    billedDuration: b != null ? parseFloat(b) : undefined,
    memorySize: mem != null ? parseInt(mem, 10) : undefined,
    maxMemoryUsed: max != null ? parseInt(max, 10) : undefined,
    initDuration: i != null ? parseFloat(i) : undefined,
  }
}

function parseRequestId(message: string): string | null {
  const m = message.match(/RequestId: ([a-f0-9-]+)/)
  return m?.[1] ?? null
}

/** Strip leading ISO timestamp and requestId UUID from log message for display */
function stripTimestampAndRequestId(message: string): string {
  return message
    .replace(/^\d{4}-\d{2}-\d{2}T[\d.:]+Z\s+/i, "")
    .replace(/^[a-f0-9-]{36}\s*/i, "")
    .replace(/^\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)\s*\n?/i, "")
    .trim()
}

type ParsedRequest = {
  id: string
  requestId: string
  startTs: number
  meta: {
    duration?: number
    billedDuration?: number
    memorySize?: number
    maxMemoryUsed?: number
    initDuration?: number
  }
  appLogs: CloudWatchLogEvent[]
  allEvents: CloudWatchLogEvent[]
}

function groupEventsIntoRequests(events: CloudWatchLogEvent[]): ParsedRequest[] {
  const requests: ParsedRequest[] = []
  let reqCounter = 0
  const nextId = () => `req-${reqCounter++}`
  let current: {
    requestId: string
    startTs: number
    meta: ParsedRequest["meta"]
    appLogs: CloudWatchLogEvent[]
    allEvents: CloudWatchLogEvent[]
  } | null = null
  let pendingInit: CloudWatchLogEvent[] = []

  for (const ev of events) {
    const msg = ev.message || ""

    if (msg.includes("INIT_START")) {
      pendingInit.push(ev)
      continue
    }

    if (/START RequestId:/.test(msg) && !msg.includes("END") && !msg.includes("REPORT")) {
      const rid = parseRequestId(msg)
      if (rid) {
        if (current) {
          requests.push({
            id: nextId(),
            requestId: current.requestId,
            startTs: current.startTs,
            meta: current.meta,
            appLogs: current.appLogs,
            allEvents: current.allEvents,
          })
        }
        current = {
          requestId: rid,
          startTs: ev.timestamp,
          meta: {},
          appLogs: [],
          allEvents: [...pendingInit, ev],
        }
        pendingInit = []
      }
      continue
    }

    if (current) {
      current.allEvents.push(ev)
    }

    if (/END RequestId:/.test(msg) || /REPORT RequestId:/.test(msg)) {
      const metrics = parseReportMetrics(msg)
      if (metrics && current) {
        current.meta = {
          duration: metrics.duration ?? current.meta.duration,
          billedDuration: metrics.billedDuration ?? current.meta.billedDuration,
          memorySize: metrics.memorySize ?? current.meta.memorySize,
          maxMemoryUsed: metrics.maxMemoryUsed ?? current.meta.maxMemoryUsed,
          initDuration: metrics.initDuration ?? current.meta.initDuration,
        }
      }
      if (/REPORT RequestId:/.test(msg) && current) {
        requests.push({
          id: nextId(),
          requestId: current.requestId,
          startTs: current.startTs,
          meta: current.meta,
          appLogs: current.appLogs,
          allEvents: current.allEvents,
        })
        current = null
      }
      continue
    }

    if (current && !isAwsBoilerplate(msg)) {
      current.appLogs.push(ev)
    }
  }

  if (current) {
    requests.push({
      id: nextId(),
      requestId: current.requestId,
      startTs: current.startTs,
      meta: current.meta,
      appLogs: current.appLogs,
      allEvents: current.allEvents,
    })
  }

  return requests
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightMatches(
  text: string,
  search: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): React.ReactNode {
  if (!search.trim()) return text
  const escaped = escapeRegex(search)
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
  const flags = caseSensitive ? "g" : "gi"
  const regex = new RegExp(`(${pattern})`, flags)
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-300/80 dark:bg-yellow-600/50 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function textMatchesSearch(
  text: string,
  search: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): boolean {
  if (!search.trim()) return true
  const escaped = escapeRegex(search)
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
  const flags = caseSensitive ? "" : "i"
  return new RegExp(pattern, flags).test(text)
}

function formatRequestDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  })
}

function formatLogTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  })
}

function levelColor(level: LogLevel | null): string {
  switch (level) {
    case "ERROR":
      return "text-destructive"
    case "WARN":
    case "MEDIUM":
      return "text-amber-600 dark:text-amber-500"
    case "DEBUG":
      return "text-muted-foreground"
    default:
      return ""
  }
}

export function CloudWatchLogsViewer({
  events,
  levelFilter,
  className,
  compact,
  isLoading,
  highlightTimeRange,
  scrollMinHeight,
}: {
  events: CloudWatchLogEvent[]
  levelFilter?: LogLevel[]
  className?: string
  compact?: boolean
  isLoading?: boolean
  highlightTimeRange?: { start: number; end: number } | null
  /** When set, the scroll container uses this min-height (e.g. to match analytics section height). */
  scrollMinHeight?: number
}) {
  const [showRaw, setShowRaw] = useState(false)
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set())
  const [sortKey, setSortKey] = useState<RequestSortKey>("timestamp")
  const [sortDesc, setSortDesc] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const rawRequests = useMemo(() => groupEventsIntoRequests(events), [events])

  const requests = useMemo(() => {
    const sorted = [...rawRequests].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "timestamp":
          cmp = a.startTs - b.startTs
          break
        case "duration":
          cmp = (a.meta.duration ?? 0) - (b.meta.duration ?? 0)
          break
        case "memory":
          cmp = (a.meta.maxMemoryUsed ?? 0) - (b.meta.maxMemoryUsed ?? 0)
          break
        case "lines":
          cmp = (showRaw ? a.allEvents : a.appLogs).length - (showRaw ? b.allEvents : b.appLogs).length
          break
      }
      return sortDesc ? -cmp : cmp
    })

    if (!searchQuery.trim()) return sorted

    return sorted.filter((r) => {
      const displayLogs = showRaw ? r.allEvents : r.appLogs
      return displayLogs.some((ev) =>
        textMatchesSearch(stripTimestampAndRequestId(ev.message), searchQuery, caseSensitive, wholeWord),
      )
    })
  }, [rawRequests, sortKey, sortDesc, showRaw, searchQuery, caseSensitive, wholeWord])

  const toggleLevel = (level: LogLevel) => {
    setLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const activeFilter = levelFilter ?? (levels.size > 0 ? Array.from(levels) : null)

  const filterLog = (ev: CloudWatchLogEvent) => {
    if (!activeFilter || activeFilter.length === 0) return true
    const lvl = parseLogLevel(ev.message)
    return lvl && activeFilter.includes(lvl)
  }

  const allExpanded = requests.length > 0 && expandedIds.length === requests.length
  const toggleExpandAll = () => {
    if (allExpanded) setExpandedIds([])
    else setExpandedIds(requests.map((r) => r.id))
  }

  if (events.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[120px] rounded-lg border border-dashed bg-muted/30 text-muted-foreground text-sm",
          compact && "min-h-[80px]",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span>Loading logs…</span>
            </>
          ) : (
            <>
              <span>No logs</span>
              <span className="text-xs opacity-80">No log events in this time range</span>
            </>
          )}
        </div>
      </div>
    )
  }

  const toolbarRow2 = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1">
      <Select value={sortKey} onValueChange={(v) => setSortKey(v as RequestSortKey)}>
        <SelectTrigger className="h-7 w-[130px] text-xs shrink-0">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="timestamp">
            <span className="flex items-center gap-2">
              <Clock className="size-3.5" /> Date & time
            </span>
          </SelectItem>
          <SelectItem value="duration">
            <span className="flex items-center gap-2">
              <Timer className="size-3.5" /> Duration
            </span>
          </SelectItem>
          <SelectItem value="memory">
            <span className="flex items-center gap-2">
              <MemoryStick className="size-3.5" /> Memory
            </span>
          </SelectItem>
          <SelectItem value="lines">
            <span className="flex items-center gap-2">
              <FileText className="size-3.5" /> Log lines
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs shrink-0"
        onClick={() => setSortDesc(!sortDesc)}
        title={sortDesc ? "Descending (click for ascending)" : "Ascending (click for descending)"}
      >
        {sortDesc ? (
          <ArrowDownNarrowWide className="size-4" />
        ) : (
          <ArrowUpNarrowWide className="size-4" />
        )}
      </Button>
      <div className="flex items-center gap-1 shrink-0">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search logs…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 w-[120px] text-xs font-mono"
        />
      </div>
      <Label
        title="Case sensitive"
        className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <Checkbox
          checked={caseSensitive}
          onCheckedChange={(v) => setCaseSensitive(!!v)}
          className="h-3.5 w-3.5"
        />
        <CaseSensitive className="size-4 ml-0.5" />
      </Label>
      <Label
        title="Whole word match"
        className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <Checkbox
          checked={wholeWord}
          onCheckedChange={(v) => setWholeWord(!!v)}
          className="h-3.5 w-3.5"
        />
        <WholeWord className="size-4 ml-0.5" />
      </Label>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs shrink-0"
        onClick={() => setShowRaw(!showRaw)}
        title={showRaw ? "Click to show app logs only" : "Click to show full AWS logs"}
      >
        {showRaw ? (
          <Server className="size-4" />
        ) : (
          <ServerOff className="size-4" />
        )}
        <span className="ml-1">{showRaw ? "Raw" : "Cleaned"}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs shrink-0"
        onClick={toggleExpandAll}
        title={allExpanded ? "Collapse all" : "Expand all"}
      >
        {allExpanded ? (
          <ChevronsDownUp className="size-4" />
        ) : (
          <ChevronsUpDown className="size-4" />
        )}
      </Button>
    </div>
  )

  return (
    <div className={cn("flex flex-col gap-3 min-w-0", className)}>
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/40 rounded-lg border">
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>Refreshing logs…</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 px-3 py-1">
        <span className="text-xs text-muted-foreground shrink-0">Level:</span>
        {LOG_LEVELS.map((lvl) => (
          <Badge
            key={lvl}
            variant={
              activeFilter?.includes(lvl) ? "secondary" : "outline"
            }
            className="cursor-pointer text-xs shrink-0"
            onClick={() => toggleLevel(lvl)}
          >
            {lvl}
          </Badge>
        ))}
        {!compact && (
          <>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as RequestSortKey)}>
              <SelectTrigger className="h-7 w-[130px] text-xs shrink-0">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">
                  <span className="flex items-center gap-2">
                    <Clock className="size-3.5" /> Date & time
                  </span>
                </SelectItem>
                <SelectItem value="duration">
                  <span className="flex items-center gap-2">
                    <Timer className="size-3.5" /> Duration
                  </span>
                </SelectItem>
                <SelectItem value="memory">
                  <span className="flex items-center gap-2">
                    <MemoryStick className="size-3.5" /> Memory
                  </span>
                </SelectItem>
                <SelectItem value="lines">
                  <span className="flex items-center gap-2">
                    <FileText className="size-3.5" /> Log lines
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={() => setSortDesc(!sortDesc)}
              title={sortDesc ? "Descending" : "Ascending"}
            >
              {sortDesc ? (
                <ArrowDownNarrowWide className="size-4" />
              ) : (
                <ArrowUpNarrowWide className="size-4" />
              )}
            </Button>
            <div className="flex items-center gap-1.5 shrink-0">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search logs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-[140px] text-xs font-mono"
              />
            </div>
            <Label
              title="Case sensitive"
              className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Checkbox
                checked={caseSensitive}
                onCheckedChange={(v) => setCaseSensitive(!!v)}
                className="h-3.5 w-3.5"
              />
              <CaseSensitive className="size-4 ml-0.5" />
            </Label>
            <Label
              title="Whole word match"
              className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Checkbox
                checked={wholeWord}
                onCheckedChange={(v) => setWholeWord(!!v)}
                className="h-3.5 w-3.5"
              />
              <WholeWord className="size-4 ml-0.5" />
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={() => setShowRaw(!showRaw)}
              title={showRaw ? "Click to show app logs only" : "Click to show full AWS logs"}
            >
              {showRaw ? (
                <Server className="size-4" />
              ) : (
                <ServerOff className="size-4" />
              )}
              <span className="ml-1">{showRaw ? "Raw" : "Cleaned"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={toggleExpandAll}
              title={allExpanded ? "Collapse all" : "Expand all"}
            >
              {allExpanded ? (
                <ChevronsDownUp className="size-4" />
              ) : (
                <ChevronsUpDown className="size-4" />
              )}
              <span className="ml-1">{allExpanded ? "Collapse all" : "Expand all"}</span>
            </Button>
          </>
        )}
      </div>
      {compact && toolbarRow2}

      <div
        className={cn(
          "overflow-auto font-mono text-xs bg-background rounded-lg border min-w-0",
          compact ? "max-h-[300px]" : scrollMinHeight ? "" : "max-h-[500px]",
        )}
        style={scrollMinHeight ? { minHeight: scrollMinHeight } : undefined}
      >
        {requests.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center text-muted-foreground text-sm",
              compact && "min-h-[260px]",
              !compact && !scrollMinHeight && "min-h-[460px]",
            )}
            style={scrollMinHeight && !compact ? { minHeight: scrollMinHeight - 40 } : undefined}
          >
            <div className="flex flex-col items-center gap-1">
              <span>
                {searchQuery.trim()
                  ? "No matching logs"
                  : "No grouped requests"}
              </span>
              <span className="text-xs opacity-80">
                {searchQuery.trim()
                  ? "Try a different search or adjust filters"
                  : "No Lambda invocations in this range"}
              </span>
            </div>
          </div>
        ) : (
          <Accordion
              type="multiple"
              className="w-full"
              value={expandedIds}
              onValueChange={setExpandedIds}
            >
            {requests.map((r) => {
              const displayLogs = showRaw ? r.allEvents : r.appLogs
              const filtered = displayLogs.filter(filterLog)
              const duration = r.meta.duration
                ? `${(r.meta.duration / 1000).toFixed(1)}s`
                : null
              const memory = r.meta.maxMemoryUsed != null ? `${r.meta.maxMemoryUsed} MB` : null
              const dateTimeStr = formatRequestDateTime(r.startTs)
              const isHighlighted =
                highlightTimeRange &&
                r.startTs >= highlightTimeRange.start &&
                r.startTs <= highlightTimeRange.end

              return (
                <AccordionItem
                  key={r.id}
                  value={r.id}
                  className={cn(
                    "border-b last:border-b-0",
                    isHighlighted && "bg-yellow-500/10 dark:bg-yellow-600/10 border-l-2 border-l-yellow-500",
                  )}
                >
                  <AccordionTrigger className="px-4 py-2 hover:no-underline text-left">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "font-mono text-muted-foreground",
                          compact && "truncate max-w-[200px]",
                        )}
                        title={r.requestId}
                      >
                        {r.requestId}
                      </span>
                      {duration && (
                        <span className="text-foreground flex items-center gap-1">
                          <Timer className="size-3.5 shrink-0" />
                          {compact ? duration : `Duration: ${duration}`}
                        </span>
                      )}
                      {memory && (
                        <span className="text-foreground flex items-center gap-1">
                          <MemoryStick className="size-3.5 shrink-0" />
                          {compact ? memory : `Memory: ${memory}`}
                        </span>
                      )}
                      <span className="text-muted-foreground" title={dateTimeStr}>
                        {dateTimeStr}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FileText className="size-3.5 shrink-0" />
                        {compact ? filtered.length : `(${filtered.length} lines)`}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0">
                    <ul className="divide-y divide-border">
                      {filtered.length === 0 ? (
                        <li className="flex items-center justify-center min-h-[60px] py-8 text-muted-foreground text-sm">
                          No logs match the selected level filter
                        </li>
                      ) : (
                        filtered.map((ev, i) => {
                          const lvl = parseLogLevel(ev.message)
                          const displayMsg = stripTimestampAndRequestId(ev.message)
                          return (
                            <li
                              key={ev.id ?? i}
                              className={cn(
                                "flex items-start gap-2 px-4 py-2 min-w-0",
                                levelColor(lvl),
                              )}
                            >
                              <span className="text-muted-foreground flex-shrink-0 min-w-[140px]">
                                {formatLogTimestamp(ev.timestamp)}
                              </span>
                              <pre className="whitespace-pre-wrap break-words flex-1 min-w-0 overflow-x-auto text-xs">
                                {highlightMatches(displayMsg, searchQuery, caseSensitive, wholeWord)}
                              </pre>
                            </li>
                          )
                        })
                      )}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>
    </div>
  )
}
