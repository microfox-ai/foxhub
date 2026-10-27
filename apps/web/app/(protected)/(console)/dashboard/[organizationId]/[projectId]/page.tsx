"use client"

import React from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { ProjectHeader } from "@/components/subapps/console/components/project-header"
import { ProjectTabs } from "@/components/subapps/console/components/project-tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Lock, PauseCircle, Clock, Ban } from "lucide-react"

/** Friendly access-denied screen, with the reason the backend reported. */
function AccessDenied({
  reason,
  message,
  organizationId,
}: {
  reason?: string
  message?: string
  organizationId?: string
}) {
  const DEFAULT = {
    icon: Ban as React.ElementType,
    title: "No access",
    body: "You don't have access to this project. Ask the owner to share it with you.",
  }
  const map: Record<string, { icon: React.ElementType; title: string; body: string }> = {
    suspended: {
      icon: PauseCircle,
      title: "Access suspended",
      body: "Your access to this project has been suspended by the owner. Contact them to restore it.",
    },
    expired: {
      icon: Clock,
      title: "Access expired",
      body: "Your time-limited access to this project has expired. Ask the owner to share it again.",
    },
    no_permission: {
      icon: Lock,
      title: "Not allowed",
      body: "You don't have permission to view this project.",
    },
    no_access: DEFAULT,
  }
  const info = (reason && map[reason]) || DEFAULT
  const Icon = info.icon
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">{info.title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{message || info.body}</p>
        </div>
        {organizationId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${organizationId}`}>Back to organization</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ProjectBody() {
  const { state } = useConsole()
  const params = useParams<{ organizationId: string; projectId: string }>()
  const projectId = params.projectId
  const organizationId = params.organizationId

  const query = useSearchParams()
  const tab = query.get("tab") ?? undefined

  const project = state.currentProject
  if (!project || project.id !== projectId) {
    // Still loading the single project.
    if (state.loadingCurrentProject) {
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
    // Fetch failed — show WHY (suspended / expired / no access / not found) instead of
    // an endless skeleton.
    const err = state.currentProjectError
    if (err) {
      if (err.status === 404) {
        return <div className="text-sm text-muted-foreground">{"Project not found."}</div>
      }
      return <AccessDenied reason={err.reason} message={err.message} organizationId={organizationId} />
    }
    if (!project) {
      return <div className="text-sm text-muted-foreground">{"Project not found."}</div>
    }
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
