import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { ChatUIMessageWithTypes } from "./convertors";
import { UseMicrofoxChatOptions } from "./useMicrofoxChat";
import { useFileUpload } from "../providers/FileUploadProvider";


export type ContextType = 'chat' | 'server';
export type ServerStatusType = 'pending' | 'success' | 'error' | 'idle';
export type MicrofoxMessageStatus = "error" | "submitted" | "streaming" | "ready" | ServerStatusType;


export const useMicrofox = ({
    clientRequest,
    resetInputState,
    ...props
}: UseMicrofoxChatOptions) => {

    const [context, setContext] = useState<ContextType>('chat');
    const [minionType, setMinionType] = useState<ChatUIMessageWithTypes['minionType'] | null>("hellofox");
    //const [messages, setMessages] = useState<ChatUIMessageWithTypes[]>([]);
    const { mediaPayload } = useFileUpload()

    const chatOptions = useChat({
        api: '/api/chat',
        initialMessages: [],
        initialInput: '',
        experimental_prepareRequestBody: (options) => {
            console.log("prepareRequestBody", options, mediaPayload, minionType);
            return {
                ...options,
                minionType,
                media: mediaPayload
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
        console.log("chatOptions", chatOptions.messages);
    }, [chatOptions.messages]);

    return {
        context,
        setContext,
        minionType,
        setMinionType,
        ...chatOptions,
    }
}