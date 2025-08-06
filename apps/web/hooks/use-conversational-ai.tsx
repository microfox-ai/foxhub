// import { useState, useCallback, createContext, useContext, useEffect } from 'react';
// import { useConversation as useConversationElevenLabs, Status } from '@elevenlabs/react';
// import { useAuth } from '@/components/auth/AuthProvider';

// // Define speaker types to distinguish between user and assistant
// export type SpeakerType = 'user' | 'assistant';

// export interface ConversationalWord {
//     text: string;
//     start: number;
//     end: number;
//     duration: number;
//     speaker_id: string;
//     speaker_type: SpeakerType;
// }

// export interface ConversationalSentence {
//     id: string;
//     text: string;
//     words: ConversationalWord[];
//     start: number;
//     end: number;
//     duration: number;
//     speaker_id: string;
//     speaker_type: SpeakerType;
// }

// interface Transcript {
//     text: string;
//     start: number;
//     end: number;
// }

// interface AssistantMessage {
//     type: 'assistant';
//     id: string;
//     text: string;
//     transcript?: Transcript[];
// }

// interface UserMessage {
//     type: 'user';
//     text: string;
// }

// type ElevenLabsMessage = UserMessage | AssistantMessage;


// // Define the shape of the conversation state
// interface ConversationState {
//     status: Status;
//     isSpeaking: boolean;
//     messages: ConversationalSentence[];
//     error: Error | undefined;
//     currentIndex: {
//         message: number;
//         word: number;
//     };
// }

// // Define the options for the useConversation hook
// interface ConversationOptions {
//     onConnect?: () => void;
//     onDisconnect?: () => void;
//     onMessage?: (message: any) => void;
//     onError?: (error: string) => void;
// }

// // Define the context type for the conversation
// type ConversationContextType = {
//     startSession: (options: { agentId: string; user_id?: string, token: string }) => Promise<string>;
//     endSession: () => Promise<void>;
//     sendText: (text: string) => void;
//     setVolume: (volume: number) => void;
// } & ConversationState;


// const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// export const useConversation = () => {
//     const context = useContext(ConversationContext);
//     if (!context) {
//         throw new Error("useConversation must be used within a ConversationProvider");
//     }
//     return context;
// };

// export const ConversationProvider = ({ children, options }: { children: React.ReactNode, options?: ConversationOptions }) => {
//     const [agentId, setAgentId] = useState<string>();
//     const { user } = useAuth();
//     const [localMessages, setLocalMessages] = useState<ConversationalSentence[]>([]);
//     const [currentIndex, setCurrentIndex] = useState({ message: -1, word: -1 });

//     const { status, ...conversationHook } = useConversationElevenLabs({
//         agentId: agentId,
//         userId: user?.id,
//         onMessage: (msg) => {
//             let newMessage: ConversationalSentence;
//             console.log('msg', msg);
//             // if (msg.source === 'ai') {
//             //     const assistantMsg = msg.message;
//             //     const start = (assistantMsg.transcript?.[0]?.start ?? 0) / 1000;
//             //     const end = (assistantMsg.transcript?.[assistantMsg.transcript.length - 1]?.end ?? 0) / 1000;
//             //     const duration = end > start ? end - start : 0;
//             //     newMessage = {
//             //         id: assistantMsg.id,
//             //         text: assistantMsg.text,
//             //         speaker_type: 'assistant',
//             //         speaker_id: 'assistant', // or some agent id
//             //         words: assistantMsg.transcript?.map((t: Transcript) => ({
//             //             text: t.text,
//             //             start: t.start / 1000,
//             //             end: t.end / 1000,
//             //             duration: (t.end - t.start) / 1000,
//             //             speaker_id: 'assistant',
//             //             speaker_type: 'assistant',
//             //         })) || [],
//             //         start,
//             //         end,
//             //         duration
//             //     };
//             //     setLocalMessages(prevMessages => {
//             //         const existingMessageIndex = prevMessages.findIndex(m => m.id === newMessage.id);
//             //         if (existingMessageIndex !== -1) {
//             //             const newMessages = [...prevMessages];
//             //             newMessages[existingMessageIndex] = newMessage;
//             //             return newMessages;
//             //         } else {
//             //             return [...prevMessages, newMessage];
//             //         }
//             //     });
//             // } else {
//             //     const userMsg = msg as UserMessage;
//             //     newMessage = {
//             //         id: crypto.randomUUID(),
//             //         text: userMsg.text,
//             //         speaker_type: 'user',
//             //         speaker_id: user?.id || 'user',
//             //         words: [],
//             //         start: 0,
//             //         end: 0,
//             //         duration: 0,
//             //     };
//             //     setLocalMessages(prevMessages => [...prevMessages, newMessage]);
//             // }
//             options?.onMessage?.(msg);
//         },
//         onConnect: options?.onConnect,
//         onDisconnect: options?.onDisconnect,
//         onError: options?.onError,
//     });

//     const startSession = useCallback(async (sessionOptions: { agentId: string; user_id?: string, token?: string }) => {
//         setAgentId(sessionOptions.agentId);

//         try {
//             await navigator.mediaDevices.getUserMedia({ audio: true });
//         } catch (error) {
//             console.error("Microphone access denied:", error);
//             // The hook's error state should reflect this
//             return "";
//         }

//         if (!conversationHook.startSession) return "";
//         if (!sessionOptions.token) return "";

//         try {
//             const conversationId = await conversationHook.startSession({
//                 agentId: sessionOptions.agentId,
//                 userId: sessionOptions.user_id,
//                 connectionType: 'websocket',
//                 conversationToken: sessionOptions.token,
//             });
//             return conversationId || "";
//         } catch (e) {
//             console.error("Failed to start conversation:", e);
//             return "";
//         }
//     }, [conversationHook.startSession]);

//     const endSession = useCallback(async () => {
//         if (conversationHook.endSession) {
//             await conversationHook.endSession();
//         }
//     }, [conversationHook.endSession]);

//     const sendText = useCallback((text: string) => {
//         if (conversationHook.sendUserMessage) {
//             conversationHook.sendUserMessage(text);
//         }
//     }, [conversationHook.sendUserMessage]);

//     const handleSetVolume = useCallback((volume: number) => {
//         if (conversationHook.setVolume) {
//             conversationHook.setVolume({ volume });
//         }
//     }, [conversationHook.setVolume]);

//     const value: ConversationContextType = {
//         startSession,
//         endSession,
//         sendText,
//         setVolume: handleSetVolume,
//         status,
//         messages: localMessages,
//         error: error ? new Error(error) : undefined,
//         isSpeaking: status === 'speaking',
//         currentIndex,
//     };

//     return (
//         <ConversationContext.Provider value={value}>
//             {children}
//         </ConversationContext.Provider>
//     );
// }; 