"use client"
import { Badge } from "@/components/ui/badge"
import { useConsole } from "@/components/subapps/console/context/console-context"

export function ProjectHeader({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const project = state.projects.find((p) => p._id === projectId)
  if (!project) return null

  const apiService = (project.services || []).find((s: any) => s.type === "api")

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={"/placeholder.svg?height=40&width=40&query=project%20logo"} alt="" className="size-10 rounded" />
          <div>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{project.technology?.language ?? "nodejs"}</span>
              <span>{"•"}</span>
              <span>{project.technology?.version ?? "18.x"}</span>
              {apiService?.framework ? (
                <>
                  <span>{"•"}</span>
                  <span>{apiService.framework}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(project.runtimes || []).slice(0, 3).map((r: any, idx: number) => (
            <Badge key={idx} variant="secondary">
              {r.type}
              {r.provider ? `:${r.provider}` : ""}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
