"use client";

import { ButtonSCN } from "@/components/elements/Button";
import { Tabs } from "@/components/ui/tabs";
import { ClientRequest } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsRight, Loader2, PanelRightIcon } from "lucide-react";
import { useEffect } from "react";
import { ChatUIProvider, useChatUI } from "./ChatUiProvider";
import { useLayout } from "../providers/LayoutProvider";
import { MicrofoxChatProvider, useMicrofoxChat } from "./MicrofoxChatProvider";
import { TabUiProvider, useTabUi } from "../providers/TabUiProvider";
import ChatHeader from "./ChatHeader";
import ChatInputBox from "./ChatInputBox";
import MessageList from "./MessageList";
import ConfigureTab from "./dashboard/ConfigureTab";
import CodeStudio from "./code/CodeStudio";
import { useTaskInstanceMetaContext } from "../providers/TaskInstanceMetaProvider";
import { HistoryTab } from "./history/HistoryTab";
import { useRouter } from "next/navigation";
import PublishTab from "./publish/PublishTab";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export type AttachedMedia = {
  file: File;
  preview: string;
};

function ChatWindow() {
  // Chat state
  const {
    messages,
    status,
    isLoading,
    serverMessages,
  } = useMicrofoxChat();
  const { isLeftCollapsed: isCollapsed, handleLeftCollapse: onCollapse } = useLayout();
  const { selectedRequest: clientRequest, isLoading: isClientRequestLoading } = useClientProject();

  const {
    activeTab,
    setActiveTab,
    setPreviousTab,
    getSlideDirection
  } = useTabUi();

  const router = useRouter();

  const { hasScrolled, setHasScrolled, messagesEndRef, scrollToBottom } = useChatUI();
  const { mutate: mutateTaskInstanceMeta } = useTaskInstanceMetaContext();

  const { isRightCollapsed, handleRightCollapse } = useLayout();

  const handleTabChange = (value: string) => {
    setPreviousTab(activeTab);
    setActiveTab(value as "chat" | "dashboard" | "history" | "code");
    mutateTaskInstanceMeta()
    // Reset scroll state when switching tabs
    if (value !== "chat") {
      setHasScrolled(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasScrolled && activeTab === "chat") {
      setHasScrolled(true);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  if (clientRequest?.archiveStatus === "archived") {
    return (
      <div className="flex relative -mt-10 flex-col gap-4 justify-center items-center h-full">
        <h1 className="text-4xl font-bold">This Task is Deleted</h1>
        <p className="text-gray-500">
          Deleted Tasks cannot be recovered.
        </p>
        <ButtonSCN
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push(`/project/${clientRequest?.botProjectId}`)}
        >
          Back To Home
        </ButtonSCN>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="relative h-screen gap-0"
      >
        <div className="flex items-start w-full">
          {isCollapsed && (
            <ButtonSCN
              variant="ghost"
              size="icon"
              className=" ml-4 mt-6"
              onClick={() => onCollapse?.(!isCollapsed)}
            >
              <PanelRightIcon style={{ height: "1rem", width: "1rem" }} />
            </ButtonSCN>
          )}
          <ChatHeader
            messages={messages}
            projectTitle={clientRequest?.title}
            clientRequest={clientRequest}
            isChatLoading={isClientRequestLoading}
            isLoading={isLoading}
            isValidating={isLoading}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />
          {isRightCollapsed && (
            <ButtonSCN
              variant="outline"
              size="icon"
              className="shadow-none mt-6 !p-px mx-2 mr-4 text-gray-400 hover:text-gray-500 border-gray-300"
              onClick={() => handleRightCollapse(false)}
            >
              <ChevronsRight
                strokeWidth={2.5}
                style={{ height: "1rem", width: "1rem" }}
              />
            </ButtonSCN>
          )}
        </div>

        {(isClientRequestLoading || isLoading) && (
          <div className="w-full flex justify-center h-full items-center">
            <Loader2 className="w-full h-6 animate-spin" />
          </div>
        )}

        {!isClientRequestLoading &&
          !isLoading &&
          ((serverMessages && serverMessages.length > 0) ||
            messages.length > 0) /* Chat Tabs */ ? (
          <AnimatePresence mode="sync" initial={false}>
            <div className="relative flex-1 overflow-hidden">
              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ x: getSlideDirection("chat") }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.1,
                  }}
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to bottom, transparent, white 4%, white 96%, transparent)",
                    maskImage:
                      "linear-gradient(to bottom, transparent, white 4%, white 96%, transparent)",
                  }}
                  className={`w-full h-full overflow-y-auto ${hasScrolled ? "thin-scrollbar" : "scrollbar-hidden"}`}
                  onScroll={handleScroll}
                >
                  <div className="w-full max-w-[800px] pr-3 mx-auto pt-10">
                    <MessageList
                      isLoading={false}
                    />
                  </div>
                </motion.div>
              )}
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ x: getSlideDirection("dashboard") }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.1,
                  }}
                  className=" w-full h-full overflow-y-auto thin-scrollbar"
                >
                  <div className="p-4 h-full mx-auto">
                    <ConfigureTab />
                  </div>
                </motion.div>
              )}
              {activeTab === "code" && (
                <motion.div
                  key="code"
                  className="w-full h-[90vh] overflow-y-auto thin-scrollbar"
                >
                  <div className="p-4 h-full mx-auto">
                    <CodeStudio />
                  </div>
                </motion.div>
              )}
              {activeTab === "history" && (
                <motion.div
                  key="history"
                  className="w-full h-[90vh] overflow-y-auto thin-scrollbar"
                >
                  <div className="p-4 h-full mx-auto">
                    <HistoryTab />
                  </div>
                </motion.div>
              )}
              {activeTab === "publish" && (
                <motion.div
                  key="publish"
                  className="w-full h-[90vh] overflow-y-auto thin-scrollbar"
                >
                  <div className="p-4 h-full mx-auto">
                    <PublishTab />
                  </div>
                </motion.div>
              )}
            </div>

            <motion.div
              key={"chat-input"}
              className="bottom-0 pb-4 z-50 mx-auto left-0 right-0 w-full max-w-[800px] overflow-visible"
              initial={{ x: getSlideDirection("chat"), opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.1 }}
            >
              {activeTab === "chat" && (
                <ChatInputBox
                  key={"chat-input"}
                  lastMessage={messages[messages.length - 1]}
                  messageStatus={status}
                />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          !isClientRequestLoading &&
          !isLoading &&
          messages.length === 0 &&
          (!serverMessages || serverMessages.length === 0) && (
            <div className="flex relative -mt-10 flex-col gap-4 justify-center items-center h-full">
              <h1 className="text-4xl font-bold">
                What can I do for you?
              </h1>
              <p className="text-gray-500">
                I build bots that do complex automations across platforms based on your needs.
              </p>
              <ChatInputBox
                messageStatus={status}
                className="relative max-w-[800px]"
              />
            </div>
          )
        )}
      </Tabs>
    </div>
  );
}

export default function ChatWindowWithProvider() {
  const { selectedRequest, isLoading } = useClientProject();
  return (
    <MicrofoxChatProvider clientRequest={selectedRequest}>
      <ChatUIProvider>
        <ErrorBoundary>
          <ChatWindow />
        </ErrorBoundary>
      </ChatUIProvider>
    </MicrofoxChatProvider>
  );
}
