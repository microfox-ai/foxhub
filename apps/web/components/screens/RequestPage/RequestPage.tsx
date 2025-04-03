"use client";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { REQUESTSTATUS } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { X, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskInstanceMetaProvider } from "../providers/TaskInstanceMetaProvider";
import { useLayout } from "../providers/LayoutProvider";

export const RequestPage = () => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [tab, setTab] = useState("requests");
  const { user } = useUser();
  const router = useRouter();
  const {
    isLeftCollapsed,
    isRightCollapsed,
    isLeftTransitioning,
    isRightTransitioning,
    leftPanelRef,
    rightPanelRef,
    handleLeftCollapse,
    handleRightCollapse,
    handleLeftResizeHandleClick,
    handleRightResizeHandleClick,
  } = useLayout();

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
          onCollapse={() => handleLeftCollapse(true)}
          onExpand={() => handleLeftCollapse(false)}
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
        <TaskInstanceMetaProvider clientRequestId={requestParamId!}>
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
            onCollapse={() => handleRightCollapse(true)}
            onExpand={() => handleRightCollapse(false)}
            className={cn(
              isRightTransitioning && "transition-all  duration-300 ease-in-out"
            )}
          >
            <div className="h-full py-4 px-2  ">
              <div className="h-full bg-zinc-100 rounded-xl relative">
                <div className="p-4 pb-2 flex gap-4 items-center">
                  <X
                    className="cursor-pointer h-4 w-4 text-gray-500 hover:text-gray-700"
                    onClick={() => handleRightCollapse(!isRightCollapsed)}
                  />
                  <div className="flex gap-2 items-center">
                    <p className="text-base font-medium">Preview</p>
                    <Monitor className="h-4 w-4 " />
                  </div>
                </div>
                <PreviewWindow />
              </div>
            </div>
          </ResizablePanel>
        </TaskInstanceMetaProvider>
      </ResizablePanelGroup>
    </ClientSecretProvider>
  );
};
