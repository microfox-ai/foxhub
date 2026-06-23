"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { CloudWatchLogEvent } from "@/components/subapps/console/context/aws-context"
import type { DeploymentLogsDto } from "@/components/subapps/console/lib/console-api"

type PhaseKey = "compiling" | "deploying" | "post_deployment"

const PHASES: {
  key: PhaseKey
  label: string
  dot: string
  borderL: string
  text: string
  activeChip: string
}[] = [
  {
    key: "compiling",
    label: "Compiling",
    dot: "bg-amber-500",
    borderL: "border-l-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    activeChip:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  {
    key: "deploying",
    label: "Deploying",
    dot: "bg-blue-500",
    borderL: "border-l-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    activeChip:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  {
    key: "post_deployment",
    label: "Post-deploy",
    dot: "bg-indigo-500",
    borderL: "border-l-indigo-500",
    text: "text-indigo-700 dark:text-indigo-400",
    activeChip:
      "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
  },
]

type StreamLine = {
  phase: PhaseKey
  timestamp: string | number | Date
  message: string
}

function DeploymentLogStream({ logs }: { logs?: DeploymentLogsDto | null }) {
  // All phases visible by default.
  const [active, setActive] = useState<Set<PhaseKey>>(
    () => new Set(PHASES.map((p) => p.key)),
  )
  const [query, setQuery] = useState("")

  const { lines, counts } = useMemo(() => {
    const all: StreamLine[] = []
    const counts: Record<PhaseKey, number> = {
      compiling: 0,
      deploying: 0,
      post_deployment: 0,
    }
    for (const p of PHASES) {
      const arr = (logs?.[p.key] as { timestamp: string; message: string }[] | undefined) || []
      counts[p.key] = arr.length
      for (const e of arr) {
        all.push({ phase: p.key, timestamp: e.timestamp, message: e.message })
      }
    }
    // Pipeline order is sequential, but sort by timestamp to be exact when phases interleave.
    all.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    return { lines: all, counts }
  }, [logs])

  const phaseMeta = useMemo(() => {
    const m = {} as Record<PhaseKey, (typeof PHASES)[number]>
    for (const p of PHASES) m[p.key] = p
    return m
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      lines.filter(
        (l) =>
          active.has(l.phase) &&
          (!q || l.message.toLowerCase().includes(q)),
      ),
    [lines, active, q],
  )

  const toggle = (key: PhaseKey) =>
    setActive((prev) => {
      const next = new Set(prev)
      // Don't allow turning everything off — re-enable all if last one is removed.
      if (next.has(key)) {
        next.delete(key)
        if (next.size === 0) return new Set(PHASES.map((p) => p.key))
      } else {
        next.add(key)
      }
      return next
    })

  const totalShown = filtered.length

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
        {PHASES.map((p) => {
          const on = active.has(p.key)
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(p.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                on
                  ? p.activeChip
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={on}
            >
              <span className={cn("size-1.5 rounded-full", p.dot)} />
              {p.label}
              <span className="tabular-nums opacity-70">{counts[p.key]}</span>
            </button>
          )
        })}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter logs…"
          className="ml-auto h-7 w-[180px] text-xs"
        />
      </div>

      <div className="max-h-[420px] overflow-auto bg-background font-mono text-xs">
        {totalShown === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {lines.length === 0 ? "No logs yet" : "No matching log lines"}
          </div>
        ) : (
          <ul>
            {filtered.map((l, i) => {
              const meta = phaseMeta[l.phase]
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 border-l-2 px-3 py-1 hover:bg-muted/40",
                    meta.borderL,
                  )}
                  title={meta.label}
                >
                  <span className="w-20 flex-shrink-0 text-muted-foreground">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={cn(
                      "w-24 flex-shrink-0 select-none whitespace-nowrap text-[10px] uppercase tracking-wide",
                      meta.text,
                    )}
                  >
                    {meta.label}
                  </span>
                  <pre className="flex-grow whitespace-pre-wrap break-words">
                    {l.message}
                  </pre>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export function LogsViewer({
  logs,
  events,
}: {
  logs?: DeploymentLogsDto | null
  events?: CloudWatchLogEvent[]
}) {
  // CloudWatch (observability) branch — unchanged single stream.
  if (events) {
    return (
      <div className="max-h-[500px] overflow-auto font-mono text-xs bg-background text-foreground p-4 rounded-lg min-w-0">
        {events.length === 0 ? (
          <div className="p-4 text-muted-foreground">{"No logs"}</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li key={i} className="flex items-start">
                <span className="text-muted-foreground w-24 flex-shrink-0">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
                <pre className="whitespace-pre-wrap flex-grow">{e.message}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return <DeploymentLogStream logs={logs} />
}
