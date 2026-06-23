"use client"

import { useSearchParams } from "next/navigation"
import { OverviewTab } from "./overview-tab"
import { DeploymentsTab } from "./deployments-tab"
import { ObservabilityTab } from "./observability-tab"
import { SettingsTab } from "./settings-tab"
import { ConfigTab } from "./config-tab"
import { EnvTab } from "./env-tab"

const VALID_TABS = ["overview", "deployments", "observability", "environment", "config", "settings"] as const

function resolveTab(raw: string | null | undefined): (typeof VALID_TABS)[number] {
  if (raw === "analytics" || raw === "logs") return "observability"
  return (VALID_TABS as readonly string[]).includes(raw as string)
    ? (raw as (typeof VALID_TABS)[number])
    : "overview"
}

/**
 * Renders the active project section. Navigation moved to the sidebar; this just
 * switches content based on the `?tab=` query param (AwsProvider is hoisted into
 * the console layout, so observability needs no extra wrapper).
 */
export function ProjectTabs({ projectId, defaultTab }: { projectId: string; defaultTab?: string }) {
  const searchParams = useSearchParams()
  const tab = resolveTab(searchParams.get("tab") ?? defaultTab)

  return (
    <div className="w-full">
      {tab === "overview" && <OverviewTab projectId={projectId} />}
      {tab === "deployments" && <DeploymentsTab projectId={projectId} />}
      {tab === "observability" && <ObservabilityTab projectId={projectId} />}
      {tab === "environment" && <EnvTab projectId={projectId} />}
      {tab === "config" && <ConfigTab projectId={projectId} />}
      {tab === "settings" && <SettingsTab projectId={projectId} />}
    </div>
  )
}
