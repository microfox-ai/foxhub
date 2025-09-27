"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "./overview-tab"
import { DeploymentsTab } from "./deployments-tab"
import { AnalyticsTab } from "./analytics-tab"
import { LogsTab } from "./logs-tab"
import { AwsSectionWrapper } from "./aws-wrapper"

export function ProjectTabs({ projectId, defaultTab }: { projectId: string; defaultTab?: string }) {
  const tab = defaultTab || "overview"

  return (
    <Tabs defaultValue={tab} className="w-full">
      <TabsList className="w-full grid grid-cols-5">
        <TabsTrigger value="overview">{"Overview"}</TabsTrigger>
        <TabsTrigger value="deployments">{"Deployments"}</TabsTrigger>
        <TabsTrigger value="analytics">{"Analytics"}</TabsTrigger>
        <TabsTrigger value="logs">{"Logs"}</TabsTrigger>
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

      <TabsContent value="settings" className="mt-4">
        <div className="text-sm text-muted-foreground">{"Settings coming soon"}</div>
      </TabsContent>
    </Tabs>
  )
}
