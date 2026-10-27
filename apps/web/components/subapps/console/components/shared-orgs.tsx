"use client"

import useSWR from "swr"
import Link from "next/link"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { timeAgo } from "@/lib/utils"
import { Users } from "lucide-react"

/**
 * Organizations shared with the current user (they're a member, not the owner). This is the
 * discovery surface for a teammate: open the org, then see the projects shared with them.
 * Renders nothing when there are none.
 */
export function SharedOrgsSection() {
  const { data } = useSWR("console:shared-orgs", () => consoleApi.listSharedOrganizations(), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const orgs = data ?? []
  if (orgs.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Shared with you</h2>
        <Badge variant="outline">{orgs.length}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orgs.map((o) => (
          <Link href={`/dashboard/${o.id}`} key={o.id}>
            <Card className="hover:bg-muted/50">
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
      </div>
    </div>
  )
}
