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
import { BotProject, REQUESTSTATUS } from "@prisma/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { IN_DEV } from "@/utils/constants/appInfo";
import { ClientRequest } from "@prisma/client";
import { MinionFlow } from "../hooks/convertors";

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}
interface ClientProjectContextType {
  clientRequestId: string | null;
  projectId: string | null;
  selectedProject: BotProjectWithRequests | null;
  selectedRequest: ClientRequest | null;
  projects: BotProjectWithRequests[] | any[];
  isLoading: boolean;
  createNewEmptyRequest: () => Promise<void>;
  setSelectedProject: (project: BotProjectWithRequests | any) => void;
  setSelectedRequest: Dispatch<SetStateAction<ClientRequest | null>>;
  selectedProjectClientRequests: ClientRequest[];
  selectedProjectClientRequestsLoading: boolean;
}

const ClientProjectContext = createContext<
  ClientProjectContextType | undefined
>(undefined);

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
  const [selectedProject, setSelectedProject] = useState<BotProjectWithRequests | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const { user } = useAuth();
  const router = useRouter();

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
  } = useSWR(
    user?.id ? `/api/bot-project?userId=${user?.id}` : null,
    async (url) => await fetch(url).then((res) => res.json())
  );

  const {
    data: selectedProjectClientRequests = [],
    error: selectedProjectClientRequestsError,
    isLoading: selectedProjectClientRequestsLoading,
  } = useSWR(
    selectedProject?.id ? `/api/client-requests?botProjectId=${selectedProject?.id}` : null,
    async (url) => await fetch(url).then((res) => res.json())
  );

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
    //else {
    // const personalSpace = projects.find(
    //   (p: any) => p.name === "Personal Space"
    // );
    // if (personalSpace) {
    //   setSelectedProject(personalSpace);
    // }
    //}
  }, [projectParamId, requestParamId, projects]);

  const createNewEmptyRequest = async () => {
    if (!user || !selectedProject) {
      toast.error("User or project not found");
      return;
    }

    const openRequests = (selectedProject as any)?.clientRequests?.filter(
      (request: any) =>
        request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
        request?.requestStatus !== REQUESTSTATUS.CLOSED
    );

    if (openRequests?.length >= 5 && !IN_DEV) {
      toast.warning(
        "At the moment we only support 5 concurrent requests. You can create new requests once we launch to production."
      );
      return;
    }

    await toast.promise(
      PortalSdk.postData(`/api/client-requests/create-empty`, {
        userId: user.id,
        botProjectId: selectedProject.id,
        MinionFlow: MinionFlow.BuildFlow
      }),
      {
        loading: "Creating new request...",
        success: (newRequest) => {
          analytics.track("Client Request Created From Request Page", {
            userId: user.id,
            requestId: newRequest.id,
            botProjectId: selectedProject.id,
            title: newRequest.title,
            timestamp: new Date().toISOString(),
          });

          setSelectedRequest(newRequest);
          router.push(`/project/${selectedProject.id}/request/${newRequest.id}`);
          return "Request created successfully!";
        },
        error: "Failed to create request. Please try again."
      }
    );
  };

  const value = {
    clientRequestId: requestParamId ?? null,
    projectId: projectParamId ?? null,
    selectedProject,
    selectedRequest,
    projects,
    isLoading,
    createNewEmptyRequest,
    setSelectedProject,
    setSelectedRequest,
    selectedProjectClientRequests: selectedProjectClientRequests?.data ?? [],
    selectedProjectClientRequestsLoading,
  };

  return (
    <ClientProjectContext.Provider value={value}>
      {children}
    </ClientProjectContext.Provider>
  );
}
