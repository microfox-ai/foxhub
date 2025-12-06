"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
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

  useEffect(() => {
    setAgentName(project?.agentName || "")
    setSubdomain(project?.subdomain || "")
  }, [project?.agentName, project?.subdomain])

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
        <CardContent>
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

