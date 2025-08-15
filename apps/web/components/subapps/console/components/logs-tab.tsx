"use client"

import { useEffect, useMemo, useState } from "react"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { useAws } from "@/components/subapps/console/context/aws-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LogsTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const { state: aws, loadLogs } = useAws()
  const project = state.projects.find((p) => p._id === projectId)

  const awsFns = useMemo(() => {
    const rt = (project?.runtimes || []).find((r: any) => r.type === "serverless" && r.provider === "aws")
    const arr = (rt?.functions || []) as { name: string; arn: string; region: string }[]
    return arr.map((f) => ({ arn: f.arn, region: f.region || rt?.region || "us-east-1", name: f.name }))
  }, [project])

  const [fnChoice, setFnChoice] = useState<string>("ALL")
  const [hours, setHours] = useState<number>(6)
  const [pattern, setPattern] = useState<string>("")

  useEffect(() => {
    if (projectId && awsFns.length) {
      loadLogs(projectId, awsFns, { rangeHours: hours, filterPattern: pattern, functionName: fnChoice as any })
    }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onFetch = async () => {
    await loadLogs(projectId, awsFns, { rangeHours: hours, filterPattern: pattern, functionName: fnChoice as any })
  }

  const resp = aws.logsByProject[projectId]
  const combined = resp?.combined || []
  const byFn = resp?.byFunction || {}

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{"CloudWatch Logs"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>{"Function"}</Label>
              <Select value={fnChoice} onValueChange={setFnChoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a function" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{"All functions"}</SelectItem>
                  {awsFns.map((f) => (
                    <SelectItem key={f.arn} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{"Time range (hours)"}</Label>
              <Input type="number" min={1} max={72} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
            <div>
              <Label>{"Filter pattern"}</Label>
              <Input placeholder="e.g. ERROR" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onFetch} disabled={!awsFns.length}>
              {"Fetch Logs"}
            </Button>
            {aws.loadingLogs ? <span className="text-sm text-muted-foreground">{"Loading..."}</span> : null}
            {aws.logsError ? <span className="text-sm text-destructive">{aws.logsError}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="combined">
        <TabsList>
          <TabsTrigger value="combined">{"All logs"}</TabsTrigger>
          <TabsTrigger value="by-function">{"Function-specific"}</TabsTrigger>
        </TabsList>
        <TabsContent value="combined" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto font-mono text-xs">
                {combined.length === 0 ? (
                  <div className="p-4 text-muted-foreground">{"No logs"}</div>
                ) : (
                  <ul className="divide-y">
                    {combined.map((e, i) => (
                      <li key={i} className="px-3 py-2">
                        <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>
                        <span> </span>
                        <span>{e.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by-function" className="mt-4">
          {Object.keys(byFn).length === 0 ? (
            <div className="text-sm text-muted-foreground">{"No logs"}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(byFn).map(([name, events]) => (
                <Card key={name}>
                  <CardHeader>
                    <CardTitle className="text-sm">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[360px] overflow-auto font-mono text-xs">
                      {(events as any[]).length === 0 ? (
                        <div className="p-4 text-muted-foreground">{"No logs"}</div>
                      ) : (
                        <ul className="divide-y">
                          {(events as any[]).map((e, i) => (
                            <li key={i} className="px-3 py-2">
                              <span className="text-muted-foreground">
                                {new Date(e.timestamp).toLocaleTimeString()}
                              </span>
                              <span> </span>
                              <span>{e.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
