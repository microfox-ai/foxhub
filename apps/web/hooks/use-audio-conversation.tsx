import { useState, createContext, useContext, useCallback, useEffect, useRef } from "react";
import { story } from "@/components/test/layouts/data/story";
import { StreamingAudioChunkWithTimestampsResponse } from "@elevenlabs/elevenlabs-js/api/types/StreamingAudioChunkWithTimestampsResponse";
import { useChat, UseChatOptions } from '@ai-sdk/react';
import { UIMessage, DefaultChatTransport } from 'ai';

/**
 * The number of sentences to fetch in a single batch.
 * This helps in managing network requests efficiently.
 */
const BATCH_SIZE = 5;

export type SpeakerType = 'user' | 'assistant';


/**
 * Represents a single word with its timing information.
 */
export interface ConversationWord {
    text: string;
    start: number;
    end: number;
    duration: number;
    speaker_id: string;
    speaker_type: SpeakerType;
}

/**
 * Represents a sentence, which is a collection of words, with its timing information.
 */
export interface ConversationSentence {
    id: string;
    text: string;
    words: ConversationWord[];
    start: number;
    end: number;
    duration: number;
    speaker_id: string;
    speaker_type: SpeakerType;
}

/**
 * Defines the shape of the audio stream's state.
 */
interface AudioConversationState {
    /** Whether the audio is currently playing. */
    isPlaying: boolean;
    /** Whether the audio is currently buffering. */
    isBuffering: boolean;
    /** Array of sentences that make up the audio content. */
    sentences: ConversationSentence[];
    /** The current index of the sentence and word being played. */
    currentIndex: {
        sentence: number;
        word: number;
    };
    /** The current playback time of the audio. */
    currentTime: number;
    /** The total duration of the audio generated so far. */
    totalDuration: number;
    /** The time ranges of the audio that have been buffered. */
    buffered: TimeRanges | null;
    isRecording: boolean;
}

const initialState: AudioConversationState = {
    isPlaying: false,
    isBuffering: false,
    sentences: [],
    currentIndex: { sentence: -1, word: -1 },
    currentTime: 0,
    totalDuration: 0,
    buffered: null,
    isRecording: false,
};

type AudioConversationContextType = {
    /** Toggles the playback state of the audio. */
    togglePlayPause: () => void;
    /** Seeks to a specific time in the audio. */
    seek: (time: number) => void;
    /** The HTML audio element used for playback. */
    audioPlayer: HTMLAudioElement | null;
    startRecording: () => void;
    stopRecording: () => void;
} & AudioConversationState;

const AudioConversationContext = createContext<AudioConversationContextType | undefined>(undefined);

export const useAudioConversation = () => {
    const context = useContext(AudioConversationContext);
    if (!context) {
        throw new Error("useAudioConversation must be used within an AudioConversationProvider");
    }
    return context;
};

interface QueuedChunk {
    chunk: StreamingAudioChunkWithTimestampsResponse;
    sentenceIndices: number[];
}


export const AudioConversationProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<AudioConversationState>(initialState);
    const { messages, sendMessage } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/voice/elvenlabs/conversation-token',
        }),
    });

    // Refs for core audio components and state
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);

    // Refs for managing playback and fetching state
    const isSeekingRef = useRef(false);
    const chunkQueue = useRef<QueuedChunk[]>([]);
    const playWhenReadyRef = useRef(false);
    const isFetchingRef = useRef(false);
    const sentenceStatusRef = useRef<Map<string, 'fetched'>>(new Map());

    // Refs for recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.start();
            setState(prevState => ({ ...prevState, isRecording: true }));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                const formData = new FormData();
                formData.append("audio", audioBlob);

                const response = await fetch('/api/voice/elvenlabs/stt', {
                    method: 'POST',
                    body: formData,
                });

                const { text } = await response.json();

                if (text) {
                    const userSentence: ConversationSentence = {
                        id: `user_${Date.now()}`,
                        text,
                        words: [],
                        start: 0,
                        end: 0,
                        duration: 0,
                        speaker_id: 'user-1',
                        speaker_type: 'user',
                    };

                    setState(prevState => ({
                        ...prevState,
                        sentences: [...prevState.sentences, userSentence],
                        isRecording: false
                    }));

                    const newMessage: UIMessage = {
                        id: crypto.randomUUID(),
                        role: 'user',
                        parts: [{ type: 'text', text: text }],
                    };
                    sendMessage(newMessage);
                } else {
                    setState(prevState => ({ ...prevState, isRecording: false }));
                }
            };
        }
    };

    /**
     * Fetches audio for a batch of sentences and handles the streaming response.
     * @param sentences The full list of sentences for the audio content.
     */
    const fetchAndPlayAudio = async (sentences: ConversationSentence[]) => {
        if (isFetchingRef.current) {
            return;
        }

        // Identify sentences that have not been fetched yet and take a batch.
        const sentenceIndicesToFetch = state.sentences
            .map((s, index) => ({ id: s.id, index }))
            .filter(s => !sentenceStatusRef.current.has(s.id))
            .slice(0, BATCH_SIZE)
            .map(s => s.index);

        if (sentenceIndicesToFetch.length === 0) {
            return;
        }

        // Mark the selected sentences as 'fetched' to prevent re-fetching.
        sentenceIndicesToFetch.forEach(index => {
            const sentence = sentences[index];
            if (sentence) {
                sentenceStatusRef.current.set(sentence.id, 'fetched');
            }
        });

        isFetchingRef.current = true;

        setState(prevState => ({ ...prevState, isBuffering: true }));

        const textToFetch = sentenceIndicesToFetch.map(i => sentences[i]?.text).join(" ");

        const firstSentenceIndex = sentenceIndicesToFetch[0];
        const lastSentenceIndex = sentenceIndicesToFetch[sentenceIndicesToFetch.length - 1];

        // Provide context of previous and next sentences to the TTS API for better prosody.
        const previous_text = (firstSentenceIndex !== undefined && firstSentenceIndex > 0) ? sentences[firstSentenceIndex - 1]?.text : undefined;
        const next_text = (lastSentenceIndex !== undefined && lastSentenceIndex < sentences.length - 1) ? sentences[lastSentenceIndex + 1]?.text : undefined;

        const response = await fetch("/api/voice/elvenlabs/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: textToFetch,
                previous_text,
                next_text,
            }),
        });

        if (!response.body) {
            isFetchingRef.current = false;
            return;
        }
        const reader = response.body.getReader();
        let buffer = "";

        /**
         * Processes the streaming response from the server.
         * The stream is delimited by '<-s->' to separate JSON objects.
         */
        const processStream = async () => {
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (buffer.trim()) {
                        const finalParts = buffer.split('<-s->');
                        for (const part of finalParts) {
                            if (part) {
                                try {
                                    const parsed = JSON.parse(part) as StreamingAudioChunkWithTimestampsResponse;
                                    // Add the parsed chunk to the queue for processing.
                                    chunkQueue.current.push({ chunk: parsed, sentenceIndices: sentenceIndicesToFetch });
                                    processQueue();
                                } catch (e) {
                                }
                            }
                        }
                    }
                    setState(prevState => ({ ...prevState, isBuffering: false }));
                    isFetchingRef.current = false;
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('<-s->');

                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (part) {
                        try {
                            const parsed = JSON.parse(part) as StreamingAudioChunkWithTimestampsResponse;
                            // Add the parsed chunk to the queue for processing.
                            chunkQueue.current.push({ chunk: parsed, sentenceIndices: sentenceIndicesToFetch });
                            processQueue();
                        } catch (e) {
                        }
                    }
                }
                buffer = parts[parts.length - 1] ?? "";
            }
        };

        processStream();
    };

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            const newSentences: ConversationSentence[] = (lastMessage.parts.find(p => p.type === 'text')?.text ?? '')
                .split(/(?<=[.?!])\s+/)
                .filter(text => text.length > 0)
                .map((text, index) => ({
                    id: `assistant_${lastMessage.id}_${index}`,
                    text,
                    words: [],
                    start: 0,
                    end: 0,
                    duration: 0,
                    speaker_id: 'assistant-1',
                    speaker_type: 'assistant',
                }));

            if (newSentences.length > 0) {
                setState(prevState => {
                    const updatedSentences = [...prevState.sentences, ...newSentences];
                    fetchAndPlayAudio(updatedSentences);
                    return { ...prevState, sentences: updatedSentences };
                });
            }
        }
    }, [messages, fetchAndPlayAudio]);

    /**
     * Initializes the audio player and Media Source Extension.
     * This effect runs once on component mount.
     */
    useEffect(() => {
        const audioPlayer = new Audio();
        audioPlayerRef.current = audioPlayer;
        mediaSourceRef.current = new MediaSource();
        // The audio player's source is a URL created from the MediaSource instance.
        audioPlayer.src = URL.createObjectURL(mediaSourceRef.current);
        document.body.appendChild(audioPlayer); // Appending to body is required for some browsers to allow playback.

        const onSourceOpen = () => {
            if (!mediaSourceRef.current) return;
            try {
                // Create a SourceBuffer to handle the incoming audio data.
                const sourceBuffer = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
                sourceBufferRef.current = sourceBuffer;

                // When the source buffer is done updating, process the next chunk in the queue.
                sourceBuffer.addEventListener('updateend', () => {
                    processQueue();
                });

                // Start processing the queue if there are any chunks.
                processQueue();
            } catch (e) {
            }
        };

        mediaSourceRef.current.addEventListener('sourceopen', onSourceOpen);

        // Cleanup function to release resources.
        return () => {
            const player = audioPlayerRef.current;
            if (player && mediaSourceRef.current) {
                URL.revokeObjectURL(player.src);
            }
            if (player && document.body.contains(player)) {
                document.body.removeChild(player);
            }
        };
    }, []);

    /**
     * Processes the queue of audio chunks, appending them to the SourceBuffer
     * and updating the state with timing information.
     */
    const processQueue = useCallback(() => {
        const sourceBuffer = sourceBufferRef.current;
        // Do not process if the buffer is updating, or the queue is empty.
        if (!sourceBuffer || sourceBuffer.updating || chunkQueue.current.length === 0) {
            return;
        }

        const queuedItem = chunkQueue.current.shift();
        if (!queuedItem) return;

        const { chunk, sentenceIndices } = queuedItem;
        const { alignment } = chunk;

        // The audio data is base64 encoded, so it needs to be decoded.
        const audioData = Buffer.from(chunk.audioBase64, 'base64');
        // Calculate the time offset based on the current buffered content.
        const timeOffset = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;

        if (alignment) {
            const chunkWords: Omit<ConversationWord, 'speaker_id' | 'speaker_type'>[] = [];
            let currentWord = '';
            let wordStartTime = -1;

            // Parse the alignment data to construct words with their timings.
            alignment.characters.forEach((char, index) => {
                const startTime = alignment.characterStartTimesSeconds[index];
                const endTime = alignment.characterEndTimesSeconds[index];

                if (char.trim() !== '') {
                    if (currentWord.trim() === '') {
                        wordStartTime = startTime || 0;
                    }
                    currentWord += char;
                } else if (currentWord.trim() !== '') {
                    currentWord += char;
                }

                if ((char === ' ' || index === alignment.characters.length - 1) && currentWord.trim() !== '' && wordStartTime !== -1 && endTime !== undefined) {
                    const newWord = {
                        text: currentWord.trim(),
                        // Apply the time offset to the word's start and end times.
                        start: wordStartTime + timeOffset,
                        end: endTime + timeOffset,
                        duration: endTime - wordStartTime,
                    };
                    chunkWords.push(newWord);
                    currentWord = '';
                    wordStartTime = -1;
                }
            });

            setState(prevState => {
                const newSentences = [...prevState.sentences];
                let wordBufferIndex = 0;

                // Distribute the words from the chunk into their corresponding sentences.
                for (const sentenceIndex of sentenceIndices) {
                    const sentence = newSentences[sentenceIndex];
                    if (!sentence) continue;

                    const sentenceTextWords = sentence.text.split(' ').filter(Boolean);
                    const sentenceWords: ConversationWord[] = [];

                    // Match words from the chunk to the words in the sentence text.
                    for (let i = 0; i < sentenceTextWords.length; i++) {
                        if (wordBufferIndex < chunkWords.length) {
                            const word = chunkWords[wordBufferIndex];
                            if (word) {
                                sentenceWords.push({
                                    ...word,
                                    speaker_id: sentence.speaker_id,
                                    speaker_type: sentence.speaker_type,
                                });
                            }
                            wordBufferIndex++;
                        }
                    }

                    if (sentenceWords.length > 0) {
                        const sentenceStartTime = sentenceWords[0]?.start ?? 0;
                        const sentenceEndTime = sentenceWords[sentenceWords.length - 1]?.end ?? 0;
                        // Update the sentence with the new words and timing information.
                        newSentences[sentenceIndex] = {
                            ...sentence,
                            words: sentenceWords,
                            start: sentenceStartTime,
                            end: sentenceEndTime,
                            duration: sentenceEndTime - sentenceStartTime,
                        };
                    }
                }

                // Recalculate the total duration of the audio.
                const newTotalDuration = newSentences.reduce((acc, s) => acc + s.duration, 0);
                return { ...prevState, sentences: newSentences, totalDuration: newTotalDuration };
            });
        }

        try {
            // Append the audio data to the SourceBuffer.
            sourceBuffer.appendBuffer(audioData);
            // If playback was requested before data was available, start playing now.
            if (playWhenReadyRef.current && audioPlayerRef.current) {
                audioPlayerRef.current.play().catch(e => { });
                playWhenReadyRef.current = false;
            }
        } catch (e) {
            // If appending fails, re-queue the chunk to try again later.
            chunkQueue.current.unshift(queuedItem);
        }
    }, []);

    /**
     * Updates the current sentence and word index based on the audio player's current time.
     */
    useEffect(() => {
        const player = audioPlayerRef.current;
        if (!player) return;

        const onTimeUpdate = () => {
            setState(prevState => {
                const currentTime = player.currentTime;
                let sentenceIndex = -1;
                let wordIndex = -1;

                if (prevState.sentences) {
                    // Find the current sentence by checking if currentTime is within its start and end times.
                    for (let sIdx = 0; sIdx < prevState.sentences.length; sIdx++) {
                        const sentence = prevState.sentences[sIdx];
                        if (sentence && sentenceStatusRef.current.has(sentence.id) && currentTime >= sentence.start && currentTime <= sentence.end) {
                            sentenceIndex = sIdx;
                            // Find the current word within the current sentence.
                            for (let wIdx = 0; wIdx < sentence.words.length; wIdx++) {
                                const word = sentence.words[wIdx];
                                if (word && currentTime >= word.start && currentTime <= word.end) {
                                    wordIndex = wIdx;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }

                if (prevState.currentIndex.sentence !== sentenceIndex || prevState.currentIndex.word !== wordIndex) {
                    // This block can be used for side-effects when the current word/sentence changes.
                }

                return {
                    ...prevState,
                    currentTime,
                    buffered: player.buffered,
                    currentIndex: { sentence: sentenceIndex, word: wordIndex },
                };
            });
        };

        player.addEventListener('timeupdate', onTimeUpdate);

        return () => player.removeEventListener('timeupdate', onTimeUpdate);
    }, []);

    /**
     * Proactively fetches the next batch of audio when the buffered content is running low.
     */
    useEffect(() => {
        const player = audioPlayerRef.current;
        if (!player || !state.buffered || isFetchingRef.current) return;

        const bufferedEnd = state.buffered.length > 0 ? state.buffered.end(state.buffered.length - 1) : 0;
        // Fetch more audio if the remaining buffered time is less than 10 seconds.
        const shouldFetch = bufferedEnd - state.currentTime < 10;

        const allSentencesFetched = sentenceStatusRef.current.size === state.sentences.length;


        if (shouldFetch && !allSentencesFetched) {
            fetchAndPlayAudio(state.sentences);
        }
    }, [state.currentTime, state.buffered, fetchAndPlayAudio]);

    /**
     * Toggles the audio playback between play and pause.
     */
    const togglePlayPause = useCallback(() => {
        const player = audioPlayerRef.current;
        if (!player) return;

        if (state.isPlaying) {
            player.pause();
            setState(prevState => ({ ...prevState, isPlaying: false }));
        } else {
            setState(prevState => ({ ...prevState, isPlaying: true }));
            // If there's buffered content, play immediately.
            if (player.buffered.length > 0) {
                player.play().catch(() => { });
            } else {
                // If there's no buffered content, set a flag to play when ready and start fetching.
                playWhenReadyRef.current = true;
                fetchAndPlayAudio(state.sentences);
            }
        }
    }, [state.isPlaying, fetchAndPlayAudio]);

    /**
     * Seeks to a specific time in the audio stream.
     * @param time The time to seek to, in seconds.
     */
    const seek = (time: number) => {
        const player = audioPlayerRef.current;
        if (!player) return;
        player.currentTime = time;
    };

    const value = { ...state, togglePlayPause, seek, audioPlayer: audioPlayerRef.current, startRecording, stopRecording };

    return (
        <AudioConversationContext.Provider value={value}>
            {children}
        </AudioConversationContext.Provider>
    );
}; 