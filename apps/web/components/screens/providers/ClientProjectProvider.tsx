"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { analytics } from "@/utils/services/analytics/client";
import { BotProject, ClientDeployment, REQUESTSTATUS } from "@prisma/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { IN_DEV } from "@/utils/constants/appInfo";
import { ClientRequest } from "@prisma/client";
import { MinionFlow, MinionFlowType } from "../hooks/convertors";

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}

type ClientProjectContextType = ReturnType<typeof useClientProjectContext>;

const ClientProjectContext = createContext<
  ClientProjectContextType | undefined
>(undefined);

function useClientProjectContext() {
  const [selectedProject, setSelectedProject] =
    useState<BotProjectWithRequests | null>(null);
  const [selectedClientDeployment, setSelectedClientDeployment] =
    useState<ClientDeployment | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(
    null
  );
  const { user } = useAuth();
  const router = useRouter();

  const [submitAnnotations, setSubmitAnnotations] = useState<
    { type: "body"; key: string; value: any }[]
  >([]);
  const [autoSubmit, setAutoSubmit] = useState<string | null>(null);
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const {
    data: projects = [],
    error,
    isLoading,
  } = useSWR<BotProjectWithRequests[]>(
    user?.id ? `/api/bot-project?userId=${user?.id}` : null,
    async (url: string) => await fetch(url).then((res) => res.json())
  );

  const {
    data: selectedProjectClientRequests = [],
    error: selectedProjectClientRequestsError,
    isLoading: selectedProjectClientRequestsLoading,
  } = useSWR(
    selectedProject?.id
      ? `/api/client-requests?botProjectId=${selectedProject?.id}&includeTaskInstanceMeta=true&includeDeployedFunctions=true`
      : null,
    async (url: string) => await fetch(url).then((res) => res.json())
  );

  const updateClientDeploymentById = async (id: string) => {
    try {
      if (!id) {
        console.log("❌ No ID provided to getClientDeploymentById");
        return null;
      }

      console.log(`🔍 Fetching client deployment with ID: ${id}`);
      const response = await PortalSdk.getData(
        `/api/client-functions?id=${id}`,
        {}
      );
      console.log(`📊 Raw API response:`, response);

      // Handle different response structures
      if (
        response?.clientFunctions &&
        Array.isArray(response.clientFunctions)
      ) {
        const clientDeployment = response.clientFunctions[0];
        console.log(`✅ Found client deployment:`, clientDeployment);
        setSelectedClientDeployment(clientDeployment);
        return clientDeployment;
      } else if (Array.isArray(response)) {
        const clientDeployment = response[0];
        console.log(
          `✅ Found client deployment (array response):`,
          clientDeployment
        );
        setSelectedClientDeployment(clientDeployment);
        return clientDeployment;
      } else {
        console.log(`✅ Using direct response:`, response);
        setSelectedClientDeployment(response);
        return response;
      }
    } catch (error) {
      console.error("❌ Error fetching client deployment:", error);
      return null;
    }
  };

  useEffect(() => {
    if (selectedRequest?.id) {
      updateClientDeploymentById(selectedRequest.id);
    }
  }, [selectedRequest?.id]);

  useEffect(() => {
    if (projectParamId && projects) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      if (project) {
        setSelectedProject(project);
        const request = project?.clientRequests.find(
          (r: any) => r.id === requestParamId
        );
        if (
          request &&
          (!selectedRequest || request.id !== selectedRequest.id)
        ) {
          setSelectedRequest(request);
        }
      }
    }
  }, [projectParamId, requestParamId, projects]);

  const createNewEmptyRequest = async (
    flow?: MinionFlowType,
    annotations?: any[],
    _autoSubmit?: string
  ) => {
    if (!user || !selectedProject) {
      toast.error("User or project not found");
      return;
    }

    const openRequests = (selectedProject as any)?.clientRequests?.filter(
      (request: any) =>
        request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
        request?.requestStatus !== REQUESTSTATUS.CLOSED
    );

    if (openRequests?.length >= 5 && !IN_DEV && !user?.isBillingVerified) {
      toast.warning(
        "At the moment we only support 5 concurrent requests. You can create new requests once we launch to production."
      );
      return;
    }

    await toast.promise(
      PortalSdk.postData(`/api/client-requests/create-empty`, {
        userId: user.id,
        botProjectId: selectedProject.id,
        minionFlow: flow ?? MinionFlow.BuildFlow,
      }),
      {
        loading: "Starting new session...",
        success: (newRequest) => {
          analytics.track("Client Request Created From Request Page", {
            userId: user.id,
            requestId: newRequest.id,
            botProjectId: selectedProject.id,
            title: newRequest.title,
            timestamp: new Date().toISOString(),
          });

          setSubmitAnnotations(annotations ?? []);
          setAutoSubmit(_autoSubmit ?? null);
          setSelectedRequest(newRequest);
          router.push(
            `/project/${selectedProject.id}/request/${newRequest.id}`
          );
          return "Session created successfully!";
        },
        error: "Failed to create session. Please try again.",
      }
    );
  };

  return {
    clientRequestId: requestParamId ?? null,
    projectId: projectParamId ?? null,
    selectedClientDeployment,
    updateClientDeploymentById,
    selectedProject,
    selectedRequest,
    projects,
    isLoading,
    createNewEmptyRequest,
    setSelectedProject,
    setSelectedRequest,
    selectedProjectClientRequests: (selectedProjectClientRequests?.data ??
      []) as ClientRequest[],
    selectedProjectClientRequestsLoading,
    submitAnnotations,
    setSubmitAnnotations,
    autoSubmit,
    setAutoSubmit,
  };
}

export function useClientProject() {
  const context = useContext(ClientProjectContext);
  if (context === undefined) {
    throw new Error(
      "useClientProject must be used within a ClientProjectProvider"
    );
  }
  return context;
}

interface ClientProjectProviderProps {
  children: ReactNode;
}

export function ClientProjectProvider({
  children,
}: ClientProjectProviderProps) {
  const value = useClientProjectContext();
  return (
    <ClientProjectContext.Provider value={value}>
      {children}
    </ClientProjectContext.Provider>
  );
}
