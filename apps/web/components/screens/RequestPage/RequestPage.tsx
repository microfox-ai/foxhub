"use client";
import { useUser } from "@/utils/hooks/useUser";
import { useState } from "react";
import ChatWindow from "../Chat/ChatWindow";
import Sidebar from "../global/Sidebar";
import PreviewWindow from "../PreviewWindow/PreviewWindow";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskInstanceMetaProvider } from "../providers/TaskInstanceMetaProvider";
import { useLayout } from "../providers/LayoutProvider";
import { ApiDocProvider } from "../providers/ApiDocProvider";
import { useClientProject } from "../providers/ClientProjectProvider";

export const RequestPage = () => {
  const [tab, setTab] = useState("requests");
  const { user } = useUser();
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

  const {
    selectedProject,
    selectedRequest,
    isLoading,
    setSelectedRequest,
    createNewEmptyRequest,
    clientRequestId,
  } = useClientProject();

  if (!user || isLoading) {
    return (
      <div className="flex h-screen flex-col items-center overflow-hidden justify-center">
        <Loader2 className="w-full h-6 animate-spin" />
      </div>
    );
  }

  return (
    <ClientSecretProvider botProjectId={selectedProject?.id}>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="request-page"
        className="!h-screen"
      >
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={16}
          minSize={16}
          maxSize={16}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => handleLeftCollapse(true)}
          onExpand={() => handleLeftCollapse(false)}
          className={cn(
            isLeftTransitioning && "transition-all duration-100 linear"
          )}
        >
          <div className="flex h-full flex-col">
            <Sidebar
              selectedProject={selectedProject}
              onSelectRequest={setSelectedRequest}
              onNewRequest={createNewEmptyRequest}
              onOpenConfig={(project: any) => {}}
              isCollapsed={isLeftCollapsed}
              onCollapse={handleLeftCollapse}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle
          className="cursor-pointer hidden"
          onClick={handleLeftResizeHandleClick}
        />
        <TaskInstanceMetaProvider clientRequestId={clientRequestId!}>
          <ApiDocProvider>
            <ResizablePanel defaultSize={84}>
              <div className="h-full">
                <ChatWindow
                  userId={user.id}
                  onCollapse={handleLeftCollapse}
                  isCollapsed={isLeftCollapsed}
                  isLoading={isLoading}
                  clientRequest={selectedRequest}
                  projectTitle={selectedProject?.name}
                />
              </div>
            </ResizablePanel>
            {!isRightCollapsed && (
              <ResizableHandle
                className="cursor-pointer w-[2px] ml-2 opacity-0 hover:opacity-100 transition-opacity duration-300"
                onClick={handleRightResizeHandleClick}
              />
            )}
            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={0}
              minSize={30}
              maxSize={50}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => handleRightCollapse(true)}
              className={cn(
                isRightTransitioning && "transition-all  duration-200 linear"
              )}
            >
              <div className="h-full py-4 px-2">
                <div className="h-full bg-zinc-100 rounded-xl relative border border-zinc-200 overflow-hidden">
                  <PreviewWindow />
                </div>
              </div>
            </ResizablePanel>
          </ApiDocProvider>
        </TaskInstanceMetaProvider>
      </ResizablePanelGroup>
    </ClientSecretProvider>
  );
};

