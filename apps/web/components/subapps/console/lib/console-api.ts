"use client"

import {
  type IProject,
  type IOrganization,
} from "@/server/types"
import { createClient } from "@/utils/supabase/browser-client"

export const API_BASE = (process.env.NEXT_PUBLIC_CICD_BASE_URL || "").trim()

/**
 * Fetch wrapper for cicd calls. Forwards the logged-in user's Supabase JWT as
 * a Bearer token so cicd can authenticate the request once it runs with CICD_AUTH_ENFORCE=true
 * (cicd verifies the JWT → user identity → ownership checks). We forward the JWT rather than the
 * static service key because this runs in the browser, where the service key can't live safely.
 * No-op when the user isn't signed in.
 */
async function cicdFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let authHeader: Record<string, string> = {}
  try {
    const {
      data: { session },
    } = await createClient().auth.getSession()
    if (session?.access_token) authHeader = { Authorization: `Bearer ${session.access_token}` }
  } catch {
    // Not signed in / no session — proceed without the header.
  }
  return fetch(input, {
    ...init,
    headers: { ...authHeader, ...(init.headers as Record<string, string> | undefined) },
  })
}

export enum ProjectSourceType {
  GITHUB = "github",
  DOCKER_IMAGE = "docker_image",
  LOCAL = "local",
}

export enum ProjectTechnologyType {
  NODEJS = "nodejs",
  PYTHON = "python",
  GO = "go",
  RUBY = "ruby",
  OTHER = "other",
}

export enum ProjectRuntimeType {
  SERVER = "server",
  SERVERLESS = "serverless",
}

export type OrganizationDto = IOrganization
export type ProjectDto = IProject

export interface DeploymentDto {
  _id: string
  projectId: string
  group?: string
  organizationId: string
  userId: string
  /** SEC-2 / Plan A: who actually triggered the deployment (CLI/console). */
  triggeredBy?: {
    userId: string
    email?: string
    name?: string
    via?: "cli" | "console"
  }
  status: string
  baseUrl?: string
  metrics?: any
  error?: any
  createdAt: string
  updatedAt: string
}
export interface DeploymentLogEntryDto {
  timestamp: string
  message: string
  sourceFile?: string
  sourceLine?: number
  sourceColumn?: number
  sourceFunction?: string
}

export interface DeploymentLogsDto {
  compiling?: DeploymentLogEntryDto[]
  deploying?: DeploymentLogEntryDto[]
  post_deployment?: DeploymentLogEntryDto[]
}

/** Per-step counts of total log entries on the server (cursor for incremental fetch). */
export type DeploymentLogCounts = {
  compiling: number
  deploying: number
  post_deployment: number
}

/** Result of an (optionally incremental) deployment-logs fetch. */
export interface DeploymentLogsResult {
  /** When `partial`, only entries appended past the requested cursor; otherwise the full logs. */
  logs: DeploymentLogsDto
  /** Total entry counts on the server, per step. */
  counts: DeploymentLogCounts
  /** True when `logs` is a delta relative to the requested `after` cursor. */
  partial: boolean
}

export type BotProject = {
  id: string
  name: string
  githubRepoUrl: string
}

export const consoleApi = {
  async listOrganizations(ownerId: string) {
    const url = new URL(`/api/organizations`, API_BASE)
    url.searchParams.set("ownerId", ownerId)
    const res = await cicdFetch(url.toString())
    if (!res.ok) throw new Error(`Failed to list organizations: ${res.status}`)
    const data = await res.json()
    return data.items as OrganizationDto[]
  },

  async getOrganization(organizationId: string) {
    const res = await cicdFetch(`${API_BASE}/api/organizations/${organizationId}`)
    if (!res.ok) throw new Error(`Failed to fetch organization: ${res.status}`)
    return (await res.json()) as OrganizationDto
  },

  async createOrganization(
    input: Omit<IOrganization, "id" | "createdAt" | "updatedAt" | "members"> & { members?: string[] },
  ) {
    const res = await cicdFetch(`${API_BASE}/api/organizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to create organization`)
    return (await res.json()) as OrganizationDto
  },

  async listProjects(params: { organizationId?: string }) {
    const url = new URL(`/api/projects`, API_BASE)
    if (params.organizationId) url.searchParams.set("organizationId", params.organizationId)
    const res = await cicdFetch(url.toString())
    if (!res.ok) throw new Error(`Failed to list projects: ${res.status}`)
    const data = await res.json()
    return data.items as ProjectDto[]
  },

  async createProject(
    input: Omit<IProject, "id" | "createdAt" | "updatedAt">,
  ) {
    const res = await cicdFetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to create project`)
    return (await res.json()) as ProjectDto
  },

  async getProject(projectId: string) {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to fetch project`)
    return (await res.json()) as ProjectDto
  },

  async updateProject(
    projectId: string,
    updates: Partial<Pick<ProjectDto, "agentName" | "subdomain">>,
  ) {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to update project`)
    return (await res.json()) as ProjectDto
  },

  async deleteProject(projectId: string) {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}`, { method: "DELETE" })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to delete project`)
    return await res.json()
  },

  async deleteProjectGroup(projectId: string, group: string) {
    const safeGroup = encodeURIComponent((group || "default").trim() || "default")
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}/groups/${safeGroup}`, {
      method: "DELETE",
      headers: {
        "x-project-id": projectId,
      },
    })
    if (!res.ok) {
      throw new Error((await res.json().catch(() => ({}))).error || `Failed to delete project group`)
    }
    return await res.json()
  },

  async getDeployment(deploymentId: string) {
    const res = await cicdFetch(`${API_BASE}/api/deployments/${deploymentId}`)
    if (!res.ok) throw new Error(`Failed to fetch deployment: ${res.status}`)
    return (await res.json()) as DeploymentDto
  },

  async listProjectDeployments(projectId: string) {
    const url = new URL(`/api/deployments`, API_BASE)
    url.searchParams.set("projectId", projectId)
    const res = await cicdFetch(url.toString())
    if (!res.ok) {
      if (res.status === 404) return [] as DeploymentDto[]
      throw new Error(`Failed to list deployments: ${res.status}`)
    }
    const data = await res.json()
    return (data.items ?? data.deployments ?? data) as DeploymentDto[]
  },

  /** Paginated deployments for "load more". The cicd endpoint caps limit at 100. */
  async listProjectDeploymentsPage(
    projectId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
  ): Promise<{ items: DeploymentDto[]; page: number; limit: number }> {
    const url = new URL(`/api/deployments`, API_BASE)
    url.searchParams.set("projectId", projectId)
    url.searchParams.set("page", String(page))
    url.searchParams.set("limit", String(limit))
    const res = await cicdFetch(url.toString())
    if (!res.ok) {
      if (res.status === 404) return { items: [], page, limit }
      throw new Error(`Failed to list deployments: ${res.status}`)
    }
    const data = await res.json()
    return {
      items: (data.deployments ?? data.items ?? []) as DeploymentDto[],
      page: data.page ?? page,
      limit: data.limit ?? limit,
    }
  },

  async getDeploymentLogs(
    deploymentId: string,
    after?: Partial<DeploymentLogCounts>,
  ): Promise<DeploymentLogsResult> {
    const url = new URL(`/api/deployments/${deploymentId}/logs`, API_BASE)
    if (after) {
      const cursor = (["compiling", "deploying", "post_deployment"] as const)
        .map((s) => `${s}:${after[s] ?? 0}`)
        .join(",")
      url.searchParams.set("after", cursor)
    }
    const res = await cicdFetch(url.toString())
    if (!res.ok) throw new Error(`Failed to fetch deployment logs: ${res.status}`)
    const data = await res.json()
    return {
      logs: (data.logs || {}) as DeploymentLogsDto,
      counts: {
        compiling: data.counts?.compiling ?? 0,
        deploying: data.counts?.deploying ?? 0,
        post_deployment: data.counts?.post_deployment ?? 0,
      },
      partial: !!data.partial,
    }
  },

  async startLocalDeployment(projectId: string, archiveFile: File) {
    const form = new FormData()
    form.append("archive", archiveFile)
    const res = await cicdFetch(`${API_BASE}/api/deployments/local`, {
      method: "POST",
      headers: { "x-project-id": projectId },
      body: form,
    } as RequestInit)
    if (!res.ok) throw new Error(`Failed to start deployment: ${res.status}`)
    return (await res.json()) as { deploymentId: string }
  },

  async stopDeployment(deploymentId: string) {
    const res = await cicdFetch(`${API_BASE}/api/deployments/${deploymentId}/stop`, { method: "POST" })
    if (!res.ok) throw new Error(`Failed to stop deployment: ${res.status}`)
    return await res.json()
  },

  async archiveDeployment(deploymentId: string) {
    const res = await cicdFetch(`${API_BASE}/api/deployments/${deploymentId}`, { method: "DELETE" })
    if (!res.ok) throw new Error(`Failed to archive deployment: ${res.status}`)
    return await res.json()
  },

  /** Live env per function, grouped (owner-only; platform secrets filtered server-side). */
  async getProjectEnv(projectId: string) {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}/env`)
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).error
      throw new Error(msg || `Failed to fetch env: ${res.status}`)
    }
    return (await res.json()) as {
      configured: boolean
      groups: Record<string, { name: string; env: Record<string, string> }[]>
    }
  },

  /**
   * Apply env live to functions. `updates` maps each function name to its FULL owner-env
   * (platform vars are preserved server-side). A per-function map lets the console change a
   * shared var across many functions without touching any function's unique vars.
   */
  async updateProjectEnv(
    projectId: string,
    updates: Record<string, Record<string, string>>,
  ) {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}/env`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    })
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).error
      throw new Error(msg || `Failed to update env: ${res.status}`)
    }
    return (await res.json()) as { ok: boolean; applied: string[]; appliedCount: number }
  },

  getOrCreateConsoleProject: async (userId: string): Promise<BotProject> => {
    return fetch(`/api/bot-project/console?userId=${userId}`).then((res) => res.json())
  },
}
