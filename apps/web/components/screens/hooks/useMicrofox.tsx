import { useChat, UseChatOptions } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { ChatUIMessageWithTypes, mapChatUIMessageToVercelUIMessage, mapVercelUIMessageToChatUIMessage } from "./convertors";
import { useFileUpload } from "../providers/FileUploadProvider";
import { PortalSdk } from "@/utils/services/PortalSdk";
import useSWR from "swr";
import { ClientRequest } from "@prisma/client";


export interface UseMicrofoxChatOptions extends UseChatOptions {
    clientRequest?: ClientRequest;
    resetInputState?: () => void
}


// A Single Message is a compilation of annotation, reasoning, inner-loops of thoughts, toolcalls, & the final response message.
export const useMicrofox = ({
    clientRequest,
    resetInputState,
    ...props
}: UseMicrofoxChatOptions) => {

    const [minionType, setMinionType] = useState<ChatUIMessageWithTypes['minionType'] | null>("hellofox");
    //const [messages, setMessages] = useState<ChatUIMessageWithTypes[]>([]);
    const { mediaPayload } = useFileUpload()

    const {
        data: serverMessages,
        mutate,
        isValidating,
        isLoading,
    } = useSWR<ChatUIMessageWithTypes[]>(
        `/api/client-requests/chat/update?requestId=${clientRequest?.id}`,
        async (url: string) => {
            const res = await PortalSdk.getData(url, {});
            return res.chatUIMessages;
        },
    );

    const chatOptions = useChat({
        api: '/api/chat',
        initialMessages: [],//(serverMessages?.map(mapChatUIMessageToVercelUIMessage)),
        initialInput: '',
        experimental_prepareRequestBody: (options) => {
            //console.log("prepareRequestBody", options, mediaPayload, minionType);
            return {
                ...options,
                minionType,
                media: mediaPayload,
                originClientRequestId: clientRequest?.id,
                userId: clientRequest?.userId,
            }
        },
        onResponse: (response) => {
            console.log(response);
        },
        onError: (error) => {
            console.log(error);
        },
    })
    useEffect(() => {
        console.log("chatOptions Messages", chatOptions.messages);
    }, [chatOptions.messages])

    useEffect(() => {
        console.log("chatOptions Data", chatOptions.data)
    }, [chatOptions.data])

    return {
        minionType,
        setMinionType,
        ...chatOptions,
        mutate,
        isLoading,
        isValidating,
        serverMessages
    }
}