"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { normalizeStage } from "@/components/subapps/console/lib/console-api"
import { CopyableUrl } from "./copyable-url"
import { DeploymentConfigCard } from "./deployment-config-card"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { cn } from "@/lib/utils"
import { UrlMapType, type IUrlMap } from "@/server/types"
import { Globe } from "lucide-react"

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  POST: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  PUT: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  PATCH: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  DELETE: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
}

function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase()
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium",
        METHOD_COLORS[m] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {m}
    </span>
  )
}

type Endpoint = { method: string; path: string; group: string; summary?: string }

const fetchJson = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))

export function OverviewTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const project =
    state.currentProject && state.currentProject.id === projectId
      ? state.currentProject
      : undefined

  const subdomain = project?.subdomain?.trim()
  const subdomainBase = subdomain ? `https://${subdomain}.microfox.app` : undefined
  const allUrls = useMemo<IUrlMap[]>(() => project?.urlsMap ?? [], [project])

  // urlsMap now holds rows for every deployed stage (non-prod rows carry a stage-prefixed path,
  // e.g. /staging/agent). Scope the whole Overview to the selected stage so a prod selection never
  // surfaces the /staging path (and vice-versa). Rows without a stage normalize to prod.
  const stage = state.selectedStage
  const urls = useMemo(
    () => allUrls.filter((u) => normalizeStage(u.stage) === stage),
    [allUrls, stage],
  )

  const agentMap = useMemo(() => urls.find((u) => u.type === UrlMapType.AGENT), [urls]) ?? { path: '/agent' }
  const openapiUrl = useMemo(() => `${subdomainBase}${urls.find((u) => u.type === UrlMapType.OPENAPI)?.path ?? '/docs.json'}`, [urls, subdomainBase])

  // Distinct groups deployed to this stage (from the stage-scoped urlsMap rows).
  const stageGroups = useMemo(() => {
    const set = new Set<string>()
    for (const u of urls) if (u.group) set.add(u.group)
    return [...set]
  }, [urls])

  // The latest deployment for the selected stage — prefer the most recent COMPLETED one (what's
  // actually live), else the newest of any status. Deployments come newest-first from the API.
  const stageDeployment = useMemo(() => {
    const forStage = state.deployments.filter((d) => normalizeStage(d.stage) === stage)
    return forStage.find((d) => d.status === "completed") ?? forStage[0]
  }, [state.deployments, stage])

  // Pull the OpenAPI spec for the core group — gives us every route + summaries.
  const { data: openapi } = useSWR(openapiUrl ? ["openapi", openapiUrl] : null, ([, u]) => fetchJson(u), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  // Endpoints we already know from the project record (instant, no network).
  const dbEndpoints = useMemo<Endpoint[]>(() => {
    const out: Endpoint[] = []
    for (const u of urls) {
      const group = getGroupLabel(u.group)
      for (const e of u.service?.endpoints ?? []) {
        out.push({ method: e.method, path: e.path, group })
      }
      const resources =
        u.service && u.service.runtime !== "server"
          ? u.service.providerConfig?.resources
          : undefined
      for (const r of resources ?? []) {
        if (r.type === "lambda") {
          for (const e of r.apiEndpoints ?? []) out.push({ method: e.method, path: e.path, group })
        }
      }
    }
    return out
  }, [urls])

  // Endpoints from the OpenAPI paths object (core group), with summaries.
  const openapiEndpoints = useMemo<Endpoint[]>(() => {
    const paths = (openapi as any)?.paths
    if (!paths || typeof paths !== "object") return []
    const out: Endpoint[] = []
    for (const [path, methods] of Object.entries(paths as Record<string, any>)) {
      if (!methods || typeof methods !== "object") continue
      for (const [method, op] of Object.entries(methods as Record<string, any>)) {
        if (!HTTP_METHODS.includes(method.toUpperCase())) continue
        out.push({
          method: method.toUpperCase(),
          path,
          group: "core",
          summary: op?.summary || op?.description,
        })
      }
    }
    return out
  }, [openapi])

  // Merge both sources, de-duped by "METHOD path", preferring entries with a summary.
  const endpointsByGroup = useMemo(() => {
    const byKey = new Map<string, Endpoint>()
    for (const e of [...dbEndpoints, ...openapiEndpoints]) {
      const key = `${e.group}:${e.method} ${e.path}`
      const existing = byKey.get(key)
      if (!existing || (!existing.summary && e.summary)) byKey.set(key, e)
    }
    const groups = new Map<string, Endpoint[]>()
    for (const e of byKey.values()) {
      const arr = groups.get(e.group) ?? []
      arr.push(e)
      groups.set(e.group, arr)
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a === "core" ? -1 : b === "core" ? 1 : a.localeCompare(b),
    )
  }, [dbEndpoints, openapiEndpoints])

  const totalEndpoints = useMemo(
    () => endpointsByGroup.reduce((acc, [, eps]) => acc + eps.length, 0),
    [endpointsByGroup],
  )

  const apiInfo = (openapi as any)?.info as { title?: string; description?: string; version?: string } | undefined

  if (!project) {
    return <div className="text-sm text-muted-foreground">{"Project not found."}</div>
  }

  return (
    <div className="space-y-4">
      {/* Project summary */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted">
            <Globe className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base truncate">
              {apiInfo?.title || project.displayName}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {apiInfo?.description || project.agentName}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{project.source.type}</Badge>
            <Badge variant="outline">
              {project.technology.language} v{project.technology.version}
            </Badge>
            {apiInfo?.version ? <Badge variant="outline">API v{apiInfo.version}</Badge> : null}
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            {subdomainBase && agentMap ? (
              <div className="flex items-center gap-3 text-sm min-w-0">
                <span className="shrink-0 text-muted-foreground">{"Agent base"}</span>
                <CopyableUrl url={`${subdomainBase}${agentMap.path}`} className="text-xs" />
              </div>
            ) : null}
            {openapiUrl ? (
              <div className="flex items-center gap-3 text-sm min-w-0 truncate">
                <span className="shrink-0 text-muted-foreground">{"OpenAPI"}</span>
                <CopyableUrl url={openapiUrl} className="text-xs" />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Deployment configuration — the latest deploy's persisted config for the selected stage */}
      <DeploymentConfigCard
        config={stageDeployment?.deploymentConfig}
        stage={stage}
        groups={stageGroups}
        deployedAt={stageDeployment?.updatedAt}
        description={`Config from the latest ${stage} deployment.`}
      />

      {/* All API routes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{"API Routes"}</CardTitle>
          <Badge variant="secondary">{`${totalEndpoints} ${totalEndpoints === 1 ? "route" : "routes"}`}</Badge>
        </CardHeader>
        <CardContent>
          {totalEndpoints === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              {subdomainBase
                ? "No routes found yet — deploy the project (or check that /docs.json is reachable)."
                : "Set a subdomain in Settings, then deploy to populate routes."}
            </div>
          ) : (
            <div className="space-y-5">
              {endpointsByGroup.map(([group, eps]) => {
                const token = getGroupColorToken(group)
                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
                      >
                        {group}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{eps.length}</span>
                    </div>
                    <div className="rounded-md border divide-y">
                      {eps.map((e, idx) => (
                        <div key={`${e.method}-${e.path}-${idx}`} className="flex items-start gap-3 px-3 py-2">
                          <MethodBadge method={e.method} />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs break-all">{e.path}</div>
                            {e.summary ? (
                              <div className="text-xs text-muted-foreground line-clamp-1">{e.summary}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
