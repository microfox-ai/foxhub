"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "./overview-tab"
import { DeploymentsTab } from "./deployments-tab"
import { AnalyticsTab } from "./analytics-tab"
import { LogsTab } from "./logs-tab"
import { SettingsTab } from "./settings-tab"
import { ConfigTab } from "./config-tab"
import { AwsSectionWrapper } from "./aws-wrapper"

const VALID_TABS = ["overview", "deployments", "analytics", "logs", "config", "settings"] as const

export function ProjectTabs({ projectId, defaultTab }: { projectId: string; defaultTab?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get("tab") ?? undefined
  const tab = (VALID_TABS.includes(tabFromUrl as (typeof VALID_TABS)[number]) ? tabFromUrl : defaultTab) || "overview"

  const onTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-6">
        <TabsTrigger value="overview">{"Overview"}</TabsTrigger>
        <TabsTrigger value="deployments">{"Deployments"}</TabsTrigger>
        <TabsTrigger value="analytics">{"Analytics"}</TabsTrigger>
        <TabsTrigger value="logs">{"Logs"}</TabsTrigger>
        <TabsTrigger value="config">{"Config"}</TabsTrigger>
        <TabsTrigger value="settings">{"Settings"}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="deployments" className="mt-4">
        <DeploymentsTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="analytics" className="mt-4">
        <AwsSectionWrapper>
          <AnalyticsTab projectId={projectId} />
        </AwsSectionWrapper>
      </TabsContent>

      <TabsContent value="logs" className="mt-4">
        <AwsSectionWrapper>
          <LogsTab projectId={projectId} />
        </AwsSectionWrapper>
      </TabsContent>

      <TabsContent value="config" className="mt-4">
        <ConfigTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <SettingsTab projectId={projectId} />
      </TabsContent>
    </Tabs>
  )
}
