"use client"

import {
  type IProject,
  type IOrganization,
  type IProjectMember,
  type EffectivePermissions,
  type ProjectRole,
  type Permission,
  type PermissionScope,
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

// --- Workers (trigger via core /workers/trigger API) ----------------------

export type WorkerCatalogEntry = {
  workerId: string
  group: string
  inputSchema?: Record<string, unknown>
  functionName?: string
  deployed: boolean
}

export type QueueCatalogStep = {
  workerId: string
  delaySeconds?: number
  requiresApproval?: boolean
  /** HITL reviewer form title (from defineHitlConfig.ui.title), when the step requires approval. */
  hitlTitle?: string
  /** HITL reviewer input JSON Schema (zod → JSON Schema at build time); present once the CLI exposes it. */
  hitlInputSchema?: Record<string, unknown>
}

export type QueueCatalogEntry = { id: string; steps?: QueueCatalogStep[]; schedule?: unknown }

export type WorkerCatalog = {
  agentConfigured: boolean
  keySource: "env" | "derived" | "none"
  configReachable: boolean
  workers: WorkerCatalogEntry[]
  queues: QueueCatalogEntry[]
}

export type WorkerTriggerInput = {
  projectId: string
  workerId: string
  input?: Record<string, unknown>
  rawBody?: Record<string, unknown>
  jobId?: string
  webhookUrl?: string
  metadata?: Record<string, unknown>
  keyOverride?: string
  keyHeaderName?: string
  extraHeaders?: Record<string, string>
  queryParams?: Record<string, string>
}

export type WorkerTriggerResult = {
  ok: boolean
  status: number
  jobId: string
  workerId: string
  keySource: "manual" | "env" | "derived" | "none"
  functionName: string | null
  region: string | null
  response: unknown
}

export type WorkerLogEvent = {
  id?: string
  timestamp: number
  message: string
  ingestionTime?: number
}

export type WorkerJobStatus = "queued" | "running" | "completed" | "failed" | "unknown"

export type WorkerJobNode = {
  jobId: string
  workerId: string
  status: WorkerJobStatus
  output?: unknown
  error?: unknown
  input?: unknown
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  completedAt?: string
  found: boolean
  /** How the parent spawned this child: true = dispatchWorker await:true (parent blocked),
   *  false = fire-and-forget. undefined = root, or pre-dating the runtime flag. */
  awaited?: boolean
  /** Per-message SQS delay the parent set on a fire-and-forget dispatch, if any. */
  delaySeconds?: number
  /** Queue HITL: this step is parked awaiting a human approve/reject decision. */
  awaitingApproval?: boolean
  /** Queue HITL: ISO time the step parked for approval — start of the human-wait window (timeline). */
  awaitingSince?: string
  /** Queue HITL: UI spec (title/sections) for the reviewer, when awaiting. */
  hitlUi?: unknown
  /** Queue HITL targeting: the queue run id, queue id, and the queue-definition step index. */
  queueJobId?: string
  queueId?: string
  queueStepIndex?: number
  children: WorkerJobNode[]
}

export type WorkerJobResult =
  | { available: true; storeType: "upstash-redis" | "mongodb"; root: WorkerJobNode }
  | { available: false; reason: string; message: string }

export type QueueTriggerInput = {
  projectId: string
  queueId: string
  input?: Record<string, unknown>
  jobId?: string
  metadata?: Record<string, unknown>
  keyOverride?: string
  keyHeaderName?: string
  extraHeaders?: Record<string, string>
  queryParams?: Record<string, string>
}

export type QueueTriggerResult = {
  ok: boolean
  status: number
  queueJobId: string
  queueId: string
  keySource: "manual" | "env" | "derived" | "none"
  functionName: string | null
  response: unknown
}

/** How a run was triggered — stamped at trigger time (metadata.__trigger) or derived from the
 * job store's internalJobs parent edges by the history route. */
export type RunTrigger = {
  type: "external" | "console" | "worker" | "queue" | "schedule"
  /** For type worker/queue: the dispatching parent run. */
  parentJobId?: string
  parentWorkerId?: string
  queueId?: string
  queueJobId?: string
  /** For type console: the console user who clicked Trigger. */
  userId?: string
  at?: string
  awaited?: boolean
}

export type HistoryRun = {
  kind: "worker" | "queue"
  jobId: string
  workerId: string
  group: string
  status: WorkerJobStatus | "awaiting_approval"
  startedAt?: string
  requestId?: string
  functionName?: string
  queueId?: string
  stepCount?: number
  /** Hierarchy: the run (in this window) that dispatched this one, if any. */
  parentJobId?: string
  parentWorkerId?: string
  awaited?: boolean
  /** Trigger provenance — set when the history route could read the job store. */
  trigger?: RunTrigger
}

export type WorkerHistory = {
  runs: HistoryRun[]
  rangeMinutes: number
  queueStoreAvailable: boolean
  /** True when hierarchy + trigger provenance were enriched from the job store. */
  enriched?: boolean
  scannedWorkers: number
  /** Pagination over the cached full list. */
  total?: number
  offset?: number
  pageSize?: number
  hasMore?: boolean
  nextOffset?: number | null
  /** Whether this page came from the server-side window cache (vs a fresh scan). */
  fromCache?: boolean
  cachedAt?: number
}

export type UsageFn = {
  name: string
  beautifiedName: string
  group: string
  region: string
  memoryMb: number
  arch: "x86_64" | "arm64"
  invocations: number
  errors: number
  gbSeconds: number
  avgDurationMs: number
  maxConcurrent: number
  estCostUsd: number
}

export type UsageResult = {
  estimated: boolean
  startTime: number
  endTime: number
  period: number
  totals: { invocations: number; errors: number; gbSeconds: number; estCostUsd: number }
  byFunction: UsageFn[]
  byGroup: { group: string; invocations: number; errors: number; gbSeconds: number; estCostUsd: number; functions: number }[]
  timeline: { timestamp: number; invocations: number; gbSeconds: number; estCostUsd: number }[]
  pricing: { requestUsdPerMillion: number; gbSecondUsdX86: number; gbSecondUsdArm: number; note: string }
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
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const err = new Error(body.error || `Failed to fetch project`) as Error & {
        status?: number
        reason?: string
      }
      err.status = res.status
      err.reason = body.reason // 'suspended' | 'expired' | 'no_permission' | 'no_access'
      throw err
    }
    return (await res.json()) as ProjectDto
  },

  /** Organizations shared with the current user (member, not owner). */
  async listSharedOrganizations() {
    const res = await cicdFetch(`${API_BASE}/api/organizations/shared/me`)
    if (!res.ok) {
      if (res.status === 404) return [] as OrganizationDto[]
      throw new Error(`Failed to list shared organizations: ${res.status}`)
    }
    const data = await res.json()
    return (data.items ?? []) as OrganizationDto[]
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

  /** Worker catalog (ids + input JSON schemas) for a project. Goes through Foxhub so the
   * worker-endpoint key stays server-side (workers have no public per-worker gateway). */
  async getWorkersCatalog(projectId: string): Promise<WorkerCatalog> {
    const url = new URL(`/api/console/workers/catalog`, window.location.origin)
    url.searchParams.set("projectId", projectId)
    const res = await fetch(url.toString(), { cache: "no-store" })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to load workers`)
    return (await res.json()) as WorkerCatalog
  },

  /** Raw passthrough of the core `GET /workers/config` response (inspection escape hatch). */
  async getWorkersConfigRaw(projectId: string): Promise<{
    url: string
    status: number
    ok: boolean
    keySource: "env" | "derived" | "none"
    config: unknown
  }> {
    const url = new URL(`/api/console/workers/config`, window.location.origin)
    url.searchParams.set("projectId", projectId)
    const res = await fetch(url.toString(), { cache: "no-store" })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to load /workers/config`)
    return await res.json()
  },

  /** Trigger a worker via the project's core /workers/trigger Lambda. */
  async triggerWorker(input: WorkerTriggerInput): Promise<WorkerTriggerResult> {
    const res = await fetch(`/api/console/workers/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 || res.status === 403 || res.status === 400 || res.status === 409) {
      throw new Error(data.error || `Failed to trigger worker (${res.status})`)
    }
    return data as WorkerTriggerResult
  },

  /** Fetch a Lambda's CloudWatch logs. `target:'trigger'` returns the workers/trigger Lambda's
   * logs; otherwise the worker Lambda (by workerId or functionName), optionally filtered by jobId. */
  async getWorkerLogs(input: {
    projectId: string
    workerId?: string
    functionName?: string
    target?: "worker" | "trigger" | "queue"
    queueId?: string
    jobId?: string
    rangeMinutes?: number
    startTime?: number
    endTime?: number
    filterPattern?: string
  }): Promise<{ functionName: string; events: WorkerLogEvent[] }> {
    const res = await fetch(`/api/console/workers/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to fetch worker logs`)
    return (await res.json()) as { functionName: string; events: WorkerLogEvent[] }
  },

  /** Read the worker run's status + final output from the job store, with the dispatchWorker tree. */
  async getWorkerJob(input: {
    projectId: string
    jobId: string
    workerId?: string
  }): Promise<WorkerJobResult> {
    const res = await fetch(`/api/console/workers/job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to read worker job`)
    return (await res.json()) as WorkerJobResult
  },

  /** Start a queue via the core /queues/{id}/start Lambda. */
  async triggerQueue(input: QueueTriggerInput): Promise<QueueTriggerResult> {
    const res = await fetch(`/api/console/workers/queue-trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = (await res.json().catch(() => null)) as (QueueTriggerResult & { error?: string }) | null
    if (res.status === 401 || res.status === 403 || res.status === 400 || res.status === 409) {
      throw new Error(data?.error || `Failed to trigger queue (${res.status})`)
    }
    // A well-formed failure (e.g. 502 with the upstream body + queueJobId) is returned so the run
    // view can SHOW the upstream error. But a hard failure with no structured result (an unexpected
    // 500 / non-JSON body) must throw a clean message — returning a malformed object here would mount
    // the run view with an undefined jobId and confuse the poll loop.
    if (!data || typeof data !== "object" || typeof data.queueJobId !== "string") {
      throw new Error(
        data?.error ||
          `Failed to start queue (${res.status}). The queue-starter Lambda returned no run id — check its CloudWatch logs.`,
      )
    }
    return data as QueueTriggerResult
  },

  /** Read a queue run (synthesized as a step chain) — same shape as getWorkerJob. */
  async getQueueJob(input: { projectId: string; queueJobId: string }): Promise<WorkerJobResult> {
    const res = await fetch(`/api/console/workers/queue-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to read queue job`)
    return (await res.json()) as WorkerJobResult
  },

  /** Approve or reject a queue step parked at awaiting_approval (HITL). Server validates + re-dispatches. */
  async queueApprove(input: {
    projectId: string
    queueJobId: string
    stepIndex?: number
    decision: "approve" | "reject"
    input?: Record<string, unknown>
    comment?: string
  }): Promise<{
    ok: boolean
    decision: "approve" | "reject"
    queueJobId: string
    stepIndex: number
    workerId: string
    status: "running" | "failed"
    validated?: boolean
    response?: unknown
  }> {
    const res = await fetch(`/api/console/workers/queue-approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Failed to ${input.decision} queue step`)
    return data
  },

  /** Per-function/group/project Lambda usage + estimated cost over an interval (Usage page). */
  async getUsage(input: {
    projectId: string
    rangeHours?: number
    startTime?: number
    endTime?: number
  }): Promise<UsageResult> {
    const res = await fetch(`/api/console/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to load usage`)
    return (await res.json()) as UsageResult
  },

  /** Index of recent worker + queue runs (CloudWatch markers + queue store) for the History page. */
  async getWorkersHistory(input: {
    projectId: string
    rangeMinutes?: number
    workerId?: string
    group?: string
    kind?: "all" | "worker" | "queue"
    limit?: number
    /** Pagination: page offset + size (the server slices a cached full list). */
    offset?: number
    pageSize?: number
    /** Force a fresh scan, bypassing the server window cache (the Refresh button). */
    refresh?: boolean
  }): Promise<WorkerHistory> {
    const url = new URL(`/api/console/workers/history`, window.location.origin)
    url.searchParams.set("projectId", input.projectId)
    if (input.rangeMinutes != null) url.searchParams.set("rangeMinutes", String(input.rangeMinutes))
    if (input.workerId) url.searchParams.set("workerId", input.workerId)
    if (input.group) url.searchParams.set("group", input.group)
    if (input.kind) url.searchParams.set("kind", input.kind)
    if (input.limit != null) url.searchParams.set("limit", String(input.limit))
    if (input.offset != null) url.searchParams.set("offset", String(input.offset))
    if (input.pageSize != null) url.searchParams.set("pageSize", String(input.pageSize))
    if (input.refresh) url.searchParams.set("refresh", "1")
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to load run history`)
    return (await res.json()) as WorkerHistory
  },

  // --- Project sharing / members ------------------------------------------

  /** Projects shared with the current user (not owned by them). */
  async listSharedProjects() {
    const res = await cicdFetch(`${API_BASE}/api/projects/shared/me`)
    if (!res.ok) {
      if (res.status === 404) return [] as ProjectDto[]
      throw new Error(`Failed to list shared projects: ${res.status}`)
    }
    const data = await res.json()
    return (data.items ?? []) as ProjectDto[]
  },

  /** The caller's effective role + permissions on a project (drives UI gating). */
  async getMyPermissions(projectId: string): Promise<EffectivePermissions> {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}/permissions/me`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to resolve permissions`)
    return (await res.json()) as EffectivePermissions
  },

  /** List members of a project (requires members.view). cicd resolves emails from its directory. */
  async listMembers(projectId: string): Promise<{
    ownerId: string
    ownerEmail?: string
    ownerName?: string
    currentUserId?: string
    members: IProjectMember[]
  }> {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}/members`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to list members`)
    return (await res.json()) as {
      ownerId: string
      ownerEmail?: string
      ownerName?: string
      currentUserId?: string
      members: IProjectMember[]
    }
  },

  /** Share the project with an existing ORGANIZATION member (requires members.manage). */
  async addMember(
    projectId: string,
    input: {
      userId: string
      email?: string
      name?: string
      role: ProjectRole
      permissions?: Permission[]
      deniedPermissions?: Permission[]
      scope?: PermissionScope
      expiresAt?: string
    },
  ): Promise<{ ok: boolean; members: IProjectMember[] }> {
    const res = await cicdFetch(`${API_BASE}/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to add member`)
    return await res.json()
  },

  /** Update a member's role/permissions/scope/status (requires members.manage). */
  async updateMember(
    projectId: string,
    memberId: string,
    updates: {
      role?: ProjectRole
      permissions?: Permission[]
      deniedPermissions?: Permission[]
      scope?: PermissionScope
      status?: "active" | "suspended"
      expiresAt?: string | null
      name?: string
    },
  ): Promise<{ ok: boolean; members: IProjectMember[] }> {
    const res = await cicdFetch(
      `${API_BASE}/api/projects/${projectId}/members/${encodeURIComponent(memberId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      },
    )
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to update member`)
    return await res.json()
  },

  /** Remove a member by userId or email (requires members.manage). */
  async removeMember(projectId: string, memberId: string): Promise<{ ok: boolean; members: IProjectMember[] }> {
    const res = await cicdFetch(
      `${API_BASE}/api/projects/${projectId}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
    )
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to remove member`)
    return await res.json()
  },

  // --- Organization members (the roster you can share projects with) -------

  /** List organization members (owner or member). cicd resolves emails from its directory. */
  async listOrgMembers(organizationId: string): Promise<{
    ownerId: string
    ownerEmail?: string
    ownerName?: string
    currentUserId?: string
    members: { userId: string; email?: string; name?: string }[]
  }> {
    const res = await cicdFetch(`${API_BASE}/api/organizations/${organizationId}/members`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to list organization members`)
    return await res.json()
  },

  /** Add an org member BY EMAIL (owner only). Goes through Foxhub to resolve email → userId. */
  async addOrgMember(organizationId: string, email: string): Promise<{
    ownerId: string
    members: { userId: string; email?: string; name?: string }[]
  }> {
    const res = await fetch(`/api/console/org-members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, email }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to add organization member`)
    return await res.json()
  },

  /** Remove an org member (owner only). Cascades: also removes them from the org's projects. */
  async removeOrgMember(organizationId: string, userId: string): Promise<{
    ownerId: string
    members: { userId: string; email?: string; name?: string }[]
  }> {
    const res = await cicdFetch(
      `${API_BASE}/api/organizations/${organizationId}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    )
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed to remove organization member`)
    return await res.json()
  },
}
