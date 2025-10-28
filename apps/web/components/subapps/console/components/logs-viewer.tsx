"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { CloudWatchLogEvent } from "@/components/subapps/console/context/aws-context"
import type { DeploymentLogsDto } from "@/components/subapps/console/lib/console-api"

export function LogsViewer({ logs, events }: { logs?: DeploymentLogsDto | null; events?: CloudWatchLogEvent[] }) {
  // Require focus/click to enable scrolling: default no-scroll, scroll only when focused
  if (events) {
    return (
      <div tabIndex={0} className="max-h-[500px] overflow-hidden focus:overflow-auto font-mono text-xs bg-background text-foreground p-4 rounded-lg outline-none">
        {events.length === 0 ? (
          <div className="p-4 text-muted-foreground">{"No logs"}</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li key={i} className="flex items-start">
                <span className="text-muted-foreground w-24 flex-shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                <pre className="whitespace-pre-wrap flex-grow">{e.message}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const segments = [
    { key: "compiling", label: "Compiling" },
    { key: "deploying", label: "Deploying" },
    { key: "post_deployment", label: "Post Deployment" },
  ] as const

  return (
    <Accordion type="multiple" className="w-full" defaultValue={["compiling"]}>
      {segments.map((s) => {
        const items = (logs?.[s.key] as any[]) || []
        // Compute step duration from first to last timestamp if available
        const firstTs = items.length > 0 ? new Date(items[0]?.timestamp).getTime() : undefined
        const lastTs = items.length > 0 ? new Date(items[items.length - 1]?.timestamp).getTime() : undefined
        const stepDuration = firstTs && lastTs ? Math.max(0, lastTs - firstTs) : undefined
        const stepDurationText = stepDuration !== undefined ? `${Math.floor(stepDuration / 60000)}m ${Math.floor((stepDuration % 60000) / 1000)}s` : "—"
        return (
          <AccordionItem value={s.key} key={s.key} className="border-none mb-2">
            <AccordionTrigger className="bg-muted hover:bg-muted/80 px-4 rounded-md text-sm font-semibold">
              <div className="w-full flex items-center justify-between gap-4">
                <span>{s.label} ({items.length})</span>
                <span className="text-xs text-muted-foreground">{stepDurationText}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div tabIndex={0} className="max-h-[300px] overflow-hidden focus:overflow-auto font-mono text-xs bg-background text-foreground rounded-b-md outline-none">
                {items.length === 0 ? (
                  <div className="p-4 text-muted-foreground">{"No logs yet"}</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((line, idx) => (
                      <li key={idx} className="p-2 flex items-start">
                        <span className="text-muted-foreground w-24 flex-shrink-0">{new Date(line.timestamp).toLocaleTimeString()}</span>
                        <pre className="whitespace-pre-wrap flex-grow">{line.message}</pre>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
