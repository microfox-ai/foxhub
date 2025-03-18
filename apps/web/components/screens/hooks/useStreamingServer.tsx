import { ClientRequest } from "@prisma/client";
import { ServerStatusType } from "./useMicrofoxChat";
import { useChat } from "@ai-sdk/react";

export interface StreamingServerOptions {

}

export const useStreamingServer = ({
    ...props
}: StreamingServerOptions) => {
    const chatOptions = useChat({
        api: '/api/chat',
        initialMessages: [],
        initialInput: '',
        experimental_prepareRequestBody: (options) => {
            console.log(options);
        },
        onResponse: (response) => {
            console.log(response);
        },
        onError: (error) => {
            console.log(error);
        },
    })

    return chatOptions;

}