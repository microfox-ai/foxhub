"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import { usePermissions, projectGroupNames } from "@/components/subapps/console/lib/use-permissions"
import { useConsole } from "@/components/subapps/console/context/console-context"
import type {
  IProjectMember,
  Permission,
  ProjectRole,
  PermissionScope,
  ScopeMode,
} from "@/server/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  UserPlus,
  MoreHorizontal,
  Crown,
  ShieldAlert,
  Trash2,
  Pencil,
  PauseCircle,
  PlayCircle,
  Clock,
  Layers,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Catalog (mirror of cicd permissions.ts — labels only)
// ---------------------------------------------------------------------------

const ASSIGNABLE_ROLES: ProjectRole[] = ["admin", "developer", "operator", "viewer", "custom"]

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  operator: "Operator",
  viewer: "Viewer",
  custom: "Custom",
}

const ROLE_HINT: Record<ProjectRole, string> = {
  owner: "Full control",
  admin: "Everything except transferring ownership",
  developer: "Deploy + manage env + read everything",
  operator: "Deploy / stop + observability, no env edits",
  viewer: "Read-only across the project",
  custom: "Hand-pick exactly which capabilities",
}

/** Grouped for the custom-permission grid. */
const PERMISSION_GROUPS: { title: string; perms: { id: Permission; label: string }[] }[] = [
  {
    title: "Project",
    perms: [
      { id: "project.view", label: "View project" },
      { id: "project.edit", label: "Edit settings" },
      { id: "project.edit_domain", label: "Edit subdomain / agent name" },
      { id: "project.delete", label: "Delete project" },
    ],
  },
  {
    title: "Members",
    perms: [
      { id: "members.view", label: "View members" },
      { id: "members.manage", label: "Manage members" },
    ],
  },
  {
    title: "Deployments",
    perms: [
      { id: "deployment.view", label: "View deployments" },
      { id: "deployment.logs.view", label: "View build logs" },
      { id: "deployment.create", label: "Deploy" },
      { id: "deployment.stop", label: "Stop deployment" },
      { id: "deployment.delete", label: "Delete deployment" },
      { id: "group.delete", label: "Delete group resources" },
    ],
  },
  {
    title: "Environment & observability",
    perms: [
      { id: "env.view", label: "View env vars" },
      { id: "env.edit", label: "Edit env vars" },
      { id: "observability.view", label: "View observability" },
    ],
  },
  {
    title: "Workers",
    perms: [
      { id: "workers.view", label: "View workers + logs" },
      { id: "workers.trigger", label: "Trigger workers" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

function RolePill({ role }: { role: ProjectRole }) {
  return (
    <Badge variant="outline" className="capitalize">
      {ROLE_LABEL[role] ?? role}
    </Badge>
  )
}

function StatusPill({ status }: { status: IProjectMember["status"] }) {
  const map: Record<IProjectMember["status"], string> = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    invited: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    suspended: "bg-muted text-muted-foreground border-border",
  }
  const label = status === "invited" ? "Pending invite" : status === "suspended" ? "Suspended" : "Active"
  return (
    <Badge variant="outline" className={cn("capitalize", map[status])}>
      {label}
    </Badge>
  )
}

function scopeSummary(scope?: PermissionScope): string {
  const g = scope?.groups
  if (!g || g.mode === "all") return "All groups"
  const vals = (g.values ?? []).join(", ") || "—"
  return g.mode === "allow" ? `Only: ${vals}` : `All except: ${vals}`
}

// ---------------------------------------------------------------------------
// Member form (shared by invite + edit)
// ---------------------------------------------------------------------------

type FormValue = {
  role: ProjectRole
  permissions: Permission[]
  scopeMode: ScopeMode
  scopeGroups: string[]
  expiresAt: string // yyyy-mm-dd or ""
}

function emptyForm(): FormValue {
  return { role: "viewer", permissions: [], scopeMode: "all", scopeGroups: [], expiresAt: "" }
}

function memberToForm(m: IProjectMember): FormValue {
  return {
    role: m.role,
    permissions: m.permissions ?? [],
    scopeMode: m.scope?.groups?.mode ?? "all",
    scopeGroups: m.scope?.groups?.values ?? [],
    expiresAt: m.expiresAt ? m.expiresAt.slice(0, 10) : "",
  }
}

function buildScope(form: FormValue): PermissionScope | undefined {
  if (form.scopeMode === "all") return { groups: { mode: "all" } }
  return { groups: { mode: form.scopeMode, values: form.scopeGroups } }
}

function MemberFormFields({
  form,
  setForm,
  groupOptions,
}: {
  form: FormValue
  setForm: (f: FormValue) => void
  groupOptions: string[]
}) {
  const toggleGroup = (g: string) => {
    const has = form.scopeGroups.includes(g)
    setForm({
      ...form,
      scopeGroups: has ? form.scopeGroups.filter((x) => x !== g) : [...form.scopeGroups, g],
    })
  }
  const togglePerm = (p: Permission) => {
    const has = form.permissions.includes(p)
    setForm({
      ...form,
      permissions: has ? form.permissions.filter((x) => x !== p) : [...form.permissions, p],
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as ProjectRole })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{ROLE_HINT[form.role]}</p>
      </div>

      {form.role === "custom" ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="size-4 text-amber-600" /> Capabilities
          </div>
          {PERMISSION_GROUPS.map((grp) => (
            <div key={grp.title} className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">{grp.title}</div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {grp.perms.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.permissions.includes(p.id)}
                      onCheckedChange={() => togglePerm(p.id)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Layers className="size-3.5" /> Group access
        </Label>
        <Select value={form.scopeMode} onValueChange={(v) => setForm({ ...form, scopeMode: v as ScopeMode })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            <SelectItem value="allow">Only these groups</SelectItem>
            <SelectItem value="deny">All except these groups</SelectItem>
          </SelectContent>
        </Select>
        {form.scopeMode !== "all" ? (
          <div className="flex flex-wrap gap-2 rounded-md border p-2">
            {groupOptions.map((g) => (
              <label
                key={g}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs",
                  form.scopeGroups.includes(g) ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                <Checkbox
                  checked={form.scopeGroups.includes(g)}
                  onCheckedChange={() => toggleGroup(g)}
                />
                <span className="font-mono">{g}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> Access expires (optional)
        </Label>
        <Input
          type="date"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          className="w-fit"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteDialog({
  projectId,
  organizationId,
  excludeUserIds,
  groupOptions,
  onChanged,
}: {
  projectId: string
  organizationId?: string
  /** userIds already on the project (owner + members) — excluded from the picker. */
  excludeUserIds: Set<string>
  groupOptions: string[]
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [form, setForm] = useState<FormValue>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Roster of org members — a project can only be shared with people already in the org.
  const { data: org } = useSWR(
    open && organizationId ? (["console:org-members", organizationId] as const) : null,
    ([, id]) => consoleApi.listOrgMembers(id),
    { revalidateOnFocus: false },
  )
  const candidates = (org?.members ?? []).filter((m) => !excludeUserIds.has(m.userId))
  const selected = candidates.find((c) => c.userId === userId)

  const reset = () => {
    setUserId("")
    setForm(emptyForm())
    setError(null)
  }

  const submit = async () => {
    setError(null)
    if (!userId) {
      setError("Pick an organization member to share with.")
      return
    }
    try {
      setBusy(true)
      await consoleApi.addMember(projectId, {
        userId,
        email: selected?.email,
        name: selected?.name,
        role: form.role,
        permissions: form.role === "custom" ? form.permissions : undefined,
        scope: buildScope(form),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      })
      onChanged()
      setOpen(false)
      reset()
    } catch (e: any) {
      setError(e?.message || "Failed to add member")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 size-4" />
          Share with member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organization member</Label>
            {candidates.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Everyone in the organization is already on this project. To share with someone new,
                {organizationId ? (
                  <>
                    {" "}
                    <Link href={`/subdomain/console/${organizationId}?tab=members`} className="text-primary underline">
                      add them to the organization
                    </Link>{" "}
                    first.
                  </>
                ) : (
                  " add them to the organization first."
                )}
              </div>
            ) : (
              <>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.userId} value={c.userId}>
                        {c.email || c.name || c.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only organization members can be added.{" "}
                  {organizationId ? (
                    <Link href={`/subdomain/console/${organizationId}?tab=members`} className="text-primary underline">
                      Manage the organization roster
                    </Link>
                  ) : null}
                </p>
              </>
            )}
          </div>
          {candidates.length > 0 ? (
            <MemberFormFields form={form} setForm={setForm} groupOptions={groupOptions} />
          ) : null}
        </div>
        <DialogFooter className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-destructive">{error}</span>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={submit} disabled={busy || candidates.length === 0}>
              {busy ? "Sharing…" : "Share"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

function EditMemberDialog({
  projectId,
  member,
  groupOptions,
  open,
  onOpenChange,
  onChanged,
}: {
  projectId: string
  member: IProjectMember
  groupOptions: string[]
  open: boolean
  onOpenChange: (o: boolean) => void
  onChanged: () => void
}) {
  const [form, setForm] = useState<FormValue>(() => memberToForm(member))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const memberId = member.userId || member.email || ""

  const submit = async () => {
    setError(null)
    try {
      setBusy(true)
      await consoleApi.updateMember(projectId, memberId, {
        role: form.role,
        permissions: form.role === "custom" ? form.permissions : [],
        scope: buildScope(form),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      })
      onChanged()
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message || "Failed to update member")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit access — {member.email || member.name || member.userId}</DialogTitle>
        </DialogHeader>
        <MemberFormFields form={form} setForm={setForm} groupOptions={groupOptions} />
        <DialogFooter className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-destructive">{error}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Member row
// ---------------------------------------------------------------------------

function MemberRow({
  projectId,
  member,
  canManage,
  isYou,
  groupOptions,
  onChanged,
}: {
  projectId: string
  member: IProjectMember
  canManage: boolean
  isYou: boolean
  groupOptions: string[]
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const memberId = member.userId || member.email || ""
  // Prefer email as the human identity; fall back to name, then a short userId.
  const primary = member.email || member.name || (member.userId ? `User ${member.userId.slice(0, 8)}` : "Unknown")
  // Secondary line: the name (if email was primary) and/or the raw user id, shown muted.
  const secondaryBits = [
    member.email && member.name ? member.name : null,
    member.userId ? `id: ${member.userId}` : member.status === "invited" ? "not yet signed in" : null,
  ].filter(Boolean)
  const initial = (member.email || member.name || "?").charAt(0).toUpperCase()

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      onChanged()
    } catch (e: any) {
      window.alert(e?.message || "Action failed")
    } finally {
      setBusy(false)
    }
  }

  const toggleSuspend = () =>
    act(() =>
      consoleApi.updateMember(projectId, memberId, {
        status: member.status === "suspended" ? "active" : "suspended",
      }),
    )
  const remove = () => {
    if (!window.confirm(`Remove ${primary} from this project?`)) return
    return act(() => consoleApi.removeMember(projectId, memberId))
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Avatar className="size-8">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{primary}</span>
          {isYou ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              You
            </Badge>
          ) : null}
          {member.expiresAt ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              expires {new Date(member.expiresAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>
        {secondaryBits.length > 0 ? (
          <div className="truncate font-mono text-[11px] text-muted-foreground" title={member.userId}>
            {secondaryBits.join(" · ")}
          </div>
        ) : null}
        <div className="truncate text-xs text-muted-foreground">{scopeSummary(member.scope)}</div>
      </div>
      <RolePill role={member.role} />
      <StatusPill status={member.status} />
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label="Member actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="mr-2 size-4" /> Edit access
            </DropdownMenuItem>
            {member.status !== "invited" ? (
              <DropdownMenuItem onClick={toggleSuspend}>
                {member.status === "suspended" ? (
                  <>
                    <PlayCircle className="mr-2 size-4" /> Reactivate
                  </>
                ) : (
                  <>
                    <PauseCircle className="mr-2 size-4" /> Suspend
                  </>
                )}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={remove}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {editing ? (
        <EditMemberDialog
          projectId={projectId}
          member={member}
          groupOptions={groupOptions}
          open={editing}
          onOpenChange={setEditing}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab root
// ---------------------------------------------------------------------------

export function MembersTab({ projectId }: { projectId: string }) {
  const { state } = useConsole()
  const { can } = usePermissions(projectId)
  const canManage = can("members.manage")
  const project =
    state.currentProject && state.currentProject.id === projectId ? state.currentProject : undefined
  const groupOptions = useMemo(() => projectGroupNames(project), [project])

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? (["console:members", projectId] as const) : null,
    ([, id]) => consoleApi.listMembers(id),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const members = data?.members ?? []
  const ownerId = data?.ownerId
  const youId = data?.currentUserId ?? state.userId
  const ownerIsYou = !!youId && ownerId === youId
  const ownerPrimary = data?.ownerEmail || data?.ownerName || (ownerId ? `User ${ownerId.slice(0, 8)}` : "Project owner")
  const excludeUserIds = useMemo(() => {
    const ids = new Set<string>()
    if (ownerId) ids.add(ownerId)
    for (const m of members) if (m.userId) ids.add(m.userId)
    return ids
  }, [ownerId, members])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    const msg = (error as Error)?.message || ""
    const forbidden = /permission/i.test(msg) || /403/.test(msg)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <ShieldAlert className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {forbidden ? "You don't have permission to view members" : "Couldn't load members"}
          </p>
          {!forbidden ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Members</CardTitle>
            <p className="text-xs text-muted-foreground">
              Share this project with teammates and control exactly what they can do.
            </p>
          </div>
          {canManage ? (
            <InviteDialog
              projectId={projectId}
              organizationId={project?.organizationId}
              excludeUserIds={excludeUserIds}
              groupOptions={groupOptions}
              onChanged={() => mutate()}
            />
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Owner */}
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar className="size-8">
                <AvatarFallback>
                  <Crown className="size-4 text-amber-500" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{ownerPrimary}</span>
                  {ownerIsYou ? (
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      You
                    </Badge>
                  ) : null}
                </div>
                {ownerId ? (
                  <div className="truncate font-mono text-[11px] text-muted-foreground" title={ownerId}>
                    id: {ownerId}
                  </div>
                ) : null}
                <div className="text-xs text-muted-foreground">All groups · full control</div>
              </div>
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600">
                Owner
              </Badge>
            </div>

            {members.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No one else has access yet.
                {canManage ? " Use “Invite member” to share this project." : ""}
              </div>
            ) : (
              members.map((m) => (
                <MemberRow
                  key={m.userId || m.email}
                  projectId={projectId}
                  member={m}
                  canManage={canManage}
                  isYou={!!youId && m.userId === youId}
                  groupOptions={groupOptions}
                  onChanged={() => mutate()}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
