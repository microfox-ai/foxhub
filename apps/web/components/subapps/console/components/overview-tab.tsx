"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { UrlMapType } from "@/server/types"

type AnyRecord = Record<string, any>

export function OverviewTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const project = state.projects.find((p) => p.id === projectId)
  const openapiUri = project?.urlsMap?.find((u) => u.type === UrlMapType.OPENAPI)?.url
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

  // Compute nicely formatted base URLs using the project's subdomain
  const subdomainBase = useMemo(() => {
    const sub = project?.subdomain?.trim()
    return sub ? `https://${sub}.microfox.app` : undefined
  }, [project?.subdomain])

  const agentUrlMap = useMemo(() => project?.urlsMap?.find((u) => u.type === UrlMapType.AGENT), [project]);
  const openapiUrlMap = useMemo(() => project?.urlsMap?.find((u) => u.type === UrlMapType.OPENAPI), [project]);
  const publicUrlMap = useMemo(() => project?.urlsMap?.find((u) => u.type === UrlMapType.PUBLIC), [project]);

  // Agent endpoints come from the urlsMap service definition when available
  const agentEndpoints: { method: string; path: string }[] = useMemo(() => {
    const endpoints = (agentUrlMap as any)?.service?.endpoints as { method: string; path: string }[] | undefined
    return Array.isArray(endpoints) ? endpoints : []
  }, [agentUrlMap])

  const agentDisplayBase = useMemo(() => {
    if (!subdomainBase || !agentUrlMap?.path) return undefined
    return `${subdomainBase}${agentUrlMap.path}`
  }, [subdomainBase, agentUrlMap])

  const openapiDisplayBase = useMemo(() => {
    if (!subdomainBase || !openapiUrlMap?.path) return undefined
    return `${subdomainBase}${openapiUrlMap.path}`
  }, [subdomainBase, openapiUrlMap])

  const publicDisplayBase = useMemo(() => {
    if (!subdomainBase || !publicUrlMap?.path) return undefined
    return `${subdomainBase}${publicUrlMap.path}`
  }, [subdomainBase, publicUrlMap])

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
          {/* Display base URLs mapped to subdomain */}
          <div className="space-y-2 mb-4">
            {agentDisplayBase && (
                <div className="text-sm">
                    <span className="font-medium">{"Agent Base: "}</span>
                    <span className="text-muted-foreground">{agentDisplayBase}</span>
                </div>
            )}
            {openapiDisplayBase && (
                <div className="text-sm">
                    <span className="font-medium">{"OpenAPI: "}</span>
                    <span className="text-muted-foreground">{openapiDisplayBase}</span>
                </div>
            )}
            {publicDisplayBase && (
                <div className="text-sm">
                    <span className="font-medium">{"Public URL: "}</span>
                    <span className="text-muted-foreground">{publicDisplayBase}</span>
                </div>
            )}
          </div>

          {/* Agent Endpoints */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">{"Agent Endpoints"}</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">{"Method"}</TableHead>
                    <TableHead>{"Path"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentEndpoints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground text-center h-24">
                        {"No agent endpoints found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentEndpoints.map((e, idx) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
