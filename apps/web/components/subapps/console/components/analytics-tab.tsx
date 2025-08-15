"use client"

import { useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { useAws } from "@/components/subapps/console/context/aws-context"

export function AnalyticsTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const { state: aws, loadAnalytics } = useAws()
  const project = state.projects.find((p) => p._id === projectId)

  const awsFns = useMemo(() => {
    const rt = (project?.runtimes || []).find((r: any) => r.type === "serverless" && r.provider === "aws")
    const arr = (rt?.functions || []) as { name: string; arn: string; region: string }[]
    return arr.map((f) => ({ arn: f.arn, region: f.region || rt?.region || "us-east-1", name: f.name }))
  }, [project])

  useEffect(() => {
    if (projectId && awsFns.length) {
      loadAnalytics(projectId, awsFns)
    }
  }, [projectId, awsFns, loadAnalytics])

  const items = aws.analyticsByProject[projectId] || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{"AWS Lambda Analytics"}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {awsFns.length} {"function(s)"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(projectId, awsFns)}
            disabled={!awsFns.length}
          >
            {"Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{"Functions"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"Name"}</TableHead>
                  <TableHead>{"Region"}</TableHead>
                  <TableHead>{"Runtime"}</TableHead>
                  <TableHead>{"Memory"}</TableHead>
                  <TableHead>{"Timeout"}</TableHead>
                  <TableHead>{"Invocations (24h)"}</TableHead>
                  <TableHead>{"Errors (24h)"}</TableHead>
                  <TableHead>{"Throttles (24h)"}</TableHead>
                  <TableHead>{"Avg Duration (ms)"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aws.loadingAnalytics && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground">
                      {"Loading analytics..."}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground">
                      {"No AWS serverless functions found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={it.ref.arn}>
                      <TableCell className="font-medium">{it.ref.name}</TableCell>
                      <TableCell>{it.ref.region}</TableCell>
                      <TableCell>{it.config.Runtime || "—"}</TableCell>
                      <TableCell>{it.config.MemorySize ? `${it.config.MemorySize} MB` : "—"}</TableCell>
                      <TableCell>{it.config.Timeout ? `${it.config.Timeout}s` : "—"}</TableCell>
                      <TableCell>{it.metrics.invocations ?? 0}</TableCell>
                      <TableCell>{it.metrics.errors ?? 0}</TableCell>
                      <TableCell>{it.metrics.throttles ?? 0}</TableCell>
                      <TableCell>{Math.round(it.metrics.durationAvgMs || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {aws.analyticsError ? <div className="text-sm text-destructive mt-3">{aws.analyticsError}</div> : null}
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{"Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it) => (
                <div key={it.ref.arn} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{it.ref.name}</div>
                    <Badge variant="secondary">{it.config.Version ? `v${it.config.Version}` : "—"}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground break-all">{it.ref.arn}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">{"Handler"}</div>
                      <div>{it.config.Handler || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{"Last Modified"}</div>
                      <div>{it.config.LastModified || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{"Tracing"}</div>
                      <div>{it.config.TracingConfig?.Mode || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{"Arch"}</div>
                      <div>{(it.config.Architectures || []).join(", ") || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{"Package"}</div>
                      <div>{it.config.PackageType || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{"Ephemeral Storage"}</div>
                      <div>{it.config.EphemeralStorage?.Size ? `${it.config.EphemeralStorage.Size} MB` : "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
