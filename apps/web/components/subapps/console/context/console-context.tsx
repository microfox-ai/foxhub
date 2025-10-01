"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import {
  consoleApi,
  type DeploymentDto,
  type DeploymentLogsDto,
  type BotProject,
  ProjectDto,
  OrganizationDto,
} from "@/components/subapps/console/lib/console-api";

type ConsoleState = {
  userId: string;
  organizations: OrganizationDto[];
  projects: ProjectDto[];
  consoleProject?: BotProject | null;
  selectedOrganizationId?: string;
  selectedProjectId?: string;
  currentDeploymentId?: string;
  currentDeployment?: DeploymentDto | null;
  currentLogs?: DeploymentLogsDto | null;
  deployments: DeploymentDto[];
  loadingOrganizations: boolean;
  loadingProjects: boolean;
  startingDeployment: boolean;
  loadingDeployment: boolean;
  loadingLogs: boolean;
  error?: string | null;
  autoRefresh: boolean;
};

type Action =
  | { type: "SET_USER"; userId: string }
  | { type: "SET_ORGANIZATIONS"; items: OrganizationDto[] }
  | { type: "SET_PROJECTS"; items: ProjectDto[] }
  | { type: "SET_SELECTED_ORG"; id?: string }
  | { type: "SET_SELECTED_PROJECT"; id?: string }
  | { type: "SET_CONSOLE_PROJECT"; project?: BotProject | null }
  | { type: "SET_CURRENT_DEPLOYMENT_ID"; id?: string }
  | { type: "SET_CURRENT_DEPLOYMENT"; deployment?: DeploymentDto | null }
  | { type: "SET_LOGS"; logs?: DeploymentLogsDto | null }
  | {
      type: "SET_LOADING";
      key: keyof Pick<
        ConsoleState,
        | "loadingOrganizations"
        | "loadingProjects"
        | "startingDeployment"
        | "loadingDeployment"
        | "loadingLogs"
      >;
      value: boolean;
    }
  | { type: "SET_ERROR"; error?: string | null }
  | { type: "SET_AUTO_REFRESH"; value: boolean }
  | { type: "SET_DEPLOYMENTS"; items: DeploymentDto[] };

const initialState: ConsoleState = {
  userId: "",
  organizations: [],
  projects: [],
  loadingOrganizations: false,
  loadingProjects: false,
  startingDeployment: false,
  loadingDeployment: false,
  loadingLogs: false,
  error: null,
  autoRefresh: true,
  deployments: [],
};

function reducer(state: ConsoleState, action: Action): ConsoleState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, userId: action.userId };
    case "SET_ORGANIZATIONS":
      return { ...state, organizations: action.items };
    case "SET_PROJECTS":
      return { ...state, projects: action.items };
    case "SET_SELECTED_ORG":
      return {
        ...state,
        selectedOrganizationId: action.id,
        selectedProjectId: undefined,
      };
    case "SET_SELECTED_PROJECT":
      return { ...state, selectedProjectId: action.id };
    case "SET_CONSOLE_PROJECT":
      return { ...state, consoleProject: action.project ?? null };
    case "SET_CURRENT_DEPLOYMENT_ID":
      return { ...state, currentDeploymentId: action.id };
    case "SET_CURRENT_DEPLOYMENT":
      return { ...state, currentDeployment: action.deployment ?? null };
    case "SET_LOGS":
      return { ...state, currentLogs: action.logs ?? null };
    case "SET_LOADING":
      return { ...state, [action.key]: action.value } as ConsoleState;
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_AUTO_REFRESH":
      return { ...state, autoRefresh: action.value };
    case "SET_DEPLOYMENTS":
      return { ...state, deployments: action.items };
    default:
      return state;
  }
}

type ConsoleContextType = {
  state: ConsoleState;
  loadOrganizations: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadConsoleProject: () => Promise<void>;
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
  selectOrganization: (id?: string) => void;
  selectProject: (id?: string) => void;
  startLocalDeployment: (archiveFile: File) => Promise<string | undefined>;
  refreshDeployment: (deploymentId?: string) => Promise<void>;
  refreshLogs: (deploymentId?: string) => Promise<void>;
  stopDeployment: (deploymentId?: string) => Promise<void>;
  archiveDeployment: (deploymentId?: string) => Promise<void>;
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
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    selectedOrganizationId: organizationId,
    selectedProjectId: projectId,
  });

  useEffect(() => {
    if (userId) dispatch({ type: "SET_USER", userId });
  }, [userId]);

  const loadConsoleProject = useCallback(async () => {
    if (!state.userId) return;
    try {
      const project = await consoleApi.getOrCreateConsoleProject(state.userId);
      dispatch({ type: "SET_CONSOLE_PROJECT", project });
    } catch (e: any) {
      dispatch({
        type: "SET_ERROR",
        error: e?.message || "Failed to load console project",
      });
    }
  }, [state.userId]);

  const loadOrganizations = useCallback(async () => {
    console.log("loadOrganizations", state?.userId);
    if (!state.userId) return;
    console.log("Attempting to load organizations for userId:", state.userId);
    dispatch({ type: "SET_LOADING", key: "loadingOrganizations", value: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const items = await consoleApi.listOrganizations(state.userId);
      console.log("Successfully fetched organizations:", items);
      dispatch({ type: "SET_ORGANIZATIONS", items });
      if (!state.selectedOrganizationId && items.length > 0) {
        dispatch({ type: "SET_SELECTED_ORG", id: items?.[0]?.id });
      }
    } catch (e: any) {
      console.error("Failed to load organizations:", e);
      dispatch({
        type: "SET_ERROR",
        error: e?.message || "Failed to load organizations",
      });
    } finally {
      dispatch({
        type: "SET_LOADING",
        key: "loadingOrganizations",
        value: false,
      });
    }
  }, [state.userId]);

  const loadProjects = useCallback(async () => {
    if (!state.userId || !state.selectedOrganizationId) return;
    console.log(
      "Attempting to load projects for organizationId:",
      state.selectedOrganizationId
    );
    dispatch({ type: "SET_LOADING", key: "loadingProjects", value: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const items = await consoleApi.listProjects({
        organizationId: state.selectedOrganizationId,
      });
      console.log("Successfully fetched projects:", items);
      dispatch({ type: "SET_PROJECTS", items });
      if (!state.selectedProjectId && items.length > 0) {
        dispatch({ type: "SET_SELECTED_PROJECT", id: items?.[0]?.id });
      }
    } catch (e: any) {
      console.error("Failed to load projects:", e);
      dispatch({
        type: "SET_ERROR",
        error: e?.message || "Failed to load projects",
      });
    } finally {
      dispatch({ type: "SET_LOADING", key: "loadingProjects", value: false });
    }
  }, [state.userId, state.selectedOrganizationId]);

  const selectOrganization = useCallback((id?: string) => {
    dispatch({ type: "SET_SELECTED_ORG", id });
  }, []);

  const selectProject = useCallback((id?: string) => {
    dispatch({ type: "SET_SELECTED_PROJECT", id });
  }, []);

  const loadProjectDeployments = useCallback(async () => {
    if (!state.selectedProjectId) return;
    try {
      const items = await consoleApi.listProjectDeployments(
        state.selectedProjectId
      );
      dispatch({ type: "SET_DEPLOYMENTS", items });
    } catch (e) {
      dispatch({ type: "SET_DEPLOYMENTS", items: [] });
    }
  }, [state.selectedProjectId]);

  const refreshDeployment = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId || state.currentDeploymentId;
      if (!id) return;
      dispatch({ type: "SET_LOADING", key: "loadingDeployment", value: true });
      dispatch({ type: "SET_ERROR", error: null });
      try {
        const dep = await consoleApi.getDeployment(id);
        dispatch({ type: "SET_CURRENT_DEPLOYMENT", deployment: dep });
      } catch (e: any) {
        dispatch({
          type: "SET_ERROR",
          error: e?.message || "Failed to load deployment",
        });
      } finally {
        dispatch({
          type: "SET_LOADING",
          key: "loadingDeployment",
          value: false,
        });
      }
    },
    [state.currentDeploymentId]
  );

  const refreshLogs = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId || state.currentDeploymentId;
      if (!id) return;
      dispatch({ type: "SET_LOADING", key: "loadingLogs", value: true });
      dispatch({ type: "SET_ERROR", error: null });
      try {
        if (deploymentId) {
          dispatch({ type: "SET_CURRENT_DEPLOYMENT_ID", id });
        }
        const logs = await consoleApi.getDeploymentLogs(id);
        dispatch({ type: "SET_LOGS", logs });
      } catch (e: any) {
        dispatch({
          type: "SET_ERROR",
          error: e?.message || "Failed to load logs",
        });
      } finally {
        dispatch({ type: "SET_LOADING", key: "loadingLogs", value: false });
      }
    },
    [state.currentDeploymentId]
  );

  const startLocalDeployment = useCallback(
    async (archiveFile: File) => {
      if (!state.selectedProjectId) {
        dispatch({ type: "SET_ERROR", error: "Select a project first" });
        return;
      }
      dispatch({ type: "SET_LOADING", key: "startingDeployment", value: true });
      dispatch({ type: "SET_ERROR", error: null });
      try {
        const { deploymentId } = await consoleApi.startLocalDeployment(
          state.selectedProjectId,
          archiveFile
        );
        dispatch({ type: "SET_CURRENT_DEPLOYMENT_ID", id: deploymentId });
        await refreshDeployment(deploymentId);
        await refreshLogs(deploymentId);
        await loadProjectDeployments();
        return deploymentId;
      } catch (e: any) {
        dispatch({
          type: "SET_ERROR",
          error: e?.message || "Failed to start deployment",
        });
      } finally {
        dispatch({
          type: "SET_LOADING",
          key: "startingDeployment",
          value: false,
        });
      }
    },
    [
      state.selectedProjectId,
      refreshDeployment,
      refreshLogs,
      loadProjectDeployments,
    ]
  );

  const stopDeployment = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId || state.currentDeploymentId;
      if (!id) return;
      await consoleApi.stopDeployment(id);
      await refreshDeployment(id);
      await loadProjectDeployments();
    },
    [state.currentDeploymentId, refreshDeployment, loadProjectDeployments]
  );

  const archiveDeployment = useCallback(
    async (deploymentId?: string) => {
      const id = deploymentId || state.currentDeploymentId;
      if (!id) return;
      await consoleApi.archiveDeployment(id);
      await refreshDeployment(id);
      await loadProjectDeployments();
    },
    [state.currentDeploymentId, refreshDeployment, loadProjectDeployments]
  );

  const setAutoRefresh = useCallback((value: boolean) => {
    dispatch({ type: "SET_AUTO_REFRESH", value });
  }, []);

  const createOrganization = useCallback(
    async (
      input: Omit<
        OrganizationDto,
        "id" | "createdAt" | "updatedAt" | "members"
      > & { members?: string[] }
    ) => {
      if (!state.userId) return;
      await consoleApi.createOrganization({
        ...input,
        ownerId: state.userId,
      });
      await loadOrganizations();
    },
    [state.userId, loadOrganizations]
  );

  const createProject = useCallback(
    async (
      input: Omit<
        ProjectDto,
        "id" | "createdAt" | "updatedAt" | "organizationId" | "ownerId"
      >
    ) => {
      if (!state.userId || !state.selectedOrganizationId) return;
      await consoleApi.createProject({
        ...input,
        organizationId: state.selectedOrganizationId,
        ownerId: state.userId,
      });
      await loadProjects();
    },
    [state.userId, state.selectedOrganizationId, loadProjects]
  );

  useEffect(() => {
    if (state.userId) {
      loadOrganizations();
    }
  }, [state.userId, loadOrganizations]);

  useEffect(() => {
    if (state.userId) {
      loadConsoleProject();
    }
  }, [state.userId, loadConsoleProject]);

  useEffect(() => {
    if (state.selectedOrganizationId) {
      loadProjects();
    }
  }, [state.selectedOrganizationId, loadProjects]);

  useEffect(() => {
    loadProjectDeployments();
  }, [state.selectedProjectId, loadProjectDeployments]);

  useEffect(() => {
    if (!state.autoRefresh || !state.currentDeploymentId) return;
    const interval = setInterval(() => {
      refreshDeployment();
      refreshLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [
    state.autoRefresh,
    state.currentDeploymentId,
    refreshDeployment,
    refreshLogs,
  ]);

  const value = useMemo<ConsoleContextType>(
    () => ({
      state,
      loadOrganizations,
      loadProjects,
      loadConsoleProject,
      createOrganization,
      createProject,
      loadProjectDeployments,
      selectOrganization,
      selectProject,
      startLocalDeployment,
      refreshDeployment,
      refreshLogs,
      stopDeployment,
      archiveDeployment,
      setAutoRefresh,
    }),
    [
      state,
      loadOrganizations,
      loadProjects,
      loadConsoleProject,
      createOrganization,
      createProject,
      loadProjectDeployments,
      selectOrganization,
      selectProject,
      startLocalDeployment,
      refreshDeployment,
      refreshLogs,
      stopDeployment,
      archiveDeployment,
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
