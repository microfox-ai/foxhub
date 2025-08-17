"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { CloudWatchLogEvent } from "@/components/subapps/console/context/aws-context"
import type { DeploymentLogsDto } from "@/components/subapps/console/lib/console-api"

export function LogsViewer({ logs, events }: { logs?: DeploymentLogsDto | null; events?: CloudWatchLogEvent[] }) {
  if (events) {
    return (
      <div className="max-h-[500px] overflow-auto font-mono text-xs bg-background text-foreground p-4 rounded-lg">
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
        return (
          <AccordionItem value={s.key} key={s.key} className="border-none mb-2">
            <AccordionTrigger className="bg-muted hover:bg-muted/80 px-4 rounded-md text-sm font-semibold">
              {s.label} ({items.length})
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="max-h-[300px] overflow-auto font-mono text-xs bg-background text-foreground rounded-b-md">
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
