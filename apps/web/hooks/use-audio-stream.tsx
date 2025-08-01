import { useState, createContext, useContext, useCallback, useEffect } from "react";
import { story } from "@/components/test/layouts/data/story";

interface AudioStreamState {
    isPlaying: boolean;
    currentSentence: number;
    alignments: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
    }[];
    normalized_alignments: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
    }[];
}

const initialState: AudioStreamState = {
    isPlaying: false,
    currentSentence: -1,
    alignments: [],
    normalized_alignments: [],
};

type AudioStreamContextType = {
    playStory: () => void;
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

export const AudioStreamProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<AudioStreamState>(initialState);
    const [audioQueue, setAudioQueue] = useState<string[]>([]);
    const [audioPlayer] = useState(new Audio());

    const fetchAndQueueAudio = useCallback(async (sentenceIndex: number) => {
        console.log(`[AudioStream] Fetching audio for sentence ${sentenceIndex}`);
        if (sentenceIndex >= story.splitStory.length) {
            console.log("[AudioStream] Reached end of story.");
            setState(prevState => ({ ...prevState, isPlaying: false }));
            return;
        }

        const text = story.splitStory[sentenceIndex];
        const previous_text = sentenceIndex > 0 ? story.splitStory[sentenceIndex - 1] : undefined;
        const next_text = sentenceIndex < story.splitStory.length - 1 ? story.splitStory[sentenceIndex + 1] : undefined;

        console.log(`[AudioStream] Requesting TTS for: "${text}"`);
        const response = await fetch("/api/voice/elvenlabs/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, previous_text, next_text }),
        });

        console.log(`[AudioStream] Response status: ${response.status}`);
        if (!response.body) {
            console.error("[AudioStream] Response body is null.");
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("[AudioStream] Stream finished.");
                break;
            }

            const decodedChunk = decoder.decode(value, { stream: true });
            console.log("[AudioStream] Received stream chunk:", decodedChunk);
            accumulatedData += decodedChunk;

            try {
                const jsonObjects = accumulatedData.split('}').filter(s => s.trim()).map(s => s + '}');
                console.log("[AudioStream] Potential JSON objects:", jsonObjects);
                accumulatedData = "";

                for (const jsonObjStr of jsonObjects) {
                    try {
                        console.log("[AudioStream] Trying to parse:", jsonObjStr);
                        const chunk = JSON.parse(jsonObjStr);
                        console.log("[AudioStream] Parsed chunk:", chunk);
                        if (chunk.audio_base64) {
                            console.log("[AudioStream] Queuing audio data.");
                            const audioSrc = `data:audio/mpeg;base64,${chunk.audio_base64}`;
                            setAudioQueue(prev => [...prev, audioSrc]);
                        }
                        if (chunk.alignment) {
                            console.log("[AudioStream] Received alignment data.");
                            setState(prevState => ({ ...prevState, alignments: [...prevState.alignments, chunk.alignment], normalized_alignments: [...prevState.normalized_alignments, chunk.normalized_alignment] }));
                        }
                    } catch (e) {
                        console.warn("[AudioStream] Incomplete JSON object, accumulating:", jsonObjStr);
                        accumulatedData = jsonObjStr;
                    }
                }

            } catch (error) {
                console.error("Error processing stream", error, "Accumulated data:", accumulatedData);
            }
        }
    }, []);

    const playNextInQueue = useCallback(() => {
        console.log(`[AudioStream] playNextInQueue called. Queue length: ${audioQueue.length}`);
        if (audioQueue.length > 0) {
            const nextAudio = audioQueue[0];
            setAudioQueue(prev => prev.slice(1));
            if (nextAudio) {
                console.log("[AudioStream] Playing next audio from queue.");
                audioPlayer.src = nextAudio;
                audioPlayer.play().catch(e => console.error("[AudioStream] Audio playback failed", e));
            }
        } else {
            console.log("[AudioStream] Audio queue empty.");
            if (state.currentSentence < story.splitStory.length - 1) {
                const nextSentence = state.currentSentence + 1;
                console.log(`[AudioStream] Fetching next sentence: ${nextSentence}`);
                setState(prevState => ({ ...prevState, currentSentence: nextSentence, isPlaying: true }));
                fetchAndQueueAudio(nextSentence);
            } else {
                console.log("[AudioStream] End of story reached in playNextInQueue.");
                setState(prevState => ({ ...prevState, isPlaying: false, currentSentence: -1 }));
            }
        }
    }, [audioQueue, audioPlayer, fetchAndQueueAudio, state.currentSentence]);

    useEffect(() => {
        console.log(`[AudioStream] useEffect triggered. Audio queue length: ${audioQueue.length}, Player paused: ${audioPlayer.paused}`);
        if (audioQueue.length > 0 && audioPlayer.paused) {
            console.log("[AudioStream] Calling playNextInQueue from useEffect.");
            playNextInQueue();
        }
    }, [audioQueue, audioPlayer, playNextInQueue]);

    audioPlayer.onended = () => {
        console.log("[AudioStream] Audio ended, playing next in queue.");
        playNextInQueue();
    };

    const playStory = useCallback(() => {
        console.log("[AudioStream] playStory called.");
        if (!state.isPlaying) {
            // Attempt to play and immediately pause.
            // This is a workaround for some browsers that restrict autoplay.
            // By initiating play() within the user gesture event, we "unlock" the audio element.
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audioPlayer.pause();
                    console.log("[AudioStream] Audio player unlocked.");
                }).catch(error => {
                    console.log("[AudioStream] Audio player unlock failed, playback might not work.", error);
                });
            }

            console.log("[AudioStream] Starting story playback.");
            setState({ isPlaying: true, currentSentence: 0, alignments: [], normalized_alignments: [] });
            setAudioQueue([]);
            fetchAndQueueAudio(0);
        } else {
            console.log("[AudioStream] Story is already playing.");
        }
    }, [state.isPlaying, fetchAndQueueAudio, audioPlayer]);


    const value = { ...state, playStory, audioPlayer };

    return (
        <AudioStreamContext.Provider value={value}>
            {children}
        </AudioStreamContext.Provider>
    );
}; 