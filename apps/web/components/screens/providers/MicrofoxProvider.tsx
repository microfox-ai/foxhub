import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useChat, UseChatHelpers, UseChatOptions } from "@ai-sdk/react";
import { ChatUIMessageWithTypes } from "../hooks/convertors";
import { useFileUpload } from "./FileUploadProvider";
import { PortalSdk } from "@/utils/services/PortalSdk";
import useSWR from "swr";
import { ClientRequest } from "@prisma/client";
import useLocalState from "../hooks/useLocalState";
import { ChatRequestOptions, CreateMessage, Message, UIMessage } from "ai";
import {
  MySlackChannels,
  MICROFOX_LOGO,
  slackBotSdk,
  SLACK_BOT_OAUTH_TOKEN,
} from "@/utils/services/slackBotSdk";
import { createSlackSDK } from "@microfox/slack-web-tiny";
import { findLastElementWith } from "@/utils/helpers/array";

interface MicrofoxContextType extends UseChatHelpers {
  minionType: ChatUIMessageWithTypes["minionType"] | null;
  setMinionType: (type: ChatUIMessageWithTypes["minionType"] | null) => void;
  serverMessages?: ChatUIMessageWithTypes[];
  mutate: () => void;
  handleRefresh: (messageIndex: number) => Promise<void>;
  isLoading: boolean;
  isValidating: boolean;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: any;
  }) => void;
  // ... spread all chat options
}

const MicrofoxContext = createContext<MicrofoxContextType | undefined>(
  undefined
);

export interface MicrofoxProviderProps {
  children: React.ReactNode;
  clientRequest?: ClientRequest;
  resetInputState?: () => void;
  chatOptions?: Partial<UseChatOptions>;
}

export const MicrofoxProvider: React.FC<MicrofoxProviderProps> = ({
  children,
  clientRequest,
  resetInputState,
  chatOptions: userChatOptions,
}) => {
  const [minionType, setMinionType] = useState<
    ChatUIMessageWithTypes["minionType"]
  >("hellofox");

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

  useEffect(() => {
    if (serverMessages && serverMessages.length > 0) {
      //console.log("serverMessages", serverMessages);
      let userMessages = serverMessages.filter((m) => m.role === "user");
      if (userMessages.length > 0) {
        const lastMessage = userMessages[userMessages.length - 1];
        setMinionType(lastMessage?.minionType ?? "hellofox");
      }
    }
  }, [serverMessages]);

  const { handleSubmit: ununsedSubmit, ...chatOptions } = useChat({
    api: "/api/chat",
    initialMessages: (serverMessages as any[]) || [],
    initialInput: "",
    ...userChatOptions,
    id: clientRequest?.id,
    // experimental_prepareRequestBody: (options) => {
    //   let _minionType =
    //     localStorage.getItem("minionType-" + clientRequest?.id) ?? "hellofox";
    //   console.log("lstMsg", _minionType);
    //   return {
    //     // todo: only send the last message, & server fetch the rest.
    //     ...options,
    //     minionType: _minionType,
    //     clientRequestId: clientRequest?.id,
    //     userId: clientRequest?.userId,
    //   };
    // },
    onFinish: (response) => {
      try {
        const { experimental_attachments, id, reasoning, data, ...rest } =
          response;
        let _minionType = "hellofox";
        const minionAnnotation = rest.annotations?.find(
          (annotation: any) => annotation.type === "minion"
        );
        if (minionAnnotation) {
          _minionType = (minionAnnotation as any).value;
          if (_minionType) {
            setMinionType(_minionType as ChatUIMessageWithTypes["minionType"]);
          }
        }
        //add this message to the db
        if (
          rest.parts?.length === 0 &&
          rest.content === "" &&
          rest.annotations?.length === 0
        ) {
          return;
        }
        //console.log("rest response", rest);
        PortalSdk.postData("/api/chat/message", {
          context: "on-finish",
          id: clientRequest?.id + "-" + id,
          attachments: experimental_attachments,
          minionType: _minionType,
          userId: clientRequest?.userId,
          ...rest,
          originClientRequestId: clientRequest?.id,
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
      // slackBotSdk.sendMessage({
      //     text: `Reporting Error: ${error}`,
      //     channel: MySlackChannels.microfox_updates,
      //     username: "Microfox",
      //     icon_url: MICROFOX_LOGO,
      // })
    },
  });

  //-----------LISTENING-------------
  useEffect(() => {
    console.log("messages", chatOptions.messages);
  }, [chatOptions.messages]);

  useEffect(() => {
    console.log("data", chatOptions.data);
  }, [chatOptions.data]);

  //-----------DB OPERATIONS -----------------
  const createMessage = useCallback(
    async (message: UIMessage) => {
      if (!clientRequest) {
        return;
      }
      let _minionType =
        localStorage.getItem("minionType-" + clientRequest?.id) ?? "hellofox";
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
      ]
    };
    chatOptions.setInput("");
    await appendMessage(newMessage, chatRequestOptions);
  };

  /** should prefill the minion annotation */
  const appendMessage = useCallback(
    async (message: Message | CreateMessage, chatRequestOptions?: ChatRequestOptions, bypassDb?: boolean) => {
      if (!bypassDb) {
        await createMessage(message as any);
      }
      const id = await chatOptions.append(message, {
        ...chatRequestOptions,
        body: {
          ...chatRequestOptions?.body,
          clientRequestId: clientRequest?.id,
          userId: clientRequest?.userId,
          minionType: minionType,
        },
      });
      return id;
    }, [clientRequest, minionType]);

  const handleRefresh = async (messageIndex: number) => {
    //console.log("refreshing", messageIndex);
    if (messageIndex >= chatOptions.messages.length) {
      return;
    }
    const message = { ...chatOptions.messages[messageIndex] };
    chatOptions.setMessages((messages) => {
      const newMessages = messages.slice(0, messageIndex);
      return newMessages;
    });
    if (messageIndex + 1 < chatOptions.messages.length) {
      const extraMessages = chatOptions.messages.slice(messageIndex + 1);
      const response = await deleteMessages(extraMessages.map((m) => m.id));
      console.log("deleted messages", response);
    }
    const lastMessage = chatOptions.messages[chatOptions.messages.length - 1];
    // bypass the createMessage by using the original append method (as we did not delete the last message from the db)
    // if doing edit, we should also delete the last message from the db
    if (message) {
      try {
        await appendMessage(message as Message, {}, true);
      } catch (error) {
        console.log("error appending message", error);
      }
    }
    // console.log("deleted messages", extraMessages.map(m => m.id));
  };

  const value = {
    ...chatOptions,
    handleSubmit,
    minionType,
    setMinionType,
    append: appendMessage,
    mutate,
    isLoading,
    isValidating,
    serverMessages,
    handleRefresh,
  };

  return (
    <MicrofoxContext.Provider value={value}>
      {children}
    </MicrofoxContext.Provider>
  );
};

// Custom hook to use the Microfox context
export const useMicrofox = () => {
  const context = useContext(MicrofoxContext);
  if (context === undefined) {
    throw new Error("useMicrofox must be used within a MicrofoxProvider");
  }
  return context;
};
