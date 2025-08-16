"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { CloudWatchLogEvent } from "@/components/subapps/console/context/aws-context"
import type { DeploymentLogsDto } from "@/components/subapps/console/lib/console-api"

export function LogsViewer({ logs, events }: { logs?: DeploymentLogsDto | null; events?: CloudWatchLogEvent[] }) {
  if (events) {
    return (
      <div className="max-h-[500px] overflow-auto font-mono text-xs">
        {events.length === 0 ? (
          <div className="p-4 text-muted-foreground">{"No logs"}</div>
        ) : (
          <ul className="divide-y">
            {events.map((e, i) => (
              <li key={i} className="px-3 py-2">
                <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>
                <span> </span>
                <span>{e.message}</span>
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
          <AccordionItem value={s.key} key={s.key} className="border-none">
            <AccordionTrigger className="bg-muted/50 hover:bg-muted/20 px-4 rounded-md">
              {s.label} ({items.length})
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="max-h-[300px] overflow-auto font-mono text-xs bg-black text-white rounded-md mt-1">
                {items.length === 0 ? (
                  <div className="p-4 text-muted-foreground">{"No logs yet"}</div>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {items.map((line, idx) => (
                      <li key={idx} className="px-3 py-1">
                        <span className="text-gray-400">{new Date(line.timestamp).toLocaleTimeString()}</span>
                        <span> </span>
                        <span>{line.message}</span>
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
