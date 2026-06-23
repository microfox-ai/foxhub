"use client"
import { Badge } from "@/components/ui/badge"
import { useConsole } from "@/components/subapps/console/context/console-context"

export function ProjectHeader({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const project = state.currentProject
  if (!project || project.id !== projectId) return null

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">{project.displayName}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{project.technology.language}</span>
              <span>{"•"}</span>
              <span>{project.technology.version}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.source.type}</Badge>
        </div>
      </div>
    </div>
  )
}
