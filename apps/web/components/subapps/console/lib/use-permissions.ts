"use client"

import useSWR from "swr"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import type { Permission, ProjectRole, PermissionScope } from "@/server/types"

/**
 * The caller's effective permissions on a project (RBAC). Drives UI gating only —
 * the backend independently enforces every action, so a hidden button is UX, not security.
 *
 * Resolves via cicd `GET /projects/:id/permissions/me`. Owners/org-members come back with
 * every permission; a shared member gets their role-derived (and possibly group-scoped) set.
 */
export type UsePermissions = {
  /** True once the permission set has loaded (so gated UI doesn't flash). */
  ready: boolean
  isLoading: boolean
  role: ProjectRole | "owner" | "org" | "none" | undefined
  scope: PermissionScope | null
  /** Does the caller hold this permission? Returns false until loaded. */
  can: (permission: Permission) => boolean
  /** True for the project owner or an org member (full access). */
  isOwnerOrOrg: boolean
  refresh: () => void
}

export function usePermissions(projectId?: string): UsePermissions {
  const { data, isLoading, mutate } = useSWR(
    projectId ? (["console:permissions", projectId] as const) : null,
    ([, id]) => consoleApi.getMyPermissions(id),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const perms = new Set<Permission>(data?.permissions ?? [])
  return {
    ready: !!data,
    isLoading,
    role: data?.role,
    scope: data?.scope ?? null,
    can: (permission: Permission) => perms.has(permission),
    isOwnerOrOrg: data?.role === "owner" || data?.role === "org",
    refresh: () => void mutate(),
  }
}

/** De-duplicated deployment-group names for a project (for scope pickers). */
export function projectGroupNames(project?: {
  urlsMap?: { group?: string; service?: any }[]
}): string[] {
  const groups = new Set<string>()
  for (const map of project?.urlsMap ?? []) {
    const g = typeof map.group === "string" && map.group.trim() ? map.group.trim() : "default"
    groups.add(g)
    const resources =
      map.service && map.service.runtime !== "server" ? map.service.providerConfig?.resources : undefined
    for (const r of resources ?? []) {
      if (r?.type !== "lambda") continue
      const lg = typeof r.group === "string" && r.group.trim() ? r.group.trim() : g
      groups.add(lg || "default")
    }
  }
  if (groups.size === 0) groups.add("default")
  return Array.from(groups).sort((a, b) => (a === "core" ? -1 : b === "core" ? 1 : a.localeCompare(b)))
}
