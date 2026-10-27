"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Check, Copy, Code2, Globe, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DeploymentConfigDto } from "@/components/subapps/console/lib/console-api"

/** API modes we render as segments; the deployment's actual mode is always included. */
const KNOWN_API_MODES = ["prod", "staging", "dev"] as const

/** Human labels for the well-known handle keys, in display order. */
const HANDLE_LABELS: Record<string, string> = {
  agent: "Agent",
  openapi: "OpenAPI",
  docs: "Docs",
  public: "Public",
  ui: "UI",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm min-w-0">{children}</div>
    </div>
  )
}

/**
 * Read-only, presentation-friendly view of the config a deployment was pushed with (the persisted
 * `deploymentConfig` snapshot). Used both in Overview (latest deploy of the selected stage) and in
 * a deployment's own detail view. Shows a segmented API-mode selector (apiVersion defaults to v2),
 * the handle → path map, and ignore patterns — with Copy + "View JSON" for the raw object.
 */
export function DeploymentConfigCard({
  config,
  stage,
  groups,
  deployedAt,
  title = "Deployment configuration",
  description,
  className,
}: {
  config?: DeploymentConfigDto | null
  stage?: string
  groups?: string[]
  deployedAt?: string
  title?: string
  description?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const apiVersion = (config?.apiVersion ?? "v2").toString()
  const apiMode = config?.apiMode?.toString()
  const modes = useMemo(() => {
    const set = new Set<string>(KNOWN_API_MODES)
    if (apiMode) set.add(apiMode)
    return [...set]
  }, [apiMode])

  const handles = config?.handles ?? {}
  const handleKeys = useMemo(() => {
    const known = Object.keys(HANDLE_LABELS).filter((k) => k in handles)
    const extra = Object.keys(handles).filter((k) => !(k in HANDLE_LABELS))
    return [...known, ...extra]
  }, [handles])

  const ignorePatterns = config?.ignorePatterns ?? []

  const prettyJson = useMemo(
    () => JSON.stringify({ stage, ...(groups ? { groups } : {}), ...(config ?? {}) }, null, 2),
    [config, stage, groups],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prettyJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  const hasConfig = !!config && Object.keys(config).length > 0

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground shrink-0" />
            {title}
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {hasConfig ? (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Code2 className="mr-1.5 size-3.5" />
                  View JSON
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs">
                  <code>{prettyJson}</code>
                </pre>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        {!hasConfig ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            No saved configuration for this deployment yet — redeploy with a recent CLI to capture it.
          </div>
        ) : (
          <>
            {/* API mode + version */}
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">API mode</div>
                <div
                  role="group"
                  aria-label="API mode"
                  className="inline-flex rounded-md border bg-muted/40 p-0.5"
                >
                  {modes.map((m) => {
                    const active = m === (apiMode ?? "")
                    return (
                      <span
                        key={m}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        {m}
                      </span>
                    )
                  })}
                  {!apiMode ? (
                    <span className="rounded px-2.5 py-1 text-xs text-muted-foreground">—</span>
                  ) : null}
                </div>
              </div>
              <Field label="API version">
                <Badge variant="secondary" className="font-mono">
                  {apiVersion}
                </Badge>
              </Field>
              {stage ? (
                <Field label="Stage">
                  <Badge variant="outline" className="capitalize">
                    {stage}
                  </Badge>
                </Field>
              ) : null}
              {config?.port ? (
                <Field label="Local port">
                  <span className="font-mono text-sm">{String(config.port)}</span>
                </Field>
              ) : null}
            </div>

            {/* Identity */}
            <div className="grid gap-4 sm:grid-cols-2">
              {config?.subdomain ? (
                <Field label="Subdomain">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Globe className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm truncate">
                      {config.subdomain}.microfox.app
                    </span>
                  </div>
                </Field>
              ) : null}
              {config?.agentName ? (
                <Field label="Agent name">
                  <span className="font-mono text-sm truncate">{config.agentName}</span>
                </Field>
              ) : null}
            </div>

            {/* Handles */}
            {handleKeys.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Handles</div>
                <div className="rounded-md border divide-y">
                  {handleKeys.map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm">{HANDLE_LABELS[k] ?? k}</span>
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {handles[k]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Groups */}
            {groups && groups.length > 0 ? (
              <Field label="Deployed groups">
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g) => (
                    <Badge key={g} variant="outline">
                      {g}
                    </Badge>
                  ))}
                </div>
              </Field>
            ) : null}

            {/* Ignore patterns */}
            {ignorePatterns.length > 0 ? (
              <Field label="Ignore patterns">
                <div className="flex flex-wrap gap-1.5">
                  {ignorePatterns.map((p, i) => (
                    <Badge key={`${p}-${i}`} variant="secondary" className="font-mono font-normal">
                      {p}
                    </Badge>
                  ))}
                </div>
              </Field>
            ) : null}

            {deployedAt ? (
              <div className="text-xs text-muted-foreground">
                Last deployed {new Date(deployedAt).toLocaleString()}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
