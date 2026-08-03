"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import { usePermissions } from "@/components/subapps/console/lib/use-permissions"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect, useMemo } from "react"
import { Trash2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

/** Per-group delete with a type-the-name-to-confirm guard. */
function DeleteGroupDialog({ projectId, group }: { projectId: string; group: string }) {
  const label = getGroupLabel(group)
  const token = getGroupColorToken(label)
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const canDelete = confirm.trim() === label && !deleting

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setConfirm("")
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <Badge
          variant="outline"
          style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
        >
          {label}
        </Badge>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete group ${label}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete group “{label}”</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This starts an async worker to delete all AWS resources for this group. This cannot be
          undone. Type{" "}
          <span className="font-mono font-medium text-foreground">{label}</span> to confirm.
        </p>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={label}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete}
            onClick={async () => {
              try {
                setDeleting(true)
                await consoleApi.deleteProjectGroup(projectId, group)
                window.alert(`Group deletion started for '${label}'.`)
                setOpen(false)
              } catch (e: any) {
                window.alert(e?.message || "Failed to start group deletion")
              } finally {
                setDeleting(false)
              }
            }}
          >
            <Trash2 className="mr-2 size-4" />
            {deleting ? "Starting…" : "Delete group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsTab({ projectId }: { projectId: string }) {
  const { state, updateProject, deleteProject } = useConsole()
  const { can } = usePermissions(projectId)
  const canEditDomain = can("project.edit_domain")
  const canGroupDelete = can("group.delete")
  const canDeleteProject = can("project.delete")
  const router = useRouter()
  const params = useParams()
  const organizationId = params.organizationId as string
  const project = state.currentProject && state.currentProject.id === projectId ? state.currentProject : undefined

  const [agentName, setAgentName] = useState(project?.agentName || "")
  const [subdomain, setSubdomain] = useState(project?.subdomain || "")

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
                disabled={!canEditDomain}
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
                disabled={!canEditDomain}
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

      {canGroupDelete || canDeleteProject ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canGroupDelete ? (
              <div className="space-y-2 rounded-md border border-destructive/30 p-4">
                <p className="text-sm font-medium text-destructive">Delete Group Resources</p>
                <p className="text-xs text-muted-foreground">
                  Delete all AWS resources for a deployment group. Each deletion asks you to type the
                  group name to confirm.
                </p>
                {projectGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No groups found.</p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {projectGroups.map((group) => (
                      <DeleteGroupDialog key={group} projectId={projectId} group={group} />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            {canDeleteProject ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  const ok = window.confirm("Are you sure you want to delete this project? This action cannot be undone.")
                  if (!ok) return
                  await deleteProject(projectId)
                  router.push(`/dashboard/${organizationId}`)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

