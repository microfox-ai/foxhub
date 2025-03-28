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
export type AttachedMedia = {
  file: File;
  preview: string;
};

function ChatWindow({
  userId,
  clientRequest,
  isCollapsed,
  onCollapse,
}: {
  userId: string;
  clientRequest?: ClientRequest;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}) {
  // Chat state
  const [activeTab, setActiveTab] = useState("chat");
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
      <div className="flex items-center w-full">
        {isCollapsed && (
          <ButtonSCN
            variant="ghost"
            size="icon"
            onClick={() => onCollapse?.(!isCollapsed)}
          >
            <PanelRightIcon style={{ height: "1rem", width: "1rem" }} />
          </ButtonSCN>
        )}
        <ChatHeader
          clientRequest={clientRequest}
          mutate={mutate}
          isLoading={isLoading}
          isValidating={isLoading}
        />
      </div>
      {/* Chat Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="relative flex h-fit flex-1 flex-col overflow-y-auto"
      >
        <div className="w-full px-4">
          <TabsList className="text-md flex w-full justify-evenly gap-4">
            <TabsTrigger className="w-full" value="chat">
              Chat
            </TabsTrigger>
            <TabsTrigger className="w-full" value="history">
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="chat"
          className="h-full max-h-[75vh] flex-1 space-y-4 overflow-y-auto p-4 pb-[100px]"
        >
          <TabMessages
            messages={messages}
            isLoading={false}
            messagesEndRef={messagesEndRef}
            isStreaming={status === "streaming"}
          />
        </TabsContent>

        {/* <TabsContent
          value="history"
          className="flex-1 space-y-4 overflow-y-auto"
        >
          <UpdateHistoryTab messages={messages} isLoading={isLoading} />
        </TabsContent> */}

        {activeTab === "chat" && (
          <ChatInputBox
            input={input}
            messageStatus={status}
            userId={userId}
            handleInputChange={handleInputChange}
          />
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
}: {
  userId: string;
  clientRequest?: ClientRequest;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}) {
  return (
    <MicrofoxProvider clientRequest={clientRequest}>
      <ChatWindow
        userId={userId}
        clientRequest={clientRequest}
        isCollapsed={isCollapsed}
        onCollapse={onCollapse}
      />
    </MicrofoxProvider>
  );
}
