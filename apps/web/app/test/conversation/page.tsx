'use client';

import { AudioConversationProvider, useAudioConversation } from "@/hooks/use-audio-conversation";

const ConversationTest = () => {
    const { startRecording, stopRecording, isRecording, sentences, currentIndex, isPlaying, togglePlayPause } = useAudioConversation();

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Conversational AI Test</h1>
            <button onClick={isRecording ? stopRecording : startRecording} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button onClick={togglePlayPause} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginLeft: '10px' }} disabled={sentences.length === 0}>
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div style={{ marginTop: '20px' }}>
                <h2>Transcript</h2>
                <div>
                    {sentences.map((sentence, sIdx) => (
                        <p key={sentence.id} style={{ marginBottom: '10px', color: sIdx === currentIndex.sentence ? 'blue' : 'black' }}>
                            <strong>{sentence.speaker_type === 'user' ? 'You: ' : 'Assistant: '}</strong>
                            {sentence.words.map((word, wIdx) => (
                                <span key={`${sentence.id}_${wIdx}`} style={{ backgroundColor: sIdx === currentIndex.sentence && wIdx === currentIndex.word ? 'yellow' : 'transparent' }}>
                                    {word.text}{' '}
                                </span>
                            ))}
                            {sentence.words.length === 0 && sentence.text}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ConversationPage = () => {
    return (
        <AudioConversationProvider>
            <ConversationTest />
        </AudioConversationProvider>
    );
}

export default ConversationPage; 