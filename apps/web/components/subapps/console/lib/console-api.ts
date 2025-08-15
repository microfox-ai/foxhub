"use client"

export const API_BASE = (process.env.NEXT_PUBLIC_CONSOLE_API_BASE || process.env.NEXT_PUBLIC_CICD_BASE_URL || "").trim()

export enum ProjectSourceType {
  GITHUB = 'github',
  DOCKER_IMAGE = 'docker_image',
  LOCAL = 'local',
}

export enum ProjectTechnologyType {
  NODEJS = 'nodejs',
  PYTHON = 'python',
  GO = 'go',
  RUBY = 'ruby',
  OTHER = 'other',
}

export enum ProjectRuntimeType {
  SERVER = 'server',
  SERVERLESS = 'serverless',
}

export interface OrganizationDto {
  _id: string
  name: string
  description?: string
  avatar?: string
  ownerId: string
  members: string[]
  createdAt: string
  updatedAt: string
}
export interface ProjectDto {
  _id: string
  name: string
  avatar?: string
  organizationId: string
  userId: string
  source: { type: ProjectSourceType }
  technology: { language: ProjectTechnologyType, version: string, isTypeSafe?: boolean }
  runtimes: { type: ProjectRuntimeType, provider: string, region: string, memory: number, functions: { name: string, arn: string, region: string }[] }[]
  services: any[]
  createdAt: string
  updatedAt: string
}
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

import { mockDeploymentsByProject, mockLogsByDeployment, mockOrganizations, mockProjects } from "./mock-data"

export type BotProject = {
  id: string;
  name: string;
  githubRepoUrl: string;
};

function hasApiBase() {
  return !!API_BASE
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export const consoleApi = {
  async listOrganizations(ownerId: string) {
    if (!hasApiBase()) {
      await delay(200)
      return mockOrganizations.filter((o) => o.ownerId === ownerId)
    }
    const url = new URL(`/api/organizations`, API_BASE)
    url.searchParams.set("ownerId", ownerId)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Failed to list organizations: ${res.status}`)
    const data = await res.json()
    return data.items as OrganizationDto[]
  },

  async createOrganization(input: { name: string; ownerId: string; description?: string; avatar?: string }) {
    if (!hasApiBase()) {
      await delay(200)
      const org: OrganizationDto = {
        _id: String(Date.now()),
        name: input.name,
        description: input.description,
        avatar: input.avatar,
        ownerId: input.ownerId,
        members: [input.ownerId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockOrganizations.push(org)
      return org
    }
    const res = await fetch(`${API_BASE}/api/organizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to create organization`)
    return (await res.json()) as OrganizationDto
  },

  async listProjects(params: { organizationId?: string; userId?: string }) {
    if (!hasApiBase()) {
      await delay(200)
      let items = [...mockProjects]
      if (params.organizationId) items = items.filter((p) => p.organizationId === params.organizationId)
      if (params.userId) items = items.filter((p) => p.userId === params.userId)
      return items as ProjectDto[]
    }
    const url = new URL(`/api/projects`, API_BASE)
    if (params.organizationId) url.searchParams.set("organizationId", params.organizationId)
    if (params.userId) url.searchParams.set("userId", params.userId)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Failed to list projects: ${res.status}`)
    const data = await res.json()
    return data.items as ProjectDto[]
  },

  async createProject(input: {
    name: string
    avatar?: string
    organizationId: string
    userId: string
    source: any
    technology: { language?: string; version?: string; isTypeSafe?: boolean }
    runtimes?: any[]
    services?: any[]
  }) {
    if (!hasApiBase()) {
      await delay(300)
      const proj: ProjectDto = {
        _id: String(Date.now()),
        name: input.name,
        avatar: input.avatar,
        organizationId: input.organizationId,
        userId: input.userId,
        source: input.source,
        technology: {
          language: input.technology?.language as ProjectTechnologyType ?? ProjectTechnologyType.NODEJS,
          version: input.technology?.version ?? "18.x",
          isTypeSafe: !!input.technology?.isTypeSafe,
        },
        runtimes: input.runtimes ?? [],
        services: input.services ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockProjects.push(proj)
      return proj
    }
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to create project`)
    return (await res.json()) as ProjectDto
  },

  async getDeployment(deploymentId: string) {
    if (!hasApiBase()) {
      await delay(200)
      const all = Object.values(mockDeploymentsByProject).flat()
      const dep = all.find((d) => d._id === deploymentId)
      if (!dep) throw new Error("Deployment not found")
      return dep
    }
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}`)
    if (!res.ok) throw new Error(`Failed to fetch deployment: ${res.status}`)
    return (await res.json()) as DeploymentDto
  },

  async listProjectDeployments(projectId: string) {
    if (!hasApiBase()) {
      await delay(250)
      return mockDeploymentsByProject[projectId] ?? ([] as DeploymentDto[])
    }
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
    if (!hasApiBase()) {
      await delay(200)
      return mockLogsByDeployment[deploymentId] ?? { compiling: [], deploying: [], post_deployment: [] }
    }
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}/logs`)
    if (!res.ok) throw new Error(`Failed to fetch deployment logs: ${res.status}`)
    const data = await res.json()
    return (data.logs || {}) as DeploymentLogsDto
  },

  async startLocalDeployment(projectId: string, archiveFile: File) {
    if (!hasApiBase()) {
      await delay(800)
      // Fake a new deployment and attach logs
      const newId = `dpl_${Math.floor(Math.random() * 100000)}`
      const now = new Date().toISOString()
      const dep: DeploymentDto = {
        _id: newId,
        projectId,
        organizationId: mockProjects.find((p) => p._id === projectId)?.organizationId || "",
        userId: mockProjects.find((p) => p._id === projectId)?.userId || "",
        status: "compiling",
        createdAt: now,
        updatedAt: now,
      }
      if (!mockDeploymentsByProject[projectId]) mockDeploymentsByProject[projectId] = []
      mockDeploymentsByProject[projectId].unshift(dep)
      return { deploymentId: newId }
    }
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
    if (!hasApiBase()) {
      await delay(200)
      // update mock
      const all = Object.values(mockDeploymentsByProject).flat()
      const dep = all.find((d) => d._id === deploymentId)
      if (dep) dep.status = "stopped"
      return { message: "Stopped" }
    }
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}/stop`, { method: "POST" })
    if (!res.ok) throw new Error(`Failed to stop deployment: ${res.status}`)
    return await res.json()
  },

  async archiveDeployment(deploymentId: string) {
    if (!hasApiBase()) {
      await delay(200)
      const all = Object.values(mockDeploymentsByProject).flat()
      const dep = all.find((d) => d._id === deploymentId)
      if (dep) dep.status = "archived"
      return { message: "Archived" }
    }
    const res = await fetch(`${API_BASE}/api/deployments/${deploymentId}`, { method: "DELETE" })
    if (!res.ok) throw new Error(`Failed to archive deployment: ${res.status}`)
    return await res.json()
  },

  getOrCreateConsoleProject: async (userId: string): Promise<BotProject> => {
    return fetch(`/api/bot-project/console?userId=${userId}`).then((res) => res.json())
  },
}
