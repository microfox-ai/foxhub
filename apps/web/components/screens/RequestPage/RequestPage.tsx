"use client";

import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import ChatWindow from "../Chat/ChatWindow";
import PreviewWindow from "../PreviewWindow/PreviewWindow";
import { ApiDocProvider } from "../providers/ApiDocProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLayout } from "../providers/LayoutProvider";
import { TaskInstanceMetaProvider } from "../providers/TaskInstanceMetaProvider";
import { TabUiProvider } from "../providers/TabUiProvider";

export const RequestPage = () => {
  const { user } = useAuth();
  const {
    isLeftCollapsed,
    isRightCollapsed,
    isRightTransitioning,
    rightPanelRef,
    handleLeftCollapse,
    handleRightCollapse,
    handleLeftResizeHandleClick,
    handleRightResizeHandleClick,
  } = useLayout();

  const { selectedProject, selectedRequest, isLoading, clientRequestId, updateClientDeploymentById } =
    useClientProject();

  useEffect(() => {
    if (!isRightCollapsed && clientRequestId) {
      updateClientDeploymentById(clientRequestId);
    }
  }, [isRightCollapsed]);

  if (!user || isLoading) {
    return (
      <ResizablePanel
        defaultSize={isLeftCollapsed ? 96 : 84}
        minSize={isLeftCollapsed ? 96 : 84}
        maxSize={isLeftCollapsed ? 96 : 84}
        className={`flex h-screen flex-col items-center overflow-hidden justify-center
          `}
      >
        <Loader2 className="w-full h-6 animate-spin" />
      </ResizablePanel>
    );
  }

  return (
    <TaskInstanceMetaProvider clientRequestId={clientRequestId!}>
      <ResizableHandle
        className="cursor-pointer hidden"
        onClick={handleLeftResizeHandleClick}
      />

      <TabUiProvider>
        <ApiDocProvider>
          <ResizablePanel defaultSize={84}>
            <div className="h-full">
              <ChatWindow
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
      </TabUiProvider>
    </TaskInstanceMetaProvider>
  );
};
