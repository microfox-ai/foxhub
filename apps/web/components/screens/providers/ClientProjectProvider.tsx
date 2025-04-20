"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/utils/hooks/useUser";
import useSWR from "swr";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { analytics } from "@/utils/services/analytics/client";
import { REQUESTSTATUS } from "@prisma/client";
import { IN_DEV } from "@/utils/constants/appInfo";

interface ClientProjectContextType {
  clientRequestId: string | null;
  projectId: string | null;
  selectedProject: any;
  selectedRequest: any;
  projects: any[];
  isLoading: boolean;
  createNewEmptyRequest: () => Promise<void>;
  setSelectedProject: (project: any) => void;
  setSelectedRequest: (request: any) => void;
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
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const { user } = useUser();
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
    } else {
      const personalSpace = projects.find(
        (p: any) => p.name === "Personal Space"
      );
      if (personalSpace) {
        setSelectedProject(personalSpace);
      }
    }
  }, [projectParamId, requestParamId, projects]);

  const createNewEmptyRequest = async () => {
    if (!user || !selectedProject) {
      toast.error("User or project not found");
      return;
    }

    const openRequests = selectedProject?.clientRequests?.filter(
      (request: any) =>
        request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
        request?.requestStatus !== REQUESTSTATUS.CLOSED
    );

    if (openRequests?.length >= 5 && !IN_DEV) {
      toast.warning(
        "At the moment we only support 5 concurrent requests. You can create new requests once your open requests are resolved."
      );
      return;
    }

    const newRequest = await PortalSdk.postData(
      `/api/client-requests/create-empty`,
      {
        userId: user.id,
        botProjectId: selectedProject.id,
      }
    );

    analytics.track("Client Request Created From Request Page", {
      userId: user.id,
      requestId: newRequest.id,
      botProjectId: selectedProject.id,
      title: newRequest.title,
      timestamp: new Date().toISOString(),
    });

    setSelectedRequest(newRequest);
    router.push(`/project/${selectedProject.id}/request/${newRequest.id}`);
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
  };

  return (
    <ClientProjectContext.Provider value={value}>
      {children}
    </ClientProjectContext.Provider>
  );
}
