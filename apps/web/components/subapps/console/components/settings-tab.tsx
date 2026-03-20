"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect, useMemo } from "react"
import { Trash2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

export function SettingsTab({ projectId }: { projectId: string }) {
  const { state, updateProject, deleteProject } = useConsole()
  const router = useRouter()
  const params = useParams()
  const organizationId = params.organizationId as string
  const project = state.projects.find((p) => p.id === projectId)
  
  const [agentName, setAgentName] = useState(project?.agentName || "")
  const [subdomain, setSubdomain] = useState(project?.subdomain || "")
  const [groupToDelete, setGroupToDelete] = useState("default")
  const [deletingGroup, setDeletingGroup] = useState(false)

  useEffect(() => {
    setAgentName(project?.agentName || "")
    setSubdomain(project?.subdomain || "")
  }, [project?.agentName, project?.subdomain])

  const projectGroups = useMemo(() => {
    if (!project?.urlsMap?.length) return ["default"]
    const groups = new Set<string>()

    for (const map of project.urlsMap) {
      const mapGroup = typeof map.group === "string" && map.group.trim()
        ? map.group.trim()
        : "default"
      groups.add(mapGroup)

      const resources = map.service?.runtime !== "server"
        ? map.service?.providerConfig?.resources
        : undefined
      if (!resources?.length) continue
      for (const resource of resources) {
        if (resource.type !== "lambda") continue
        const lambdaGroup = typeof resource.group === "string" && resource.group.trim()
          ? resource.group.trim()
          : mapGroup
        groups.add(lambdaGroup || "default")
      }
    }

    return Array.from(groups).sort((a, b) => a.localeCompare(b))
  }, [project?.urlsMap])

  useEffect(() => {
    if (!projectGroups.includes(groupToDelete)) {
      setGroupToDelete(projectGroups[0] || "default")
    }
  }, [projectGroups, groupToDelete])

  const selectedGroupLabel = getGroupLabel(groupToDelete)
  const selectedGroupToken = getGroupColorToken(selectedGroupLabel)

  if (!project) {
    return <div className="text-sm text-muted-foreground">{"Project not found"}</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>Manage your project configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Name</label>
            <div className="flex gap-2">
              <Input 
                value={agentName} 
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Enter agent name"
              />
              <Button
                onClick={async () => {
                  await updateProject({ agentName }, projectId)
                }}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subdomain</label>
            <div className="flex gap-2">
              <Input 
                value={subdomain} 
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="Enter subdomain (optional)"
              />
              <Button
                onClick={async () => {
                  await updateProject({ subdomain: subdomain || undefined }, projectId)
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-md border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive">Delete Group Resources</p>
            <p className="text-xs text-muted-foreground">
              Starts an async worker to delete resources for a specific deployment group.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={groupToDelete} onValueChange={setGroupToDelete}>
                <SelectTrigger className="h-9 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Group</span>
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: selectedGroupToken.bg,
                        borderColor: selectedGroupToken.border,
                        color: selectedGroupToken.text,
                      }}
                    >
                      {selectedGroupLabel}
                    </Badge>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {projectGroups.map((group) => {
                    const groupLabel = getGroupLabel(group)
                    const token = getGroupColorToken(groupLabel)
                    return (
                      <SelectItem key={group} value={group}>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: token.bg,
                              borderColor: token.border,
                              color: token.text,
                            }}
                          >
                            {groupLabel}
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                disabled={deletingGroup}
                onClick={async () => {
                  const targetGroup = groupToDelete || "default"
                  const ok = window.confirm(
                    `Delete resources for group '${targetGroup}'? This cannot be undone.`
                  )
                  if (!ok) return
                  try {
                    setDeletingGroup(true)
                    await consoleApi.deleteProjectGroup(projectId, targetGroup)
                    window.alert(`Group deletion started for '${targetGroup}'.`)
                  } catch (e: any) {
                    window.alert(e?.message || "Failed to start group deletion")
                  } finally {
                    setDeletingGroup(false)
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingGroup ? "Starting..." : "Delete Group"}
              </Button>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              const ok = window.confirm("Are you sure you want to delete this project? This action cannot be undone.")
              if (!ok) return
              await deleteProject(projectId)
              router.push(`/subdomain/console/${organizationId}`)
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Project
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

