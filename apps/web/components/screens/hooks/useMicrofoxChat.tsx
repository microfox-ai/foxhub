// import { useChat, UseChatOptions } from "@ai-sdk/react"
// import { UIMessage } from "ai";
// import { useCallback, useEffect, useMemo, useState } from "react";
// import useSWR from "swr";
// import { PortalSdk } from "@/utils/services/PortalSdk";
// import { ChatUIMessage, ClientRequest } from "@prisma/client";
// import { ChatUIMessageWithTypes, mapChatUIMessageToVercelUIMessage, mapVercelUIMessageToChatUIMessage } from "./convertors";
// import { AttachedMedia, MediaPayload } from "../providers/FileUploadProvider";

// export type ContextType = 'chat' | 'server';
// export type ServerStatusType = 'pending' | 'success' | 'error' | 'idle';
// export type MicrofoxMessageStatus = "error" | "submitted" | "streaming" | "ready" | ServerStatusType;


// // any extra metadata you want to add to the message
// export interface extraMetadata {
//   githubUrl?: string;
//   media: MediaPayload[];
// }

// export const useMicrofoxChat = ({
//   clientRequest,
//   resetInputState,
//   ...props
// }: UseMicrofoxChatOptions) => {

//   // sets context to either chat or server
//   const [context, setContext] = useState<ContextType>('server');
//   // activates chat with different agents
//   const [minionType, setMinionType] = useState<ChatUIMessageWithTypes['minionType'] | null>(null);
//   const [messages, setMessages] = useState<ChatUIMessageWithTypes[]>([]);
//   // ------ SERVER CONNECTION ------ //
//   const [serverStatus, setServerStatus] = useState<ServerStatusType>('idle');
//   const {
//     data: serverMessages,
//     mutate,
//     isValidating,
//     isLoading,
//   } = useSWR<ChatUIMessageWithTypes[]>(
//     `/api/client-requests/chat/update?requestId=${clientRequest?.id}`,
//     async (url: string) => {
//       const res = await PortalSdk.getData(url, {});
//       return res.chatUIMessages;
//     },
//   );

//   // fetch all old messages & sync to UI
//   useEffect(() => {
//     if (serverMessages && !isValidating) {
//       console.log('serverMessages', serverMessages);
//       setMessages(serverMessages)
//     }
//   }, [serverMessages])

//   //fetch new messages while listening for updates
//   const [listening, setListening] = useState(false);
//   const { data: prUpdates } = useSWR(
//     listening ? `/api/client-requests/chat/pr-updates?requestId=${clientRequest?.id}` : null,
//     async (url) => {
//       const res = await PortalSdk.getData(url, {});
//       return res.chatUIMessages;
//     },
//     { refreshInterval: 1000 },
//   );
//   useEffect(() => {
//     if (prUpdates && listening) {
//       setListening(false);
//       setMessages((m) => [...m, ...prUpdates.filter((update: ChatUIMessageWithTypes) => !m.some((msg) => msg.id === update.id))]);
//     }
//   }, [prUpdates, listening]);

//   // ------ VERCEL CHAT CONNECTION ------ //
//   const { messages: vercelMessages, setMessages: setVercelMessages,
//     status,
//     append: appendToVercel,
//     input,
//     setInput,
//     ...rest } = useChat(props)
//   // sync vercel messages to UI
//   useEffect(() => {
//     if (!vercelMessages || vercelMessages.length === 0) return;
//     switch (status) {
//       case 'streaming':
//         setMessages((m) => {
//           if (m &&
//             vercelMessages[vercelMessages.length - 1] &&
//             m.some((msg) => msg.id === vercelMessages[vercelMessages.length - 1]?.id)) {
//             return m.map((msg) => {
//               if (msg.id === vercelMessages[vercelMessages.length - 1]?.id && vercelMessages[vercelMessages.length - 1]) {
//                 return mapVercelUIMessageToChatUIMessage(vercelMessages[vercelMessages.length - 1]!, {
//                   userId: clientRequest?.userId || '',
//                   originClientRequestId: clientRequest?.id || '',
//                   minionType: minionType,
//                   //extraData: metadata,
//                 });
//               }
//               return msg;
//             });
//           }
//           if (vercelMessages[vercelMessages.length - 1] !== undefined) {
//             return [...m, mapVercelUIMessageToChatUIMessage(vercelMessages[vercelMessages.length - 1]!, {
//               userId: clientRequest?.userId || '',
//               originClientRequestId: clientRequest?.id || '',
//               minionType: minionType,
//               //extraData: metadata,
//             })];
//           }
//           return m;
//         })
//         break;
//       case 'error':
//         //setServerStatus('error');
//         break;
//       default:
//         break;
//     }
//   }, [messages, status]);



//   const append = useCallback(async (message?: ChatUIMessageWithTypes, extraData?: extraMetadata) => {
//     try {
//       let messagePayload = message ? { ...message } : {} as ChatUIMessageWithTypes;
//       if (!message?.originClientRequestId && clientRequest?.id) {
//         messagePayload.originClientRequestId = clientRequest?.id;
//         messagePayload.userId = clientRequest?.userId;
//         messagePayload.metadata = {
//           ...(messagePayload.metadata as any),
//           ...extraData,
//         }
//       }
//       if (!messagePayload.minionType && minionType) {
//         messagePayload.minionType = minionType;
//       }
//       const tempId = crypto.randomUUID();
//       messagePayload.content = input;
//       messagePayload.context = context;
//       messagePayload.role = 'user';
//       messagePayload.id = tempId;
//       messagePayload.createdAt = new Date();
//       if (context === 'chat') {
//         if (resetInputState) {
//           resetInputState();
//         }
//         setInput('');
//         appendToVercel(mapChatUIMessageToVercelUIMessage(messagePayload));
//         await PortalSdk.postData(`/api/client-requests/chat/update?requestId=${clientRequest?.id}`, {
//           ...messagePayload
//         });
//       }
//       else {
//         setServerStatus('pending');
//         // Append user message locally
//         setMessages((ms) => [
//           ...ms,
//           messagePayload
//         ]);
//         setInput('');
//         if (resetInputState) {
//           resetInputState();
//         }
//         // save client message to db
//         await PortalSdk.postData('/api/client-requests/chat', {
//           ...messagePayload,
//         }).catch((err) => {
//           console.error('Error appending message:', err);
//           setMessages((ms) => ms.filter((m) => m.id !== tempId));
//         });
//         setServerStatus('success');
//       }
//     } catch (error) {
//       console.error('Error appending message:', error);
//     }
//   }, [clientRequest?.id, context, appendToVercel, input]);



//   // NOTE: context defines the current hooks message status.
//   const messageStatus = useMemo(
//     () => (context === 'chat' ? status : serverStatus),
//     [context, status, serverStatus],
//   );

//   return {
//     input,
//     setInput,
//     isValidating,
//     mutate,
//     status,
//     serverStatus,
//     messageStatus,
//     context,
//     setContext,
//     messages,
//     setMessages,
//     minionType,
//     setMinionType,
//     listening,
//     setListening,
//     append,
//     ...rest,
//     isLoading,
//   }
// }