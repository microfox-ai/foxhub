import { IN_DEV } from "@/utils/constants/appInfo";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk
} from "@/utils/services/slackBotSdk";
import { useChat, UseChatOptions } from "@ai-sdk/react";
import { ClientRequest } from "@prisma/client";
import { ChatRequestOptions, CreateMessage, Message, UIMessage } from "ai";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { ChatUIMessageWithTypes, MinionFlow, MinionType } from "../hooks/convertors";
import { useClientProject } from "../providers/ClientProjectProvider";

type MicrofoxContextType = ReturnType<typeof useMicrofoxContext>;

const MicrofoxContext = createContext<MicrofoxContextType | undefined>(
  undefined
);

export interface MicrofoxChatProviderProps {
  children: React.ReactNode;
  clientRequest?: ClientRequest;
  chatOptions?: Partial<UseChatOptions>;
}

export const useMicrofoxContext = (clientRequest?: ClientRequest, userChatOptions?: Partial<UseChatOptions>) => {

  const { setSelectedRequest } = useClientProject();

  const {
    data: serverMessages,
    mutate,
    isValidating,
    isLoading,
  } = useSWR<ChatUIMessageWithTypes[]>(
    `/api/chat/message?requestId=${clientRequest?.id}`,
    async (url: string) => {
      const res = await PortalSdk.getData(url, {});
      return res;
    }
  );

  const { handleSubmit: ununsedSubmit, ...chatOptions } = useChat({
    api: "/api/chat",
    initialMessages: (serverMessages as any[]) || [],
    initialInput: "",
    ...userChatOptions,
    id: clientRequest?.id,
    onFinish: (response) => {
      try {
        const { experimental_attachments, id, reasoning, data, annotations, ...rest } =
          response;
        let _minionFlow;
        let _minionType;

        //add this message to the db
        if (
          rest.parts?.length === 0 &&
          rest.content === "" &&
          annotations?.length === 0
        ) {
          return;
        }
        const _clientRequestId = (annotations?.find((annotation: any) => annotation.type === 'clientRequestId') as any)?.value ?? clientRequest?.id;
        _minionType = (annotations?.find((annotation: any) => annotation.type === 'minion') as any)?.value;
        _minionFlow = (annotations?.find((annotation: any) => annotation.type === 'minionFlow') as any)?.value ?? clientRequest?.minionFlow ?? "buildFlow";
        //const _agentAction = (annotations?.find((annotation: any) => annotation.type === 'agentAction') as any)?.value;

        //console.log("rest response", rest);
        PortalSdk.postData("/api/chat/message", {
          context: "on-finish",
          id: clientRequest?.id + "-" + id,
          attachments: experimental_attachments,
          minionType: _minionType,
          minionFlow: _minionFlow,
          userId: clientRequest?.userId,
          annotations: annotations,
          ...rest,
          originClientRequestId: _clientRequestId ?? clientRequest?.id,
        });
      } catch (error) {
        console.log("error creating message on-finish", error);
      }
    },
    onResponse: (response) => {
      // console.log(response);
    },
    onError: (error) => {
      console.log("error", error);
      if (!IN_DEV) {
        slackBotSdk.sendMessage({
          text: `Reporting Error in Chat: ${error}`,
          channel: MySlackChannels.microfox_updates,
          username: "Microfox",
          icon_url: MICROFOX_LOGO,
        })
      }
    },
  });

  //-----------LISTENING-------------
  const lastKnownMinionType = useMemo(() => {
    if (chatOptions.messages.length === 0) {
      return MinionType.Unknown;
    }
    const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
    const minionTypeAnnotation: any = lastMessage?.annotations?.find((a: any) => a.type === "minion");
    return minionTypeAnnotation?.value ?? MinionType.Unknown;
  }, [chatOptions.messages]);
  const lastKnownMinionFlow = useMemo(() => {
    if (chatOptions.messages.length === 0) {
      return MinionFlow.Unknown;
    }
    const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
    const minionFlowAnnotation: any = lastMessage?.annotations?.find((a: any) => a.type === "minionFlow");
    return minionFlowAnnotation?.value ?? MinionFlow.Unknown;
  }, [chatOptions.messages]);
  console.log("lastKnownStuff", lastKnownMinionType, lastKnownMinionFlow);

  useEffect(() => {
    console.log("messages", chatOptions.messages);
    const lastMessage = chatOptions.messages?.[chatOptions.messages.length - 1];
    const isClientRequestTitle: any = lastMessage?.annotations?.find((a: any) => a.type === "clientRequestTitle");
    if (isClientRequestTitle && isClientRequestTitle.content) {
      setSelectedRequest((s) => {
        return s ? { ...s, title: isClientRequestTitle.content } : s;
      });
    }
  }, [chatOptions.messages]);

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
      if (!clientRequest) {
        return;
      }
      if (!message.id) {
        message.id = crypto.randomUUID();
      }
      //console.log("message", message);
      try {
        await PortalSdk.postData("/api/chat/message", {
          ...message,
          id: clientRequest.id + "-" + message.id,
          originClientRequestId: clientRequest.id,
          userId: clientRequest?.userId,
          minionType: _minionType,
          minionFlow: _minionFlow,
          context: "on-start",
        });
      } catch (error) {
        console.log("error creating message", error);
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
        _id.startsWith(clientRequest.id) ? _id : clientRequest.id + "-" + _id
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
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions
  ) => {
    // first store the lastmessage to db
    event?.preventDefault?.();
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: chatOptions.input,
      role: "user",
      parts: [
        {
          type: "text",
          text: chatOptions.input,
        },
      ],
    };
    chatOptions.setInput("");
    console.log("newMessageBody", chatRequestOptions?.body);
    await appendMessage(newMessage, chatRequestOptions);
  };

  /** should prefill the minion annotation */
  const appendMessage = useCallback(
    async (
      message: Message | CreateMessage,
      chatRequestOptions?: ChatRequestOptions,
      bypassDb?: boolean
    ) => {
      if (!clientRequest && !(chatRequestOptions?.body as any)?.clientRequestId) {
        toast.error("Client request not initialized. Please try again.");
        return;
      }

      // fallback to the last known minion type & flow (if not set in the chatRequestOptions)
      let _minionType = (chatRequestOptions?.body as any)?.minionType ?? lastKnownMinionType ?? MinionType.Unknown;
      let _minionFlow = (chatRequestOptions?.body as any)?.minionFlow ?? lastKnownMinionFlow ?? clientRequest?.minionFlow ?? MinionFlow.Unknown;
      const bodyParams = {
        ...chatRequestOptions?.body,
        minionType: _minionType,
        minionFlow: _minionFlow,
        ...(clientRequest ? { clientRequestId: clientRequest?.id } : {}),
      };

      console.log("bodyParams", bodyParams);
      // Create annotations from body parameters
      const bodyAnnotations = Object.entries(bodyParams).map(([key, value]) => ({
        type: 'body',
        key,
        value
      }));

      // Add body annotations to message
      const messageWithAnnotations = {
        ...message,
        annotations: [
          ...(message.annotations || []),
          ...bodyAnnotations
        ]
      };

      if (!bypassDb) {
        await createMessage(
          messageWithAnnotations as any,
          _minionType,
          _minionFlow
        );
      }

      const id = await chatOptions.append(messageWithAnnotations as any, {
        ...chatRequestOptions,
        body: bodyParams,
      });
      return id;
    },
    [clientRequest, lastKnownMinionType, lastKnownMinionFlow, clientRequest?.minionFlow]
  );

  const handleRefresh = async (messageIndex: number) => {
    //console.log("refreshing", messageIndex);
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
    const bodyParams = messageToResend.annotations?.reduce((acc: any, annotation: any) => {
      if (annotation.type === 'body') {
        acc[annotation.key] = annotation.value;
      }
      return acc;
    }, {});
    messageToResend.annotations = [];

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
        await appendMessage(messageToResend as Message, { body: bodyParams }, true);
      } catch (error) {
        console.log("error appending message during refresh", error);
        toast.error("Failed to refresh. Please try again.");
        // Optionally restore messages if append fails
      }
    }
    // console.log("deleted messages", extraMessages.map(m => m.id));
  };

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
    lastKnownMinionFlow
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
