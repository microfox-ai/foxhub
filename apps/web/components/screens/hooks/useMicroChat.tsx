// import {
//   AttachedMedia,
//   ClientRequest,
// } from '@/components/screens/CustomBots/Chat/ChatWindow';
// import { PortalSdk } from '@/utils/services/PortalSdk';
// import { useChat } from '@ai-sdk/react';
// import { ChatUIMessage } from '@prisma/client';
// import { Attachment, UIMessage } from 'ai';
// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { toast } from 'sonner';
// import useSWR from 'swr';
// import { mapChatUIMessageToVercelUIMessage } from './convertors';

// interface UseVercelChatProps {
//   userId: string;
//   clientRequest: ClientRequest;
// }

// // type AgentType = 'BUILDBOT' | 'MICROFOX';
// // type ContextType = 'chatbot' | 'server';

// export type MicrofoxMessageStatus = "error" | "submitted" | "streaming" | "ready" | ServerStatusType

// const useMicroChat = ({ userId, clientRequest }: UseVercelChatProps) => {
//   const {
//     messages,
//     error,
//     append,
//     setMessages,
//     setInput,
//     input,
//     status,
//     handleInputChange,
//     ...rest
//   } = useChat({
//     api: '/api/chat',
//     onResponse: async (response) => {
//       try {
//         // NOTE: THIS STORING OF BOT MESSAGES CAN ALSO BE
//         // DONE ON THE BACKEND /API/CHAT INSIDE onFinish()
//         const botResponse = await response.json();

//         // Save bot response to database
//         await PortalSdk.postData(
//           '/api/client-requests/chat?messageType=chatbot',
//           {
//             originClientRequestId: clientRequest.id,
//             userId,
//             message: botResponse.content,
//             // CHANGE THIS: AGENT TYPE SHOULD COME FROM SERVER WITH BOT RESPONSE
//             // This could be either in data or annotations
//             agentType: botResponse.data[0].agentType,
//           },
//         );
//       } catch (error) {
//         console.log('error', error);
//       }
//     },
//     onError: (error) => console.log('error', error),
//   });

//   //const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
//   //const [context, setContext] = useState<ContextType>('server');
//   //const [agentType, setAgentType] = useState<AgentType>();
//   //const [serverMessageStatus, setServerMessageStatus] =
//   //  useState<ServerStatusType>('idle');

//   // NOTE: context defines the current hooks message status.
//   // const messageStatus = useMemo(
//   //   () => (context === 'chatbot' ? status : serverMessageStatus),
//   //   [context, status, serverMessageStatus],
//   // );

//   // Fetch updates for this client request
//   // const {
//   //   data: chatUIMessages,
//   //   mutate,
//   //   isLoading,
//   //   isValidating,
//   // } = useSWR<ChatUIMessageWithTypes[]>(
//   //   `/api/client-requests/chat/update?requestId=${clientRequest.id}`,
//   //   async (url: string) => {
//   //     const res = await PortalSdk.getData(url, {});
//   //     return res.chatUIMessages;
//   //   },
//   // );

//   // Initialize messages when updates are fetched
//   // useEffect(() => {
//   //   if (
//   //     !(messageStatus === 'pending' || messageStatus === 'streaming') &&
//   //     chatUIMessages &&
//   //     !isValidating
//   //   ) {
//   //     setMessages(
//   //       chatUIMessages.map(mapChatUIMessageToVercelUIMessage),
//   //     );
//   //     // setRequestStatus(chatUIMessages.requestStatus);
//   //   }
//   // }, [chatUIMessages]);

//   // updates from the server side if any PR changes detected & sends back messages that need to be appended to the client.


//   // Append user message and handle bot response
//   const customAppend = useCallback(
//     async (options: {
//       context?: ChatUIMessageWithTypes['context'];
//       minionType?: ChatUIMessageWithTypes['minionType'];
//       data?: Attachment
//     }) => {
//       const messageContext = options?.context || context;

//       // if (sending) {
//       //   toast.error('Last message is being sent. Please wait.');
//       //   return;
//       // }
//       const messagePayload = {
//         id: crypto.randomUUID(),
//         role: 'user' as any,
//         content: input,
//         createdAt: new Date(),
//         annotations: [
//           {
//             contentType: 'attachmet',
//             content: {
//               ...(options?.minionType && { minionType: options?.minionType }),
//               ...options?.data,
//             }
//           }
//         ]
//       }

//       if (messageContext === 'chatbot') {
//         try {
//           append(messagePayload);

//           // save client message to db
//           await PortalSdk.postData('/api/client-requests/chat', {
//             originClientRequestId: clientRequest.id,
//             userId,
//             message: input,
//             role: 'user',
//             minionType: options?.minionType,
//             context: 'chat',
//             attachments: [options?.data],
//           });

//           //reset
//           setInput('');
//           // attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
//           setAttachedMedia([]);
//         } catch (error) {
//           console.error(error);
//         }
//       } else {
//         const tempId = crypto.randomUUID();
//         try {
//           setServerMessageStatus('pending');
//           // Append user message locally
//           setMessages((ms) => [
//             ...ms,
//             messagePayload
//           ]);
//           setInput('');
//           attachedMedia.forEach((media) => URL.revokeObjectURL(media.preview));
//           setAttachedMedia([]);
//           // save client message to db
//           await PortalSdk.postData('/api/client-requests/chat', {
//             originClientRequestId: clientRequest.id,
//             userId,
//             message: input
//           });
//           setServerMessageStatus('success');
//         } catch (error) {
//           console.error(error);
//           setServerMessageStatus('error');
//           // Remove message if an error occurs
//           setMessages((ms) => ms.filter((m) => m.id !== tempId));
//         } finally {
//           setServerMessageStatus('idle');
//         }
//       }
//     },
//     [input, context, agentType],
//   );

//   return {
//     input,
//     customAppend,
//     mutate,
//     messages,
//     messageStatus,
//     isLoading,
//     isValidating,
//     setAttachedMedia,
//     attachedMedia,
//     handleInputChange,
//     context,
//     setContext,
//     agentType,
//     setAgentType,
//   };
// };

// export default useMicroFoxChat;
