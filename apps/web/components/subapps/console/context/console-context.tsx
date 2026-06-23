"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import useSWR, { preload } from "swr";
import useSWRInfinite from "swr/infinite";
import {
  consoleApi,
  type DeploymentDto,
  type DeploymentLogsDto,
  type DeploymentLogCounts,
  ProjectDto,
  OrganizationDto,
} from "@/components/subapps/console/lib/console-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deployment statuses that may still change on their own — the only ones worth polling. */
const ACTIVE_STATUSES = new Set([
  "queued",
  "compiling",
  "deploying",
  "deployed",
  "post_deployment",
]);
const isActiveStatus = (status?: string | null) =>
  !!status && ACTIVE_STATUSES.has(status);

const POLL_MS = 4000;
const LOG_STEPS = ["compiling", "deploying", "post_deployment"] as const;
const DEPLOYMENTS_PAGE_SIZE = 20;

type DeploymentsPage = { items: DeploymentDto[]; page: number; limit: number };
type AccumulatedLogs = { logs: DeploymentLogsDto; counts: DeploymentLogCounts };

// SWR cache keys (stable, serializable).
const orgsKey = (userId?: string) =>
  userId ? (["console:orgs", userId] as const) : null;
const orgKey = (orgId?: string) =>
  orgId ? (["console:org", orgId] as const) : null;
const projectsKey = (orgId?: string) =>
  orgId ? (["console:projects", orgId] as const) : null;
const projectKey = (projectId?: string) =>
  projectId ? (["console:project", projectId] as const) : null;
const deploymentKey = (deploymentId?: string) =>
  deploymentId ? (["console:deployment", deploymentId] as const) : null;
const logsKey = (deploymentId?: string) =>
  deploymentId ? (["console:logs", deploymentId] as const) : null;

// ---------------------------------------------------------------------------
// Public state shape
// ---------------------------------------------------------------------------

type ConsoleState = {
  userId: string;
  /** Org list — only fetched on the console root page. */
  organizations: OrganizationDto[];
  /** Project list — only fetched on an org page. */
  projects: ProjectDto[];
  /** The single org in the URL (breadcrumb / scoping); fetched standalone. */
  currentOrganization?: OrganizationDto | null;
  /** The single project in the URL; fetched standalone (no full list needed). */
  currentProject?: ProjectDto | null;
  selectedOrganizationId?: string;
  selectedProjectId?: string;
  currentDeploymentId?: string;
  currentDeployment?: DeploymentDto | null;
  currentLogs?: DeploymentLogsDto | null;
  deployments: DeploymentDto[];
  hasMoreDeployments: boolean;
  loadingMoreDeployments: boolean;
  loadingOrganizations: boolean;
  loadingProjects: boolean;
  loadingCurrentProject: boolean;
  loadingDeployments: boolean;
  startingDeployment: boolean;
  loadingDeployment: boolean;
  loadingLogs: boolean;
  error?: string | null;
  autoRefresh: boolean;
};

type ConsoleContextType = {
  state: ConsoleState;
  loadOrganizations: () => Promise<void>;
  loadProjects: () => Promise<void>;
  createOrganization: (
    input: Omit<
      OrganizationDto,
      "id" | "createdAt" | "updatedAt" | "members"
    > & { members?: string[] }
  ) => Promise<void>;
  createProject: (
    input: Omit<
      ProjectDto,
      "id" | "createdAt" | "updatedAt" | "organizationId" | "ownerId"
    >
  ) => Promise<void>;
  loadProjectDeployments: () => Promise<void>;
  loadMoreDeployments: () => void;
  prefetchProjectDeployments: (projectId: string) => void;
  startLocalDeployment: (archiveFile: File) => Promise<string | undefined>;
  refreshDeployment: (deploymentId?: string) => Promise<void>;
  refreshLogs: (deploymentId?: string) => Promise<void>;
  stopDeployment: (deploymentId?: string) => Promise<void>;
  archiveDeployment: (deploymentId?: string) => Promise<void>;
  updateProject: (
    updates: Partial<Pick<ProjectDto, "agentName" | "subdomain">>,
    projectId?: string
  ) => Promise<void>;
  deleteProject: (projectId?: string) => Promise<void>;
  setAutoRefresh: (value: boolean) => void;
};

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

export function ConsoleProvider({
  userId,
  organizationId,
  projectId,
  children,
}: {
  userId: string;
  organizationId?: string;
  projectId?: string;
  children: React.ReactNode;
}) {
  // URL params are the single source of truth for scope; props seed the first render.
  const params = useParams();
  const urlOrg = (params?.organizationId as string | undefined) ?? organizationId;
  const urlProject = (params?.projectId as string | undefined) ?? projectId;

  // Page kind drives WHICH data we fetch — this is the perf fix: a project page
  // never fetches the full org/project lists, only the one project it shows.
  const onProjectPage = !!urlProject;
  const onOrgPage = !!urlOrg && !urlProject;
  const onRootPage = !urlOrg && !urlProject;

  const [currentDeploymentId, setCurrentDeploymentId] = useState<
    string | undefined
  >();
  const [startingDeployment, setStartingDeployment] = useState(false);
  const [autoRefresh, setAutoRefreshState] = useState(true);

  // ---- Lists (scoped to the page that needs them) -------------------------
  const orgs = useSWR(
    onRootPage ? orgsKey(userId) : null,
    ([, uid]) => consoleApi.listOrganizations(uid),
    { revalidateOnFocus: false }
  );
  const organizations = useMemo(() => orgs.data ?? [], [orgs.data]);

  const projects = useSWR(
    onOrgPage ? projectsKey(urlOrg) : null,
    ([, orgId]) => consoleApi.listProjects({ organizationId: orgId }),
    { revalidateOnFocus: false }
  );
  const projectList = useMemo(() => projects.data ?? [], [projects.data]);

  // ---- Single org / project for the active scope (cheap, breadcrumb-friendly)
  const currentOrgSwr = useSWR(
    orgKey(urlOrg),
    ([, id]) => consoleApi.getOrganization(id),
    { revalidateOnFocus: false }
  );
  const currentProjectSwr = useSWR(
    projectKey(urlProject),
    ([, id]) => consoleApi.getProject(id),
    { revalidateOnFocus: false }
  );

  // ---- Deployments list (paginated; poll while active) --------------------
  const getDeploymentsPageKey = useCallback(
    (index: number, prev: DeploymentsPage | null) => {
      if (!urlProject) return null;
      if (prev && prev.items.length < DEPLOYMENTS_PAGE_SIZE) return null;
      return ["console:deployments", urlProject, index, DEPLOYMENTS_PAGE_SIZE] as const;
    },
    [urlProject]
  );
  const deploymentsSwr = useSWRInfinite<DeploymentsPage>(
    getDeploymentsPageKey,
    ([, pid, index]) =>
      consoleApi.listProjectDeploymentsPage(pid as string, {
        page: (index as number) + 1,
        limit: DEPLOYMENTS_PAGE_SIZE,
      }),
    { revalidateOnFocus: false, revalidateFirstPage: true }
  );
  const deployments = useMemo(
    () => (deploymentsSwr.data ?? []).flatMap((p) => p.items),
    [deploymentsSwr.data]
  );
  const hasMoreDeployments = useMemo(() => {
    const pages = deploymentsSwr.data;
    if (!pages || pages.length === 0) return false;
    return (pages[pages.length - 1]?.items.length ?? 0) === DEPLOYMENTS_PAGE_SIZE;
  }, [deploymentsSwr.data]);
  const loadingMoreDeployments =
    deploymentsSwr.isValidating && (deploymentsSwr.data?.length ?? 0) > 0;
  const listHasActive = useMemo(
    () => deployments.some((d) => isActiveStatus(d.status)),
    [deployments]
  );
  useEffect(() => {
    deploymentsSwr.setSize(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProject]);
  useEffect(() => {
    if (!autoRefresh || !listHasActive || !urlProject) return;
    const t = setInterval(() => deploymentsSwr.mutate(), POLL_MS);
    return () => clearInterval(t);
  }, [autoRefresh, listHasActive, urlProject, deploymentsSwr]);
  const loadMoreDeployments = useCallback(() => {
    deploymentsSwr.setSize((s) => s + 1);
  }, [deploymentsSwr]);

  // ---- Current deployment detail -----------------------------------------
  const deploymentSwr = useSWR(
    deploymentKey(currentDeploymentId),
    ([, id]) => consoleApi.getDeployment(id),
    { revalidateOnFocus: false }
  );
  const currentDeployment = deploymentSwr.data ?? null;
  const currentActive = isActiveStatus(currentDeployment?.status);
  useEffect(() => {
    if (!autoRefresh || !currentActive || !currentDeploymentId) return;
    const t = setInterval(() => deploymentSwr.mutate(), POLL_MS);
    return () => clearInterval(t);
  }, [autoRefresh, currentActive, currentDeploymentId, deploymentSwr]);

  // ---- Incremental logs ---------------------------------------------------
  const accumRef = useRef<Map<string, AccumulatedLogs>>(new Map());
  const logsSwr = useSWR(
    logsKey(currentDeploymentId),
    async ([, id]) => {
      const prev = accumRef.current.get(id);
      const res = await consoleApi.getDeploymentLogs(id, prev?.counts);

      const serverShrank =
        prev && LOG_STEPS.some((s) => res.counts[s] < (prev.counts[s] ?? 0));
      if (serverShrank) {
        const full = await consoleApi.getDeploymentLogs(id);
        const fresh: AccumulatedLogs = { logs: full.logs, counts: full.counts };
        accumRef.current.set(id, fresh);
        return fresh.logs;
      }
      if (!prev) {
        const fresh: AccumulatedLogs = { logs: res.logs, counts: res.counts };
        accumRef.current.set(id, fresh);
        return fresh.logs;
      }
      let changed = false;
      const mergedLogs: DeploymentLogsDto = { ...prev.logs };
      for (const step of LOG_STEPS) {
        const delta = res.logs[step] ?? [];
        if (delta.length > 0) {
          mergedLogs[step] = [...(prev.logs[step] ?? []), ...delta];
          changed = true;
        }
      }
      const merged: AccumulatedLogs = {
        logs: changed ? mergedLogs : prev.logs,
        counts: res.counts,
      };
      accumRef.current.set(id, merged);
      return merged.logs;
    },
    { revalidateOnFocus: false }
  );
  const currentLogs = logsSwr.data ?? null;
  useEffect(() => {
    if (!autoRefresh || !currentActive || !currentDeploymentId) return;
    const t = setInterval(() => logsSwr.mutate(), POLL_MS);
    return () => clearInterval(t);
  }, [autoRefresh, currentActive, currentDeploymentId, logsSwr]);

  // ---- Imperative actions -------------------------------------------------
  const loadOrganizations = useCallback(async () => {
    await orgs.mutate();
  }, [orgs]);

  const loadProjects = useCallback(async () => {
    await projects.mutate();
  }, [projects]);

  const loadProjectDeployments = useCallback(async () => {
    await deploymentsSwr.mutate();
  }, [deploymentsSwr]);

  const prefetchProjectDeployments = useCallback((pid: string) => {
    if (!pid) return;
    preload(projectKey(pid)!, ([, id]) => consoleApi.getProject(id as string));
    preload(
      ["console:deployments", pid, 0, DEPLOYMENTS_PAGE_SIZE],
      ([, id]) =>
        consoleApi.listProjectDeploymentsPage(id as string, {
          page: 1,
          limit: DEPLOYMENTS_PAGE_SIZE,
        })
    );
  }, []);

  const refreshDeployment = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId ?? currentDeploymentId;
      if (!id) return;
      if (id !== currentDeploymentId) {
        setCurrentDeploymentId(id);
        return;
      }
      await deploymentSwr.mutate();
    },
    [currentDeploymentId, deploymentSwr]
  );

  const refreshLogs = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId ?? currentDeploymentId;
      if (!id) return;
      if (id !== currentDeploymentId) {
        setCurrentDeploymentId(id);
        return;
      }
      await logsSwr.mutate();
    },
    [currentDeploymentId, logsSwr]
  );

  const startLocalDeployment = useCallback(
    async (archiveFile: File) => {
      if (!urlProject) return;
      setStartingDeployment(true);
      try {
        const { deploymentId } = await consoleApi.startLocalDeployment(
          urlProject,
          archiveFile
        );
        setCurrentDeploymentId(deploymentId);
        await deploymentsSwr.mutate();
        return deploymentId;
      } finally {
        setStartingDeployment(false);
      }
    },
    [urlProject, deploymentsSwr]
  );

  const stopDeployment = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId ?? currentDeploymentId;
      if (!id) return;
      await consoleApi.stopDeployment(id);
      await Promise.all([deploymentSwr.mutate(), deploymentsSwr.mutate()]);
    },
    [currentDeploymentId, deploymentSwr, deploymentsSwr]
  );

  const archiveDeployment = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId ?? currentDeploymentId;
      if (!id) return;
      await consoleApi.archiveDeployment(id);
      await Promise.all([deploymentSwr.mutate(), deploymentsSwr.mutate()]);
    },
    [currentDeploymentId, deploymentSwr, deploymentsSwr]
  );

  const setAutoRefresh = useCallback((value: boolean) => {
    setAutoRefreshState(value);
  }, []);

  const createOrganization = useCallback(
    async (
      input: Omit<
        OrganizationDto,
        "id" | "createdAt" | "updatedAt" | "members"
      > & { members?: string[] }
    ) => {
      if (!userId) return;
      await consoleApi.createOrganization({ ...input, ownerId: userId });
      await orgs.mutate();
    },
    [userId, orgs]
  );

  const createProject = useCallback(
    async (
      input: Omit<
        ProjectDto,
        "id" | "createdAt" | "updatedAt" | "organizationId" | "ownerId"
      >
    ) => {
      if (!userId || !urlOrg) return;
      await consoleApi.createProject({
        ...input,
        organizationId: urlOrg,
        ownerId: userId,
      });
      await projects.mutate();
    },
    [userId, urlOrg, projects]
  );

  const updateProject = useCallback(
    async (
      updates: Partial<Pick<ProjectDto, "agentName" | "subdomain">>,
      pid?: string
    ) => {
      const id = pid ?? urlProject;
      if (!id) return;
      await consoleApi.updateProject(id, updates);
      await Promise.all([currentProjectSwr.mutate(), projects.mutate()]);
    },
    [urlProject, currentProjectSwr, projects]
  );

  const deleteProject = useCallback(
    async (pid?: string) => {
      const id = pid ?? urlProject;
      if (!id) return;
      await consoleApi.deleteProject(id);
      await projects.mutate();
    },
    [urlProject, projects]
  );

  const error =
    (orgs.error as Error | undefined)?.message ??
    (projects.error as Error | undefined)?.message ??
    (currentProjectSwr.error as Error | undefined)?.message ??
    (deploymentSwr.error as Error | undefined)?.message ??
    (logsSwr.error as Error | undefined)?.message ??
    null;

  const state: ConsoleState = useMemo(
    () => ({
      userId,
      organizations,
      projects: projectList,
      currentOrganization: currentOrgSwr.data ?? null,
      currentProject: currentProjectSwr.data ?? null,
      selectedOrganizationId: urlOrg,
      selectedProjectId: urlProject,
      currentDeploymentId,
      currentDeployment,
      currentLogs,
      deployments,
      hasMoreDeployments,
      loadingMoreDeployments,
      loadingOrganizations: orgs.isLoading,
      loadingProjects: projects.isLoading,
      loadingCurrentProject: currentProjectSwr.isLoading,
      loadingDeployments: deploymentsSwr.isLoading,
      startingDeployment,
      loadingDeployment: deploymentSwr.isLoading,
      loadingLogs: logsSwr.isLoading,
      error,
      autoRefresh,
    }),
    [
      userId,
      organizations,
      projectList,
      currentOrgSwr.data,
      currentProjectSwr.data,
      urlOrg,
      urlProject,
      currentDeploymentId,
      currentDeployment,
      currentLogs,
      deployments,
      hasMoreDeployments,
      loadingMoreDeployments,
      orgs.isLoading,
      projects.isLoading,
      currentProjectSwr.isLoading,
      deploymentsSwr.isLoading,
      startingDeployment,
      deploymentSwr.isLoading,
      logsSwr.isLoading,
      error,
      autoRefresh,
    ]
  );

  const value = useMemo<ConsoleContextType>(
    () => ({
      state,
      loadOrganizations,
      loadProjects,
      createOrganization,
      createProject,
      loadProjectDeployments,
      loadMoreDeployments,
      prefetchProjectDeployments,
      startLocalDeployment,
      refreshDeployment,
      refreshLogs,
      stopDeployment,
      archiveDeployment,
      updateProject,
      deleteProject,
      setAutoRefresh,
    }),
    [
      state,
      loadOrganizations,
      loadProjects,
      createOrganization,
      createProject,
      loadProjectDeployments,
      loadMoreDeployments,
      prefetchProjectDeployments,
      startLocalDeployment,
      refreshDeployment,
      refreshLogs,
      stopDeployment,
      archiveDeployment,
      updateProject,
      deleteProject,
      setAutoRefresh,
    ]
  );

  return (
    <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
  );
}

export function useConsole() {
  const ctx = useContext(ConsoleContext);
  if (!ctx) throw new Error("useConsole must be used within ConsoleProvider");
  return ctx;
}
