"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { consoleApi, type ProjectDto } from "@/components/subapps/console/lib/console-api"
import type { ProjectRole } from "@/server/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UserPlus,
  Crown,
  Trash2,
  ShieldCheck,
  Loader2,
  Check,
  Ban,
  FolderGit2,
} from "lucide-react"

/** Roles that can be assigned when sharing a project (mirrors members-tab). */
const ASSIGNABLE_ROLES: ProjectRole[] = ["admin", "developer", "operator", "viewer", "custom"]
const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  operator: "Operator",
  viewer: "Viewer",
  custom: "Custom",
}

/**
 * Organization roster. Projects can only be shared with people on this list, so this is where
 * the owner adds/removes teammates (by email). Members here get NO project access by themselves
 * — they must still be shared into each project. Visible to org members; editable by the owner.
 */
function AddOrgMemberDialog({ organizationId, onChanged }: { organizationId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    const e = email.trim()
    if (!e || !e.includes("@")) {
      setError("Enter a valid email.")
      return
    }
    try {
      setBusy(true)
      await consoleApi.addOrgMember(organizationId, e)
      onChanged()
      setOpen(false)
      setEmail("")
    } catch (err: any) {
      setError(err?.message || "Failed to add member")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEmail(""); setError(null) } }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 size-4" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add organization member</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <p className="text-xs text-muted-foreground">
            They must already have a Microfox account. They won't get access to any project until
            you share one with them.
          </p>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          <span className="text-xs text-destructive">{error}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type OrgMember = { userId: string; email?: string; name?: string }

/**
 * Per-member project-access manager. Lists every project in the org and lets the owner grant /
 * revoke this member's access one-by-one (with a role) or in bulk ("Give access to all current
 * projects" / "Remove from all"). Project membership lives on each project (not the org roster),
 * so we read it from the projects list (which includes `members` inline for the org owner) and
 * mutate it via the project member endpoints.
 */
function ManageAccessDialog({
  organizationId,
  member,
}: {
  organizationId: string
  member: OrgMember
}) {
  const [open, setOpen] = useState(false)
  const [grantRole, setGrantRole] = useState<ProjectRole>("viewer")
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState<null | "grant" | "revoke">(null)
  const [error, setError] = useState<string | null>(null)

  // Only fetch the org's projects (members included, since the caller is the org owner) when open.
  const { data, isLoading, mutate } = useSWR(
    open && organizationId ? (["console:org-projects", organizationId] as const) : null,
    ([, id]) => consoleApi.listProjects({ organizationId: id }),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )
  const projects = useMemo(() => data ?? [], [data])

  const label = member.email || member.name || member.userId

  /** This member's membership row on a project, if any. */
  const accessOf = (p: ProjectDto) =>
    (p.members ?? []).find((m) => m.userId === member.userId)
  const ownsProject = (p: ProjectDto) => p.ownerId === member.userId

  const grantCount = projects.filter((p) => accessOf(p)).length
  const eligible = projects.filter((p) => !ownsProject(p))

  const grant = async (p: ProjectDto, role: ProjectRole) => {
    await consoleApi.addMember(p.id, {
      userId: member.userId,
      email: member.email,
      name: member.name,
      role,
    })
  }
  const revoke = async (p: ProjectDto) => {
    await consoleApi.removeMember(p.id, member.userId)
  }

  const toggleAccess = async (p: ProjectDto, next: boolean) => {
    setError(null)
    setBusyProjectId(p.id)
    try {
      if (next) await grant(p, grantRole)
      else await revoke(p)
      await mutate()
    } catch (e: any) {
      setError(e?.message || "Failed to update access")
    } finally {
      setBusyProjectId(null)
    }
  }

  const changeRole = async (p: ProjectDto, role: ProjectRole) => {
    setError(null)
    setBusyProjectId(p.id)
    try {
      await consoleApi.updateMember(p.id, member.userId, { role })
      await mutate()
    } catch (e: any) {
      setError(e?.message || "Failed to change role")
    } finally {
      setBusyProjectId(null)
    }
  }

  const bulk = async (mode: "grant" | "revoke") => {
    setError(null)
    setBulkBusy(mode)
    try {
      // Only touch projects that need it: grant to those without access, revoke from those with.
      const targets =
        mode === "grant"
          ? eligible.filter((p) => !accessOf(p))
          : eligible.filter((p) => accessOf(p))
      const results = await Promise.allSettled(
        targets.map((p) => (mode === "grant" ? grant(p, grantRole) : revoke(p))),
      )
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed) setError(`${failed} of ${targets.length} project(s) failed — retry.`)
      await mutate()
    } finally {
      setBulkBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          aria-label={`Manage ${label}'s project access`}
          title="Grant or revoke this member's access to projects"
        >
          <ShieldCheck className="mr-1.5 size-4" />
          Manage access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">Project access — {label}</DialogTitle>
        </DialogHeader>

        {/* Toolbar: default role + bulk shortcuts */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
          <span className="text-xs text-muted-foreground">Role for new grants:</span>
          <Select value={grantRole} onValueChange={(v) => setGrantRole(v as ProjectRole)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!!bulkBusy || isLoading || eligible.every((p) => accessOf(p))}
              onClick={() => bulk("grant")}
            >
              {bulkBusy === "grant" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-3.5" />
              )}
              Give access to all
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-destructive hover:text-destructive"
              disabled={!!bulkBusy || isLoading || grantCount === 0}
              onClick={() => bulk("revoke")}
            >
              {bulkBusy === "revoke" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Ban className="mr-1.5 size-3.5" />
              )}
              Remove from all
            </Button>
          </div>
        </div>

        {error && <div className="text-xs text-destructive">{error}</div>}

        {/* Project list */}
        <div className="max-h-[50vh] overflow-auto rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <FolderGit2 className="size-6" />
              No projects in this organization yet.
            </div>
          ) : (
            <div className="divide-y">
              {projects.map((p) => {
                const access = accessOf(p)
                const isOwner = ownsProject(p)
                const rowBusy = busyProjectId === p.id
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={isOwner ? true : !!access}
                      disabled={isOwner || rowBusy || !!bulkBusy}
                      onCheckedChange={(c) => toggleAccess(p, c === true)}
                      aria-label={`${access ? "Revoke" : "Grant"} access to ${p.displayName}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.displayName}</div>
                      {p.subdomain ? (
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {p.subdomain}
                        </div>
                      ) : null}
                    </div>
                    {rowBusy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {isOwner ? (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600">
                        <Crown className="mr-1 size-3" /> Owner
                      </Badge>
                    ) : access ? (
                      <Select
                        value={(access.role as ProjectRole) ?? "viewer"}
                        onValueChange={(v) => changeRole(p, v as ProjectRole)}
                        disabled={rowBusy || !!bulkBusy}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">No access</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `Access to ${grantCount} of ${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </span>
          <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OrgMembers({ organizationId }: { organizationId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    organizationId ? (["console:org-members", organizationId] as const) : null,
    ([, id]) => consoleApi.listOrgMembers(id),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const ownerId = data?.ownerId
  const youId = data?.currentUserId
  const canManage = !!ownerId && !!youId && ownerId === youId
  const members = data?.members ?? []

  const remove = async (userId: string, label: string) => {
    if (!window.confirm(`Remove ${label} from the organization? They'll also lose access to all of its projects.`)) return
    try {
      await consoleApi.removeOrgMember(organizationId, userId)
      mutate()
    } catch (e: any) {
      window.alert(e?.message || "Failed to remove member")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Organization members</CardTitle>
          <p className="text-xs text-muted-foreground">
            People who can be shared into this organization's projects.
          </p>
        </div>
        {canManage ? <AddOrgMemberDialog organizationId={organizationId} onChanged={() => mutate()} /> : null}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {(error as Error)?.message || "Couldn't load members"}
          </div>
        ) : (
          <div className="divide-y">
            {/* Owner */}
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar className="size-8">
                <AvatarFallback><Crown className="size-4 text-amber-500" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {data?.ownerEmail || data?.ownerName || ownerId}
                  {ownerId === youId ? (
                    <Badge variant="outline" className="ml-2 border-primary/30 bg-primary/10 text-primary">You</Badge>
                  ) : null}
                </div>
              </div>
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600">Owner</Badge>
            </div>

            {members.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No other members yet.{canManage ? " Add teammates to share projects with them." : ""}
              </div>
            ) : (
              members.map((m) => {
                const label = m.email || m.name || m.userId
                return (
                  <div key={m.userId} className="flex items-center gap-3 px-3 py-3">
                    <Avatar className="size-8">
                      <AvatarFallback>{(m.email || m.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {label}
                        {m.userId === youId ? (
                          <Badge variant="outline" className="ml-2 border-primary/30 bg-primary/10 text-primary">You</Badge>
                        ) : null}
                      </div>
                      {m.email && m.userId ? (
                        <div className="truncate font-mono text-[11px] text-muted-foreground">id: {m.userId}</div>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <ManageAccessDialog organizationId={organizationId} member={m} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => remove(m.userId, label)}
                          aria-label="Remove member"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
