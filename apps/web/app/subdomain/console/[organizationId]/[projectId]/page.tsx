"use client"

import React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { ProjectHeader } from "@/components/subapps/console/components/project-header"
import { ProjectTabs } from "@/components/subapps/console/components/project-tabs"
import { Skeleton } from "@/components/ui/skeleton"

function ProjectBody() {
  const { state } = useConsole()
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const query = useSearchParams()
  const tab = query.get("tab") ?? undefined

  const project = state.currentProject
  // The project page fetches only this one project (not the whole list), so we
  // gate on currentProject + its loading flag.
  if (!project || project.id !== projectId) {
    if (state.loadingCurrentProject || !project) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )
    }
    return <div className="text-sm text-muted-foreground">{"Project not found."}</div>
  }

  return (
    <div className="space-y-4">
      <ProjectHeader projectId={projectId} />
      <ProjectTabs projectId={projectId} defaultTab={tab} />
    </div>
  )
}

export default function ProjectPage() {
  return <ProjectBody />
}
