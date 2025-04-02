"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { REQUESTSTATUS } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import ChatWindow from "../Chat/ChatWindow";
import Sidebar from "../global/Sidebar";
import PreviewWindow from "../PreviewWindow/PreviewWindow";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { analytics } from "@/utils/services/analytics/client";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import * as ResizablePrimitive from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import {
  PanelLeftIcon,
  PanelRightIcon,
  PlusCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const RequestPage = () => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  const [isLeftTransitioning, setIsLeftTransitioning] = useState(false);
  const [isRightTransitioning, setIsRightTransitioning] = useState(false);
  const leftPanelRef = useRef<ResizablePrimitive.ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ResizablePrimitive.ImperativePanelHandle>(null);
  const { user } = useUser();
  const router = useRouter();

  const [tab, setTab] = useState("requests");
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    user?.id ? `/api/bot-project?userId=${user?.id}` : null,
    async (url) => await fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
      const request = project?.clientRequests.find(
        (r: any) => r.id === requestParamId
      );
      setSelectedRequest(request);
    }
  }, [projectParamId, requestParamId, projects]);

  const createNewEmptyRequest = async () => {
    if (!user || !selectedProject) {
      toast.error("User or project not found");
      return;
    }
    const newRequest = await PortalSdk.postData(
      `/api/client-requests/create-empty`,
      {
        userId: user.id,
        botProjectId: selectedProject.id,
      }
    );

    // Track client request creation
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

  const handleLeftCollapse = (collapsed: boolean) => {
    setIsLeftTransitioning(true);
    if (leftPanelRef.current) {
      if (collapsed) {
        leftPanelRef.current.collapse();
      } else {
        leftPanelRef.current.expand();
      }
    }
    setIsLeftCollapsed(collapsed);
    // Remove transition after animation completes
    setTimeout(() => setIsLeftTransitioning(false), 300);
  };

  const handleRightCollapse = (collapsed: boolean) => {
    setIsRightTransitioning(true);
    if (rightPanelRef.current) {
      if (collapsed) {
        rightPanelRef.current.collapse();
      } else {
        rightPanelRef.current.expand();
      }
    }
    setIsRightCollapsed(collapsed);
    // Remove transition after animation completes
    setTimeout(() => setIsRightTransitioning(false), 300);
  };

  const handleLeftResizeHandleClick = () => {
    handleLeftCollapse(!isLeftCollapsed);
  };

  const handleRightResizeHandleClick = () => {
    handleRightCollapse(!isRightCollapsed);
  };

  if (!user || !selectedProject || !selectedRequest || isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <Skeleton
          variant="rectangular"
          className="w-[200px] rounded-full"
          height={20}
        />
      </div>
    );
  }

  console.log(selectedProject, "selectedProject");

  return (
    <ClientSecretProvider botProjectId={selectedProject?.id} userId={user?.id}>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="request-page"
        className="!h-screen"
      >
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={16}
          minSize={4}
          maxSize={16}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => setIsLeftCollapsed(true)}
          onExpand={() => setIsLeftCollapsed(false)}
          className={cn(
            isLeftTransitioning && "transition-all duration-300 ease-in-out"
          )}
        >
          <div className="flex h-full flex-col">
            <Sidebar
              selectedProject={selectedProject}
              onSelectRequest={(request) => {
                setSelectedRequest(request);
                router.push(
                  `/project/${selectedProject?.id}/request/${request?.id}`
                );
              }}
              onNewRequest={(project) => {
                const openRequests = project?.clientRequests?.filter(
                  (request) =>
                    request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
                    request?.requestStatus !== REQUESTSTATUS.CLOSED
                );
                if (openRequests?.length < 5) {
                  createNewEmptyRequest();
                } else {
                  toast.warning(
                    "At the moment we only support 3 concurrent requests. You can create new requests once your open requests are resolved."
                  );
                }
              }}
              onOpenConfig={(project: any) => {}}
              isCollapsed={isLeftCollapsed}
              onCollapse={handleLeftCollapse}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle
          className="cursor-pointer"
          onClick={handleLeftResizeHandleClick}
        />
        <ResizablePanel>
          <div className="h-full">
            <ChatWindow
              onCollapse={handleLeftCollapse}
              isCollapsed={isLeftCollapsed}
              userId={user.id}
              clientRequest={selectedRequest}
              projectTitle={selectedProject?.name}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-300"
          onClick={handleRightResizeHandleClick}
        />
        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={30}
          minSize={0}
          maxSize={30}
          collapsible={true}
          collapsedSize={0}
          onCollapse={() => setIsRightCollapsed(true)}
          onExpand={() => setIsRightCollapsed(false)}
          className={cn(
            isRightTransitioning && "transition-all  duration-300 ease-in-out"
          )}
        >
          <div className="h-full py-4 px-2  ">
            <div className="h-full bg-zinc-100 rounded-xl">
              <PreviewWindow />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </ClientSecretProvider>
  );
};
