import { useState, createContext, useContext, useCallback, useEffect, useRef } from "react";
import { story } from "@/components/test/layouts/data/story";
import { StreamingAudioChunkWithTimestampsResponse } from "@elevenlabs/elevenlabs-js/api/types/StreamingAudioChunkWithTimestampsResponse";

const BATCH_SIZE = 5;

export interface Word {
    text: string;
    start: number;
    end: number;
    duration: number;
}

export interface Sentence {
    id: string;
    text: string;
    words: Word[];
    start: number;
    end: number;
    duration: number;
}

interface AudioStreamState {
    isPlaying: boolean;
    isBuffering: boolean;
    sentences: Sentence[];
    currentIndex: {
        sentence: number;
        word: number;
    };
    currentTime: number;
    totalDuration: number;
    buffered: TimeRanges | null;
}

const initialState: AudioStreamState = {
    isPlaying: false,
    isBuffering: false,
    sentences: story.splitStory.map((text, index) => ({
        id: `sentence_${index}`,
        text,
        words: [],
        start: 0,
        end: 0,
        duration: 0,
    })),
    currentIndex: { sentence: -1, word: -1 },
    currentTime: 0,
    totalDuration: 0,
    buffered: null,
};

type AudioStreamContextType = {
    togglePlayPause: () => void;
    seek: (time: number) => void;
    audioPlayer: HTMLAudioElement | null;
} & AudioStreamState;

const AudioStreamContext = createContext<AudioStreamContextType | undefined>(undefined);

export const useAudioStream = () => {
    const context = useContext(AudioStreamContext);
    if (!context) {
        throw new Error("useAudioStream must be used within an AudioStreamProvider");
    }
    return context;
};

interface QueuedChunk {
    chunk: StreamingAudioChunkWithTimestampsResponse;
    sentenceIndices: number[];
}

export const AudioStreamProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<AudioStreamState>(initialState);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const isSeekingRef = useRef(false);
    const chunkQueue = useRef<QueuedChunk[]>([]);
    const playWhenReadyRef = useRef(false);
    const isFetchingRef = useRef(false);
    const sentenceStatusRef = useRef<Map<string, 'fetched'>>(new Map());

    const fetchAndPlayAudio = async (sentences: Sentence[]) => {
        if (isFetchingRef.current) {
            return;
        }

        const sentenceIndicesToFetch = sentences
            .map((s, index) => ({ id: s.id, index }))
            .filter(s => !sentenceStatusRef.current.has(s.id))
            .slice(0, BATCH_SIZE)
            .map(s => s.index);

        if (sentenceIndicesToFetch.length === 0) {
            return;
        }

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
        const audioPlayer = new Audio();
        audioPlayerRef.current = audioPlayer;
        mediaSourceRef.current = new MediaSource();
        audioPlayer.src = URL.createObjectURL(mediaSourceRef.current);
        document.body.appendChild(audioPlayer);

        const onSourceOpen = () => {
            if (!mediaSourceRef.current) return;
            try {
                const sourceBuffer = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
                sourceBufferRef.current = sourceBuffer;

                sourceBuffer.addEventListener('updateend', () => {
                    processQueue();
                });

                processQueue();
            } catch (e) {
            }
        };

        mediaSourceRef.current.addEventListener('sourceopen', onSourceOpen);

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

    const processQueue = useCallback(() => {
        const sourceBuffer = sourceBufferRef.current;
        if (!sourceBuffer || sourceBuffer.updating || chunkQueue.current.length === 0) {
            return;
        }

        const queuedItem = chunkQueue.current.shift();
        if (!queuedItem) return;

        const { chunk, sentenceIndices } = queuedItem;
        const { alignment } = chunk;

        const audioData = Buffer.from(chunk.audioBase64, 'base64');
        const timeOffset = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;

        if (alignment) {
            const chunkWords: Word[] = [];
            let currentWord = '';
            let wordStartTime = -1;

            alignment.characters.forEach((char, index) => {
                const startTime = alignment.characterStartTimesSeconds[index];
                const endTime = alignment.characterEndTimesSeconds[index];

                if (currentWord === '' && startTime !== undefined) {
                    wordStartTime = startTime;
                }
                currentWord += char;

                if ((char === ' ' || index === alignment.characters.length - 1) && currentWord.trim() !== '' && wordStartTime !== -1 && endTime !== undefined) {
                    const newWord = {
                        text: currentWord.trim(),
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

                for (const sentenceIndex of sentenceIndices) {
                    const sentence = newSentences[sentenceIndex];
                    if (!sentence) continue;

                    const sentenceTextWords = sentence.text.split(' ').filter(Boolean);
                    const sentenceWords: Word[] = [];

                    for (let i = 0; i < sentenceTextWords.length; i++) {
                        if (wordBufferIndex < chunkWords.length) {
                            const word = chunkWords[wordBufferIndex];
                            if (word) {
                                sentenceWords.push(word);
                            }
                            wordBufferIndex++;
                        }
                    }

                    if (sentenceWords.length > 0) {
                        const sentenceStartTime = sentenceWords[0]?.start ?? 0;
                        const sentenceEndTime = sentenceWords[sentenceWords.length - 1]?.end ?? 0;
                        newSentences[sentenceIndex] = {
                            ...sentence,
                            words: sentenceWords,
                            start: sentenceStartTime,
                            end: sentenceEndTime,
                            duration: sentenceEndTime - sentenceStartTime,
                        };
                    }
                }

                const newTotalDuration = newSentences.reduce((acc, s) => acc + s.duration, 0);
                return { ...prevState, sentences: newSentences, totalDuration: newTotalDuration };
            });
        }

        try {
            sourceBuffer.appendBuffer(audioData);
            if (playWhenReadyRef.current && audioPlayerRef.current) {
                audioPlayerRef.current.play().catch(e => { });
                playWhenReadyRef.current = false;
            }
        } catch (e) {
            chunkQueue.current.unshift(queuedItem);
        }
    }, []);

    useEffect(() => {
        const player = audioPlayerRef.current;
        if (!player) return;

        const onTimeUpdate = () => {
            setState(prevState => {
                const currentTime = player.currentTime;
                let sentenceIndex = -1;
                let wordIndex = -1;

                if (prevState.sentences) {
                    for (let sIdx = 0; sIdx < prevState.sentences.length; sIdx++) {
                        const sentence = prevState.sentences[sIdx];
                        if (sentence && sentenceStatusRef.current.has(sentence.id) && currentTime >= sentence.start && currentTime <= sentence.end) {
                            sentenceIndex = sIdx;
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

    useEffect(() => {
        const player = audioPlayerRef.current;
        if (!player || !state.buffered || isFetchingRef.current) return;

        const bufferedEnd = state.buffered.length > 0 ? state.buffered.end(state.buffered.length - 1) : 0;
        const shouldFetch = bufferedEnd - state.currentTime < 10;

        const allSentencesFetched = sentenceStatusRef.current.size === state.sentences.length;


        if (shouldFetch && !allSentencesFetched) {
            fetchAndPlayAudio(state.sentences);
        }
    }, [state.currentTime, state.buffered, state.sentences, fetchAndPlayAudio]);

    const togglePlayPause = useCallback(() => {
        const player = audioPlayerRef.current;
        if (!player) return;

        if (state.isPlaying) {
            player.pause();
            setState(prevState => ({ ...prevState, isPlaying: false }));
        } else {
            setState(prevState => ({ ...prevState, isPlaying: true }));
            if (player.buffered.length > 0) {
                player.play().catch(() => { });
            } else {
                playWhenReadyRef.current = true;
                fetchAndPlayAudio(state.sentences);
            }
        }
    }, [state.isPlaying, state.sentences, fetchAndPlayAudio]);

    const seek = (time: number) => {
        const player = audioPlayerRef.current;
        if (!player) return;
        player.currentTime = time;
    };

    const value = { ...state, togglePlayPause, seek, audioPlayer: audioPlayerRef.current };

    return (
        <AudioStreamContext.Provider value={value}>
            {children}
        </AudioStreamContext.Provider>
    );
}; 