"use client"

import { useConsole } from "@/components/subapps/console/context/console-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SharedOrgsSection } from "@/components/subapps/console/components/shared-orgs"
import { useAuth } from "@/components/auth/AuthProvider"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { timeAgo } from "@/lib/utils"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

function CreateOrganizationCard() {
    const { createOrganization } = useConsole()
    const { user } = useAuth()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Card className="flex items-center justify-center h-full w-full cursor-pointer hover:bg-muted/50">
                    <div className="text-center">
                        <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">New Organization</p>
                    </div>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Button
                        onClick={async () => {
                              await createOrganization({ name, description, ownerId: user?.id as string })
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

function OrganizationsBody() {
  const { state } = useConsole()

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{"Organizations"}</h1>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.loadingOrganizations && state.organizations.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={`sk-${i}`}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))
          : null}
        {state.organizations.map((o) => (
          <Link href={`/subdomain/console/${o.id}`} key={o.id}>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar>
                  <AvatarImage src={o.avatar ?? ""} />
                  <AvatarFallback>{o.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-base">{o.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="line-clamp-2">{o.description || "No description"}</p>
                <p className="mt-2 text-xs">Updated {timeAgo(o.updatedAt.toString())}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        <CreateOrganizationCard />
      </div>
      <SharedOrgsSection />
    </div>
  )
}

export default function Page() {
  return <OrganizationsBody />
}
