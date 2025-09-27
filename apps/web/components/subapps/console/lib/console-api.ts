"use client"

import {
  type IProject,
  type IOrganization,
} from "@/server/types"

export const API_BASE = (process.env.NEXT_PUBLIC_CONSOLE_API_BASE || process.env.NEXT_PUBLIC_CICD_BASE_URL || "").trim()

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
  organizationId: string
  userId: string
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

export type BotProject = {
  id: string
  name: string
  githubRepoUrl: string
}

export const consoleApi = {
  async listOrganizations(ownerId: string) {
    const url = new URL(`/api/organizations`, API_BASE)
    url.searchParams.set("ownerId", ownerId)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Failed to list organizations: ${res.status}`)
    const data = await res.json()
    return data.items as OrganizationDto[]
  },

  async createOrganization(
    input: Omit<IOrganization, "id" | "createdAt" | "updatedAt" | "members"> & { members?: string[] },
  ) {
    const res = await fetch(`${API_BASE}/api/organizations`, {
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
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Failed to list projects: ${res.status}`)
    const data = await res.json()
    return data.items as ProjectDto[]
  },

  async createProject(
    input: Omit<IProject, "id" | "createdAt" | "updatedAt">,
  ) {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to create project`)
    return (await res.json()) as ProjectDto
  },

  async getDeployment(deploymentId: string) {
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}`)
    if (!res.ok) throw new Error(`Failed to fetch deployment: ${res.status}`)
    return (await res.json()) as DeploymentDto
  },

  async listProjectDeployments(projectId: string) {
    const url = new URL(`/api/deployments`, API_BASE)
    url.searchParams.set("projectId", projectId)
    const res = await fetch(url.toString())
    if (!res.ok) {
      if (res.status === 404) return [] as DeploymentDto[]
      throw new Error(`Failed to list deployments: ${res.status}`)
    }
    const data = await res.json()
    return (data.items ?? data.deployments ?? data) as DeploymentDto[]
  },

  async getDeploymentLogs(deploymentId: string) {
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}/logs`)
    if (!res.ok) throw new Error(`Failed to fetch deployment logs: ${res.status}`)
    const data = await res.json()
    return (data.logs || {}) as DeploymentLogsDto
  },

  async startLocalDeployment(projectId: string, archiveFile: File) {
    const form = new FormData()
    form.append("archive", archiveFile)
    const res = await fetch(`${API_BASE}/api/deployments/local`, {
      method: "POST",
      headers: { "x-project-id": projectId },
      body: form,
    } as RequestInit)
    if (!res.ok) throw new Error(`Failed to start deployment: ${res.status}`)
    return (await res.json()) as { deploymentId: string }
  },

  async stopDeployment(deploymentId: string) {
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}/stop`, { method: "POST" })
    if (!res.ok) throw new Error(`Failed to stop deployment: ${res.status}`)
    return await res.json()
  },

  async archiveDeployment(deploymentId: string) {
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}`, { method: "DELETE" })
    if (!res.ok) throw new Error(`Failed to archive deployment: ${res.status}`)
    return await res.json()
  },

  getOrCreateConsoleProject: async (userId: string): Promise<BotProject> => {
    return fetch(`/api/bot-project/console?userId=${userId}`).then((res) => res.json())
  },
}
