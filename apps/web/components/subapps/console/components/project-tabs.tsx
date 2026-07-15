"use client"

import { useSearchParams } from "next/navigation"
import { OverviewTab } from "./overview-tab"
import { DeploymentsTab } from "./deployments-tab"
import { InfrastructureTab } from "./infrastructure-tab"
import { SettingsTab } from "./settings-tab"
import { EnvTab } from "./env-tab"
import { MembersTab } from "./members-tab"
import { RunTestTab } from "./run-test-tab"
import { HistoryTab } from "./history-tab"
import { UsageTab } from "./usage-tab"

const VALID_TABS = ["overview", "deployments", "run-test", "history", "usage", "infrastructure", "environment", "members", "settings"] as const

/** Maps legacy `tab=` values to current ones (Infrastructure/Run & test rename; Config folded into Overview). */
function resolveTab(raw: string | null | undefined): (typeof VALID_TABS)[number] {
  if (raw === "analytics" || raw === "logs" || raw === "observability") return "infrastructure"
  if (raw === "workers") return "run-test"
  if (raw === "config") return "overview"
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
      {tab === "run-test" && <RunTestTab projectId={projectId} />}
      {tab === "history" && <HistoryTab projectId={projectId} />}
      {tab === "usage" && <UsageTab projectId={projectId} />}
      {tab === "infrastructure" && <InfrastructureTab projectId={projectId} />}
      {tab === "environment" && <EnvTab projectId={projectId} />}
      {tab === "members" && <MembersTab projectId={projectId} />}
      {tab === "settings" && <SettingsTab projectId={projectId} />}
    </div>
  )
}
