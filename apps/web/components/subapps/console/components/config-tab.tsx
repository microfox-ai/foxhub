"use client"

import { useConsole } from "@/components/subapps/console/context/console-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ConfigTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const project = state.currentProject && state.currentProject.id === projectId ? state.currentProject : undefined

  if (!project) {
    return <div className="text-sm text-muted-foreground">{"Project not found"}</div>
  }

  const config = {
    projectId: project.id,
    publish: {
      subdomain: project.subdomain || "",
      agentName: project.agentName,
      handles: {
        agent: "/agent",
        openapi: "/docs.json",
        public: "/public"
      }
    },
    deployment: {
      apiMode: "staging",
      apiVersion: "v2",
      ignorePatterns: [".build/**", "package-lock.json"]
    }
  }

  const configJson = JSON.stringify(config, null, 2)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(configJson)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Configuration</CardTitle>
            <CardDescription>Current project configuration JSON</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
          <code>{configJson}</code>
        </pre>
      </CardContent>
    </Card>
  )
}

