import { IN_DEV } from "@/utils/constants/appInfo";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk
} from "@/utils/services/slackBotSdk";
import { useChat, UseChatOptions, } from "@ai-sdk/react";
import { ClientRequest } from "@prisma/client";
import { ChatRequestOptions, CreateUIMessage, UIMessage, DefaultChatTransport } from "ai";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { ChatUIMessageWithTypes, MinionFlow, MinionType } from "../hooks/convertors";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useLayout } from "../providers/LayoutProvider";
import { getTextParts } from "@repo/ai-utils/helper";
import { useAuth } from "@/components/auth/AuthProvider";

type MicrofoxContextType = ReturnType<typeof useMicrofoxContext>;

const MicrofoxContext = createContext<MicrofoxContextType | undefined>(
  undefined
);

export interface MicrofoxChatProviderProps {
  children: React.ReactNode;
  clientRequest?: ClientRequest;
  chatOptions?: Partial<UseChatOptions<UIMessage<any, any, any>>>;
}

export const useMicrofoxContext = (clientRequest?: ClientRequest, userChatOptions?: Partial<UseChatOptions<UIMessage>>) => {

  const { selectedRequest, mutateSelectedClientRequest } = useClientProject();
  const { handleRightCollapse } = useLayout();
  const [toolMode, setToolMode] = useState<("fast" | "deep")>("fast");

  const { user } = useAuth();


  const {
    data: serverMessages,
    mutate,
    isValidating,
    isLoading,
  } = useSWR<ChatUIMessageWithTypes[]>(
    `/api/chat/message?requestId=${selectedRequest?.id}`,
    async (url: string) => {
      const res = await PortalSdk.getData(url, {});
      return res;
    }, {
    revalidateOnMount: true,
    revalidateOnFocus: true,
  }
  )

  const { ...chatOptions } = useChat<UIMessage<any, any, any>>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages, requestMetadata, body, ...rest }) => {
        console.log("[prepareSendMessagesRequest]", { id, messages, requestMetadata, body, rest });
        return {
          ...rest,
          headers: {
            "Content-Type": "application/json",
            "x-client-request-id": clientRequest?.id ?? "",
            ...rest.headers,
          },
          body: {
            ...body,
            messages: messages,
            clientRequestId: clientRequest?.id,
            userId: user?.id,
          }
        }
      }
    }),
    resume: false,
    messages: (serverMessages as any[]) || [],
    ...userChatOptions,
    id: clientRequest?.id,
    onFinish: (response) => {
      console.log("[onFinish] called with response:", response);
      try {
        const { message, ...rest } =
          response;
        let _minionFlow;
        let _minionType;
        //add this message to the db
        if (
          message?.parts?.length === 0 || !message.role || !message.parts || !message.parts[0]
        ) {
          console.log("[onFinish] Message has no parts, returning.");
          return;
        }
        const _clientRequestId = message.metadata?.clientRequestId ?? clientRequest?.id;
        _minionType = message.metadata?.minionType;
        _minionFlow = message.metadata?.minionFlow ?? clientRequest?.minionFlow ?? "buildFlow";
        //const _agentAction = (annotations?.find((annotation: any) => annotation.type === 'agentAction') as any)?.value;

        const postDataPayload = {
          context: "on-finish",
          id: message.id?.endsWith(_clientRequestId) ? message.id : message.id + "-" + _clientRequestId,
          attachments: message.metadata?.attachments,
          minionType: _minionType,
          minionFlow: _minionFlow,
          userId: user?.id,
          role: message.role,
          metadata: message.metadata,
          parts: message.parts,
          content: getTextParts(message).join(", ") ?? "",
          ...rest,
          originClientRequestId: _clientRequestId,
        };
        console.log("[onFinish] Storing assistant message to DB with payload:", postDataPayload);
        PortalSdk.postData("/api/chat/message", postDataPayload);
      } catch (error) {
        console.error("[onFinish] Error storing assistant message:", error);
      }
    },
    onError: (error) => {
      console.error("[onError] Chat error:", error);
      if (!IN_DEV) {
        // slackBotSdk.sendMessage({
        //   text: `Reporting Error in Chat: ${error}`,
        //   channel: MySlackChannels.microfox_updates,
        //   username: "Microfox",
        //   icon_url: MICROFOX_LOGO,
        // })
      }
    },
  });

  useEffect(() => {
    if (serverMessages && chatOptions.messages.length === 0 && serverMessages.length > 0) {
      chatOptions.setMessages(serverMessages as any);
    }
  }, [serverMessages, chatOptions.messages, chatOptions.status]);

  //-----------LISTENING-------------
  const lastKnownMinionType = useMemo(() => {
    if (chatOptions.messages.length === 0) {
      return MinionType.Unknown;
    }
    const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
    const minionTypeAnnotation: any = lastMessage?.metadata?.minionType;
    return minionTypeAnnotation ?? MinionType.Unknown;
  }, [chatOptions.messages]);
  const lastKnownMinionFlow = useMemo(() => {
    if (chatOptions.messages.length === 0) {
      return MinionFlow.Unknown;
    }
    const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
    const minionFlowAnnotation: any = lastMessage?.metadata?.minionFlow;
    return minionFlowAnnotation ?? MinionFlow.Unknown;
  }, [chatOptions.messages]);
  //console.log("lastKnownStuff", lastKnownMinionType, lastKnownMinionFlow);

  useEffect(() => {
    console.log("messages", chatOptions.messages);
    // const lastMessage = chatOptions.messages?.[chatOptions.messages.length - 1];
    // const isClientRequestTitle: any = lastMessage?.metadata?.clientRequestTitle;
    // if (isClientRequestTitle && isClientRequestTitle !== selectedRequest?.title) {
    //   mutateSelectedClientRequest();
    // }
  }, [chatOptions.messages, selectedRequest?.title]);

  // useEffect(() => {
  //   //console.log("data", chatOptions.data);
  // }, [chatOptions.data]);

  //-----------DB OPERATIONS -----------------
  const createMessage = useCallback(
    async (
      message: UIMessage,
      _minionType: ChatUIMessageWithTypes["minionType"],
      _minionFlow: ChatUIMessageWithTypes["minionFlow"]
    ) => {
      console.log("[createMessage] called with:", { message, _minionType, _minionFlow });
      if (!clientRequest) {
        console.log("[createMessage] No client request, returning.");
        return;
      }
      if (!message.id) {
        message.id = crypto.randomUUID();
        console.log("[createMessage] Generated new message id:", message.id);
      }
      try {
        const payload = {
          ...message,
          id: message.id?.endsWith(clientRequest.id) ? message.id : message.id + "-" + clientRequest.id,
          originClientRequestId: clientRequest.id,
          userId: clientRequest?.userId,
          minionType: _minionType,
          minionFlow: _minionFlow,
          content: getTextParts(message).join(", ") ?? "",
          context: "on-start",
        };
        console.log("[createMessage] Posting message to DB with payload:", payload);
        await PortalSdk.postData("/api/chat/message", payload);
        console.log("[createMessage] Successfully posted message to DB.");
      } catch (error) {
        console.error("[createMessage] Error creating message:", error);
      }
    },
    [clientRequest]
  );

  const deleteMessages = useCallback(
    async (messageIds: string[]) => {
      if (!clientRequest) {
        return;
      }
      let _ids = messageIds.map((_id) =>
        _id.endsWith(clientRequest.id) ? _id : _id + "-" + clientRequest.id
      );
      return await PortalSdk.deleteData(
        `/api/chat/message?ids=${_ids.join(",")}&originClientRequestId=${clientRequest.id}`,
        {}
      );
    },
    [clientRequest]
  );

  //-----------USECHAT OVERWITES------------
  // BYPASSING the original handle submit
  const handleSubmit = async (
    text: string,
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions
  ) => {
    console.log("[handleSubmit] called with:", { text, chatRequestOptions });
    // first store the lastmessage to db
    if (event) {
      event.preventDefault?.();
      setInput("");
    }
    const newMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [
        {
          type: "text",
          text: text,
        },
      ],
    };
    console.log("[handleSubmit] created new message:", newMessage);
    await appendMessage(newMessage, chatRequestOptions);
    console.log("[handleSubmit] finished.");
  };

  /** should prefill the minion annotation */
  const appendMessage = useCallback(
    async (
      message: UIMessage,
      chatRequestOptions?: ChatRequestOptions,
      bypassDb?: boolean
    ) => {
      console.log("[appendMessage] called with:", { message, chatRequestOptions, bypassDb });

      if (!clientRequest && !(chatRequestOptions?.body as any)?.clientRequestId) {
        toast.error("Client request not initialized. Please try again.");
        return;
      }

      handleRightCollapse(true);

      // fallback to the last known minion type & flow (if not set in the chatRequestOptions)
      let _minionType = (chatRequestOptions?.body as any)?.minionType ?? lastKnownMinionType ?? MinionType.Unknown;
      let _minionFlow = (chatRequestOptions?.body as any)?.minionFlow ?? lastKnownMinionFlow ?? clientRequest?.minionFlow ?? MinionFlow.Unknown;
      console.log("[appendMessage] Determined minion type and flow:", { _minionType, _minionFlow });

      const bodyParams = {
        ...chatRequestOptions?.body,
        minionType: _minionType,
        minionFlow: _minionFlow,
        ...(clientRequest ? { clientRequestId: clientRequest?.id } : {}),
      };
      console.log("[appendMessage] Constructed bodyParams:", bodyParams);

      let messageNew = {
        ...message,
        metadata: {
          ...bodyParams,
          ...(message.metadata || {}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      console.log("[appendMessage] Constructed messageNew:", messageNew);


      if (!bypassDb) {
        console.log("[appendMessage] Storing user message to DB...");
        await createMessage(
          messageNew,
          _minionType,
          _minionFlow
        );
        console.log("[appendMessage] Stored user message to DB.");
      }

      console.log("[appendMessage] Calling chatOptions.sendMessage with:", { messageNew, chatRequestOptions: { ...chatRequestOptions, body: bodyParams } });
      await chatOptions.sendMessage(messageNew, {
        ...chatRequestOptions,
        body: bodyParams,
      });
    },
    [clientRequest, lastKnownMinionType, lastKnownMinionFlow, clientRequest?.minionFlow, handleRightCollapse]
  );

  const handleRefresh = async (messageIndex: number) => {

    if (messageIndex >= chatOptions.messages.length) {
      return;
    }

    const messageToResend = { ...chatOptions.messages[messageIndex] }; // The user message to resend
    if (messageToResend.role !== 'user') {
      console.error("Cannot refresh from an assistant message index.");
      toast.error("Cannot refresh from this point.");
      return;
    }

    // Extract body parameters from annotations
    const bodyParams = messageToResend.metadata;

    const messagesToDelete = chatOptions.messages.slice(messageIndex + 1); // Assistant response and subsequent messages

    chatOptions.setMessages((messages) => {
      const newMessages = messages.slice(0, messageIndex);
      return newMessages;
    });


    if (messagesToDelete.length > 0) {
      const response = await deleteMessages(messagesToDelete.map((m) => m.id));
      console.log("deleted messages", response);
    }

    if (messageToResend) {
      try {
        // Resend the user message, triggering backend processing again
        await appendMessage(messageToResend as UIMessage, { body: bodyParams }, true);
      } catch (error) {
        console.log("error appending message during refresh", error);
        toast.error("Failed to refresh. Please try again.");
      }
    }
  };


  const [input, setInput] = useState("");

  return {
    ...chatOptions,
    handleSubmit,
    append: appendMessage,
    mutate,
    isLoading,
    isValidating,
    serverMessages,
    handleRefresh,
    clientRequest,
    lastKnownMinionType,
    lastKnownMinionFlow,
    input,
    setInput,
    toolMode,
    setToolMode,
  };
}

export const MicrofoxChatProvider: React.FC<MicrofoxChatProviderProps> = ({
  children,
  clientRequest,
  chatOptions: userChatOptions,
}) => {
  const value = useMicrofoxContext(clientRequest, userChatOptions);
  return (
    <MicrofoxContext.Provider value={value}>
      {children}
    </MicrofoxContext.Provider>
  );
};

// Custom hook to use the Microfox context
export const useMicrofoxChat = () => {
  const context = useContext(MicrofoxContext);
  if (context === undefined) {
    throw new Error("useMicrofox must be used within a MicrofoxProvider");
  }
  return context;
};
