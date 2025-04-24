"use client";

import { ButtonSCN } from "@/components/elements/Button";
import { Tabs } from "@/components/ui/tabs";
import { ClientRequest } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsRight, Loader2, PanelRightIcon } from "lucide-react";
import { useEffect } from "react";
import { ChatUIProvider, useChatUI } from "../providers/ChatUiProvider";
import { useLayout } from "../providers/LayoutProvider";
import { MicrofoxProvider, useMicrofox } from "../providers/MicrofoxProvider";
import { TabUiProvider, useTabUi } from "../providers/TabUiProvider";
import ChatHeader from "./ChatHeader";
import ChatInputBox from "./ChatInputBox";
import MessageList from "./MessageList";
import ConfigureTab from "./dashboard/ConfigureTab";

export type AttachedMedia = {
  file: File;
  preview: string;
};

function ChatWindow({
  userId,
  clientRequest,
  isCollapsed,
  onCollapse,
  projectTitle,
  isChatLoading,
}: {
  userId: string;
  clientRequest?: ClientRequest;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  projectTitle?: string;
  isChatLoading: boolean;
}) {
  // Chat state
  const {
    messages,
    reload: mutate,
    status,
    isLoading,
    input,
    handleInputChange,
    serverMessages,
  } = useMicrofox();

  const {
    activeTab,
    setActiveTab,
    setPreviousTab,
    getSlideDirection
  } = useTabUi();

  const { hasScrolled, setHasScrolled, messagesEndRef, scrollToBottom } = useChatUI();

  const { isRightCollapsed, handleRightCollapse } = useLayout();

  const handleTabChange = (value: string) => {
    setPreviousTab(activeTab);
    setActiveTab(value as "chat" | "dashboard" | "history");
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
            projectTitle={projectTitle}
            clientRequest={clientRequest}
            mutate={mutate}
            isChatLoading={isChatLoading}
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

        {(isChatLoading || isLoading) && (
          <div className="w-full flex justify-center h-full items-center">
            <Loader2 className="w-full h-6 animate-spin" />
          </div>
        )}

        {!isChatLoading &&
          !isLoading &&
          ((serverMessages && serverMessages.length > 0) ||
            messages.length > 0) /* Chat Tabs */ ? (
          <>
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
                      exit: { duration: 0 },
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
                      exit: { duration: 0 },
                    }}
                    className=" w-full h-full overflow-y-auto thin-scrollbar"
                  >
                    <div className="max-w-[800px] mx-auto">
                      <ConfigureTab />
                    </div>
                  </motion.div>
                )}
              </div>

              <motion.div
                className="bottom-0 pb-4 z-50 mx-auto left-0 right-0 w-full max-w-[800px] overflow-visible"
                initial={{ x: getSlideDirection("chat"), opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                {activeTab === "chat" && (
                  <ChatInputBox
                    key={"chat-input"}
                    lastMessage={messages[messages.length - 1]}
                    input={input}
                    messageStatus={status}
                    userId={userId}
                    handleInputChange={handleInputChange}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          !isChatLoading &&
          !isLoading &&
          messages.length === 0 &&
          (!serverMessages || serverMessages.length === 0) && (
            <div className="flex relative -mt-10 flex-col gap-4 justify-center items-center h-full">
              <h1 className="text-4xl font-bold">
                What would you like to build?
              </h1>
              <ChatInputBox
                input={input}
                messageStatus={status}
                userId={userId}
                handleInputChange={handleInputChange}
                className="relative max-w-[800px]"
              />
            </div>
          )
        )}
      </Tabs>
    </div>
  );
}

export default function ChatWindowWithProvider({
  userId,
  clientRequest,
  isCollapsed,
  onCollapse,
  projectTitle,
  isLoading,
}: {
  userId: string;
  clientRequest?: ClientRequest;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  projectTitle?: string;
  isLoading: boolean;
}) {
  return (
    <MicrofoxProvider clientRequest={clientRequest}>
      <TabUiProvider>
        <ChatUIProvider>
          <ChatWindow
            userId={userId}
            clientRequest={clientRequest}
            isCollapsed={isCollapsed}
            onCollapse={onCollapse}
            projectTitle={projectTitle}
            isChatLoading={isLoading}
          />
        </ChatUIProvider>
      </TabUiProvider>
    </MicrofoxProvider>
  );
}
