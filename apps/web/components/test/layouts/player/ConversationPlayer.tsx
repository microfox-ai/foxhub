// import { useAuth } from "@/components/auth/AuthProvider";
// import { useConversation, ConversationalSentence, SpeakerType } from "@/hooks/use-conversational-ai";
// import { FC, useState } from "react";

// const Message: FC<{ message: ConversationalSentence, isCurrentUser: boolean, currentIndex: { message: number; word: number } }> = ({ message, isCurrentUser, currentIndex }) => {
//     const messageIndex = parseInt(message.id.split('_')[1] ?? '-1', 10);
//     return (
//         <div style={{
//             alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
//             background: isCurrentUser ? '#007bff' : '#e9e9eb',
//             color: isCurrentUser ? 'white' : 'black',
//             padding: '10px 15px',
//             borderRadius: '20px',
//             marginBottom: '10px',
//             maxWidth: '70%',
//         }}>
//             <p>
//                 {message.words.map((word, wordIndex) => (
//                     <span
//                         key={wordIndex}
//                         style={{
//                             color: isCurrentUser ? 'white' : (currentIndex.message === messageIndex && currentIndex.word === wordIndex) ? '#1DB954' : 'black',
//                             fontWeight: (currentIndex.message === messageIndex && currentIndex.word === wordIndex) ? 'bold' : 'normal',
//                             transition: 'color 0.2s, font-weight 0.2s',
//                         }}
//                     >
//                         {word.text}{' '}
//                     </span>
//                 ))}
//             </p>
//         </div>
//     );
// };

// export const ConversationPlayerUI = () => {
//     const { status, startSession, endSession, messages, isSpeaking, currentIndex } = useConversation();
//     const [agentId, setAgentId] = useState('');

//     const { user } = useAuth();


//     const handleStart = () => {
//         if (agentId) {
//             startSession({ agentId, connectionType: 'webrtc', user_id: user?.id });
//         } else {
//             alert('Please provide an Agent ID.');
//         }
//     };

//     return (
//         <div style={{
//             position: 'absolute',
//             bottom: 20,
//             left: '50%',
//             transform: 'translateX(-50%)',
//             width: '90%',
//             maxWidth: '800px',
//             height: '70vh',
//             maxHeight: '600px',
//             background: 'rgba(255, 255, 255, 0.9)',
//             borderRadius: '15px',
//             boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
//             backdropFilter: 'blur(4px)',
//             display: 'flex',
//             flexDirection: 'column',
//             padding: '20px',
//             color: 'black',
//             zIndex: 100,
//         }}>
//             <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
//                 <input
//                     type="text"
//                     placeholder="Agent ID"
//                     value={agentId}
//                     onChange={(e) => setAgentId(e.target.value)}
//                     style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
//                     disabled={status !== 'disconnected'}
//                 />
//                 <button
//                     onClick={status === 'disconnected' ? handleStart : endSession}
//                     style={{
//                         padding: '10px 20px',
//                         borderRadius: '8px',
//                         border: 'none',
//                         background: status === 'disconnected' ? '#28a745' : '#dc3545',
//                         color: 'white',
//                         cursor: 'pointer',
//                         fontWeight: 'bold',
//                     }}
//                 >
//                     {status === 'disconnected' ? 'Start Session' : 'End Session'}
//                 </button>
//             </div>
//             <div style={{
//                 flex: 1,
//                 overflowY: 'auto',
//                 paddingRight: '10px',
//                 display: 'flex',
//                 flexDirection: 'column'
//             }}>
//                 {messages.map((msg) => (
//                     <Message key={msg.id} message={msg} isCurrentUser={msg.speaker_type === 'user'} currentIndex={currentIndex} />
//                 ))}
//             </div>
//             <div style={{ textAlign: 'center', marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
//                 Status: {status} {isSpeaking && '(Assistant is speaking...)'}
//             </div>
//         </div>
//     );
// }; 