"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientRequest } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { useFileUpload } from "../providers/FileUploadProvider";
import { AddClientSecretModal } from "./AddClientSecretModal";
import ChatHeader from "./ChatHeader";
import ChatInputBox from "./ChatInputBox";
import { SlashModal } from "./SlashModal";
import TabMessages from "./TabMessages";
import { MicrofoxProvider, useMicrofox } from "../providers/MicrofoxProvider";
import { ButtonSCN } from "@/components/elements/Button";
import { PanelRightIcon } from "lucide-react";
import ConfigureTab from "./ConfigureTab";
import { motion, AnimatePresence } from "framer-motion";

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
}: {
  userId: string;
  clientRequest?: ClientRequest;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  projectTitle?: string;
}) {
  // Chat state
  const [activeTab, setActiveTab] = useState("chat");
  const [previousTab, setPreviousTab] = useState("chat");
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleTabChange = (value: string) => {
    setPreviousTab(activeTab);
    setActiveTab(value);
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

  const getSlideDirection = (tabValue: string) => {
    if (!previousTab || previousTab === tabValue) return 0;
    const tabOrder = ["chat", "history", "configure"];
    const prevIndex = tabOrder.indexOf(previousTab);
    const currentIndex = tabOrder.indexOf(tabValue);
    return prevIndex < currentIndex ? 100 : -100;
  };

  // const [requestStatus, setRequestStatus] = useState(
  //   clientRequest?.requestStatus,
  // );
  // Global add bot modal states (for selecting a template and filling variables)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { mediaPayload, resetMedia } = useFileUpload();

  const {
    messages,
    setMessages,
    reload: mutate,
    status,
    isLoading,
    input,
    setInput,
    handleInputChange,
    append,
    data,
  } = useMicrofox();

  // Reload client data when specific operations are completed
  const reloadClientData = async () => {
    try {
      await mutate();
    } catch (error) {
      console.error("Error reloading client data:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to the bottom of the chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="relative h-screen gap-0"
      >
        <div className="flex w-full">
          {isCollapsed && (
            <ButtonSCN
              variant="ghost"
              size="icon"
              className="mt-5 ml-4"
              onClick={() => onCollapse?.(!isCollapsed)}
            >
              <PanelRightIcon style={{ height: "1rem", width: "1rem" }} />
            </ButtonSCN>
          )}
          <ChatHeader
            projectTitle={projectTitle}
            clientRequest={clientRequest}
            mutate={mutate}
            isLoading={isLoading}
            isValidating={isLoading}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />
        </div>

        {messages.length > 0 /* Chat Tabs */ ? (
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
                      <TabMessages
                        messages={messages}
                        isLoading={false}
                        messagesEndRef={messagesEndRef}
                        isStreaming={status === "streaming"}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === "configure" && (
                  <motion.div
                    key="configure"
                    initial={{ x: getSlideDirection("configure") }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      duration: 0.1,
                      exit: { duration: 0 },
                    }}
                    className=" w-full h-full overflow-y-auto"
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
          !isLoading && (
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
      {/* Slash Modal: Opened when input starts with '/' */}
      {clientRequest && (
        <SlashModal
          clientRequest={clientRequest}
          onSuccess={reloadClientData}
          onClose={() => {}}
        />
      )}

      {/* Global Add ClientSecret Modal */}
      {clientRequest && (
        <AddClientSecretModal
          clientRequest={clientRequest}
          userId={userId}
          onSuccess={reloadClientData}
        />
      )}
    </div>
  );
}

export default function ChatWindowWithProvider({
  userId,
  clientRequest,
  isCollapsed,
  onCollapse,
  projectTitle,
}: {
  userId: string;
  clientRequest?: ClientRequest;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  projectTitle?: string;
}) {
  return (
    <MicrofoxProvider clientRequest={clientRequest}>
      <ChatWindow
        userId={userId}
        clientRequest={clientRequest}
        isCollapsed={isCollapsed}
        onCollapse={onCollapse}
        projectTitle={projectTitle}
      />
    </MicrofoxProvider>
  );
}

