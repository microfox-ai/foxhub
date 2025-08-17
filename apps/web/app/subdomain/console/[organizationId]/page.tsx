"use client"

import ConsoleLayout from "@/components/subapps/console/components/console-layout"
import { ConsoleProvider, useConsole } from "@/components/subapps/console/context/console-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth/AuthProvider"
import Link from "next/link"
import { useParams } from "next/navigation"
import { timeAgo } from "@/lib/utils"
import { Globe, Code, Box, Server, Plus } from "lucide-react"
import { ProjectTechnologyType } from "@/components/subapps/console/lib/console-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

function CreateProjectCard() {
    const { createProject } = useConsole()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Card className="flex items-center justify-center h-full w-full cursor-pointer hover:bg-muted/50">
                    <div className="text-center">
                        <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">New Project</p>
                    </div>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Button
                        onClick={async () => {
                            await createProject({ name })
                            setOpen(false)
                        }}
                    >
                        Create
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function getTechnologyIcon(tech: string) {
    switch (tech) {
        case ProjectTechnologyType.NODEJS:
            return <Code className="w-4 h-4" />
        case ProjectTechnologyType.PYTHON:
            return <Code className="w-4 h-4" />
        case ProjectTechnologyType.GO:
            return <Code className="w-4 h-4" />
        case ProjectTechnologyType.RUBY:
            return <Code className="w-4 h-4" />
        default:
            return <Globe className="w-4 h-4" />
    }
}


function ProjectsBody() {
  const { state } = useConsole()
  const params = useParams()
  const organizationId = params.organizationId as string

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{"Projects"}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.projects.map((p) => (
          <Link href={`/subdomain/console/${organizationId}/${p._id}`} key={p._id}>
            <Card>
              <CardHeader  className="flex flex-row items-center gap-4">
                <Avatar>
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-base">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  {getTechnologyIcon(p.technology.language)}
                  <span>{p.technology.language} v{p.technology.version}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    <span>Source: {p.source.type}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>{p.runtimes.map(r => r.type).join(', ')}</span>
                </div>
                <p className="mt-2 text-xs">Updated {timeAgo(p.updatedAt)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        <CreateProjectCard />
      </div>
    </div>
  )
}

export default function OrganizationPage() {
  const { user } = useAuth()
  const params = useParams()
  const organizationId = params.organizationId as string

  return (
    <ConsoleProvider userId={user?.id ?? ""} organizationId={organizationId}>
      <ConsoleLayout>
        <ProjectsBody />
      </ConsoleLayout>
    </ConsoleProvider>
  )
}
