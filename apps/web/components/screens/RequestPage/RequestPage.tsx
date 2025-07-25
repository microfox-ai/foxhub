"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Loader2, XIcon } from "lucide-react";
import { useEffect } from "react";
import ChatWindow from "../Chat/ChatWindow";
import { ApiDocProvider } from "../providers/ApiDocProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useLayout } from "../providers/LayoutProvider";
import { TabUiProvider } from "../providers/TabUiProvider";
import { TaskInstanceMetaProvider } from "../providers/TaskInstanceMetaProvider";
import { MicrofoxChatProvider } from "../Chat/MicrofoxChatProvider";
import { BackgroundTaskProvider } from "../Chat/BackgroundTaskProvider";
import { ChatUIProvider } from "../Chat/ChatUiProvider";
import { HitlProvider } from "../Chat/message/uiTool/hitl/HitlProvider";
import { Button } from "@/components/ui/button";

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
    rightPanelContent,
  } = useLayout();

  const { isLoading, clientRequestId, updateClientDeploymentById } =
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
      <TabUiProvider>
        <ApiDocProvider>
          <MicrofoxChatProvider>
            <ChatUIProvider>
              <BackgroundTaskProvider>
                <HitlProvider>
                  <ResizableHandle
                    className="cursor-pointer hidden"
                    onClick={handleLeftResizeHandleClick}
                  />
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
                    {rightPanelContent || (
                      <div className="h-full py-4 px-2">
                        <div className="h-full bg-zinc-100 rounded-xl relative border border-zinc-200 overflow-hidden">
                          <div className="flex flex-col h-full">
                            <div className="flex flex-row justify-end items-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRightCollapse(true)}>
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* <PreviewWindow /> */}
                        </div>
                      </div>
                    )}

                  </ResizablePanel>
                </HitlProvider>
              </BackgroundTaskProvider>
            </ChatUIProvider>
          </MicrofoxChatProvider>
        </ApiDocProvider>
      </TabUiProvider>
    </TaskInstanceMetaProvider>
  );
};
