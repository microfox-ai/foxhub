"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConsole } from "@/components/subapps/console/context/console-context"

type AnyRecord = Record<string, any>

export function OverviewTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const project = state.projects.find((p) => p._id === projectId)
  const apiService = (project?.services || []).find((s: any) => s.type === "api") as AnyRecord | undefined
  const openapiUri = apiService?.openapiUri as string | undefined

  const [openapi, setOpenapi] = useState<AnyRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function run() {
      if (!openapiUri) {
        setOpenapi(null)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(openapiUri)
        if (!res.ok) throw new Error(`Failed to fetch OpenAPI: ${res.status}`)
        const data = await res.json()
        if (mounted) setOpenapi(data as AnyRecord)
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to fetch OpenAPI")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [openapiUri])

  const info = openapi?.info as AnyRecord | undefined
  const agentCard = info?.agentCard as AnyRecord | undefined
  const tags: { name: string; description?: string }[] = (openapi?.tags as any[]) || []

  const endpoints: { method: string; path: string }[] = useMemo(() => {
    const svcEndpoints = (apiService?.endpoints as any[]) || []
    return svcEndpoints.map((e) => ({ method: e.method, path: e.path }))
  }, [apiService])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center gap-3">
          {info?.iconUrl ? (
            <img src={info.iconUrl || "/placeholder.svg"} alt="" className="size-10 rounded" />
          ) : (
            <img src={"/placeholder.svg?height=40&width=40&query=service%20icon"} alt="" className="size-10 rounded" />
          )}
          <div>
            <CardTitle className="text-base">{info?.title || agentCard?.name || "Service Overview"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading OpenAPI..."
                : error
                  ? `Error: ${error}`
                  : info?.description || agentCard?.description || "No description"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {info?.status || info?.version ? (
            <div className="flex flex-wrap gap-2">
              {info?.status ? <Badge variant="outline">{String(info.status)}</Badge> : null}
              {info?.version ? <Badge variant="secondary">v{String(info.version)}</Badge> : null}
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{"Tags"}</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge key={t.name} variant="outline" className="whitespace-nowrap">
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {agentCard?.skills?.length ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{"Skills"}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agentCard.skills.map((s: any) => (
                  <Card key={s.id}>
                    <CardHeader>
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{"API Endpoints"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">{"Method"}</TableHead>
                  <TableHead>{"Path"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      {"No endpoints found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  endpoints.map((e, idx) => (
                    <TableRow key={`${e.method}-${e.path}-${idx}`}>
                      <TableCell>
                        <Badge variant="secondary">{e.method}</Badge>
                      </TableCell>
                      <TableCell>{e.path}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
