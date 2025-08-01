import { useAudioStream } from "@/hooks/use-audio-stream";


export const AudioPlayerUI = () => {
    const {
        isPlaying,
        isBuffering,
        totalDuration,
        sentences,
        togglePlayPause,
        seek,
        currentIndex,
        currentTime,
        buffered,
    } = useAudioStream();

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(event.target.value);
        seek(time);
    };

    const currentSentence = currentIndex.sentence > -1 ? sentences[currentIndex.sentence] : null;

    return (
        <div style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            color: 'white',
            background: 'rgba(0,0,0,0.7)',
            padding: '1rem',
            borderRadius: '12px',
            width: '80%',
            maxWidth: '600px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={togglePlayPause}
                    style={{
                        background: 'transparent',
                        border: '2px solid white',
                        color: 'white',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: '1.5rem'
                    }}
                >
                    {isPlaying ? '❚❚' : '▶'}
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{formatTime(currentTime)}</span>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="range"
                            min="0"
                            max={totalDuration || 1}
                            value={currentTime}
                            onChange={handleSeek}
                            style={{
                                width: '100%',
                                cursor: 'pointer',
                                accentColor: '#1DB954',
                                background: 'transparent',
                                position: 'relative',
                                zIndex: 1,
                            }}
                            disabled={!totalDuration}
                        />
                        {totalDuration > 0 && buffered && (
                            <progress
                                max={totalDuration}
                                value={buffered.length > 0 ? buffered.end(buffered.length - 1) : 0}
                                style={{
                                    width: '100%',
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    height: '5px',
                                    pointerEvents: 'none',
                                    appearance: 'none',
                                    zIndex: 0,
                                }}
                            />
                        )}
                    </div>
                    <span>{totalDuration > 0 ? formatTime(totalDuration) : '--:--'}</span>
                </div>
            </div>
            {isBuffering && <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>Buffering...</p>}
            {currentSentence && (
                <div style={{ marginTop: '1rem', textAlign: 'center', opacity: 0.8, fontSize: '1.2rem', minHeight: '1.5em' }}>
                    <p>
                        {currentSentence.words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                style={{
                                    color: wordIndex === currentIndex.word ? '#1DB954' : 'white',
                                    fontWeight: wordIndex === currentIndex.word ? 'bold' : 'normal',
                                    transition: 'color 0.2s, font-weight 0.2s',
                                    display: 'inline-block',
                                    padding: '0 2px',
                                }}
                            >
                                {word.text}
                            </span>
                        ))}
                    </p>
                </div>
            )}
        </div>
    );
};