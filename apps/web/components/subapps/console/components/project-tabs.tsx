"use client"

import { useCallback, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "./overview-tab"
import { DeploymentsTab } from "./deployments-tab"
import { ObservabilityTab } from "./observability-tab"
import { SettingsTab } from "./settings-tab"
import { ConfigTab } from "./config-tab"
import { AwsSectionWrapper } from "./aws-wrapper"

const VALID_TABS = ["overview", "deployments", "observability", "config", "settings"] as const

export function ProjectTabs({ projectId, defaultTab }: { projectId: string; defaultTab?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get("tab") ?? undefined
  const resolvedTab = (() => {
    const t = tabFromUrl as string
    if (t === "analytics" || t === "logs") return "observability"
    return VALID_TABS.includes(t as (typeof VALID_TABS)[number]) ? t : undefined
  })()
  const tab = resolvedTab ?? defaultTab ?? "overview"

  useEffect(() => {
    if (tabFromUrl === "analytics" || tabFromUrl === "logs") {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", "observability")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [tabFromUrl, pathname, router, searchParams])

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
      <TabsList className="w-full grid grid-cols-5">
        <TabsTrigger value="overview">{"Overview"}</TabsTrigger>
        <TabsTrigger value="deployments">{"Deployments"}</TabsTrigger>
        <TabsTrigger value="observability">{"Observability"}</TabsTrigger>
        <TabsTrigger value="config">{"Config"}</TabsTrigger>
        <TabsTrigger value="settings">{"Settings"}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="deployments" className="mt-4">
        <DeploymentsTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="observability" className="mt-4">
        <AwsSectionWrapper>
          <ObservabilityTab projectId={projectId} />
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
