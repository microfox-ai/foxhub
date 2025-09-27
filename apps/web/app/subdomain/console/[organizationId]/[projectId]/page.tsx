"use client"

import React from "react"
import { useParams, useSearchParams } from "next/navigation"
import ConsoleLayout from "@/components/subapps/console/components/console-layout"
import { ConsoleProvider, useConsole } from "@/components/subapps/console/context/console-context"
import { ProjectHeader } from "@/components/subapps/console/components/project-header"
import { ProjectTabs } from "@/components/subapps/console/components/project-tabs"
import { useAuth } from "@/components/auth/AuthProvider"

function ProjectBody() {
  const { state } = useConsole()
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const query = useSearchParams()
  const tab = query.get("tab") ?? undefined

  const exists = state.projects.some((p) => p.id === projectId)
  if (!exists) {
    return <div className="text-sm text-muted-foreground">{"Project not found or loading..."}</div>
  }

  return (
    <div className="space-y-4">
      <ProjectHeader projectId={projectId} />
      <ProjectTabs projectId={projectId} defaultTab={tab} />
    </div>
  )
}

export default function ProjectPage() {
  const params = useParams<{ organizationId: string; projectId: string }>()
  const { user } = useAuth()

  return (
    <ConsoleProvider
      userId={user?.id ?? ""}
      organizationId={params.organizationId}
      projectId={params.projectId}
    >
      <ConsoleLayout>
        <ProjectBody />
      </ConsoleLayout>
    </ConsoleProvider>
  )
}
