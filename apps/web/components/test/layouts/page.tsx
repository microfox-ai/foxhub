
'use client';
import React, { useEffect } from 'react';
import { Frame } from '@/components/test/layouts/dynamic-typography/layouts/Frame';
import { LayoutInstance } from '@/components/test/layouts/dynamic-typography/primitives/types';
import { AtomData } from '@/components/test/layouts/dynamic-typography/primitives/types';
import { AudioStreamProvider, useAudioStream } from '@/hooks/use-audio-stream';
import { story } from './data/story';
import { FontLoaderProvider, useFontLoader } from '@/hooks/use-font-loader';

const leftContent: AtomData[] = [
    {
        id: 'left1',
        text: 'high lord',
        component: 'cool-glow',
        style: {
            color: 'white',
            fontFamily: "Bebas Neue, sans-serif", fontSize: '3rem', textTransform: 'uppercase'
        },
        timing: {
            delay: 0.15,
            duration: 0.25,
        }
    },
    {
        id: 'left2',
        text: 'maximus',
        component: 'cool-glow',
        style: {
            color: 'white',
            fontFamily: "Caesar Dressing, display", fontSize: '3rem', textTransform: 'uppercase'
        },
        timing: {
            delay: 0.3,
            duration: 0.5,
        }
    },
    {
        id: 'left3',
        text: 'has returned.',
        component: 'cool-glow',
        style: {
            color: 'white',
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: '3rem', textTransform: 'uppercase'
        },
        timing: {
            delay: 0.45,
            duration: 0.75,
        }
    },

];

const centerContent: AtomData[] = [
    { id: 'center1', text: 'Center', component: 'default', style: { color: 'yellow', fontSize: '4rem' } },
    { id: 'center2', text: 'Stage', component: 'default', style: { color: 'yellow', fontSize: '4rem' } },
];

const stackedContent: AtomData[] = [
    { id: 'stack1', text: 'Overlay', component: 'cool-glow', style: { color: 'cyan', fontSize: '2rem' } },
];

const layouts: LayoutInstance[] = [
    {
        id: 'left-layout',
        layoutId: 'vertical-fill',
        content: leftContent,
        constraints: {
            alignment: 'center',
            minWidth: '50%',
            minHeight: '50%',
        },
        style: {
            padding: '50px',
        },
        placement: { x: 0, y: 0, width: 0, height: 0 }
    },
];

const stackedLayouts: LayoutInstance[] = [
    {
        id: 'stacked-layout',
        layoutId: 'vertical-fill',
        content: stackedContent,
        constraints: {
            alignment: 'bottom-right',
            minWidth: '25%',
            minHeight: '20%',
        },
        style: {
            backgroundColor: 'rgba(0, 0, 255, 0.2)',
        },
        placement: { x: 0, y: 0, width: 0, height: 0 }
    },
];

const AudioPlayerUI = () => {
    const { playStory, isPlaying, currentSentence } = useAudioStream();
    return (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px' }}>
            <button onClick={playStory} disabled={isPlaying} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                {isPlaying ? 'Playing...' : 'Play Story'}
            </button>
            {isPlaying && currentSentence > -1 && (
                <div style={{ marginTop: '1rem' }}>
                    <p>Playing sentence: {currentSentence + 1} / {story.splitStory.length}</p>
                    <p>{story.splitStory[currentSentence]}</p>
                </div>
            )}
        </div>
    );
};

const PlayerEngine = () => {
    const { loadFonts, fonts, loading, error, fontsReady } = useFontLoader();

    useEffect(() => {
        const getFontIdsFromLayouts = (layoutInstances: LayoutInstance[]): string[] => {
            const fontFamilies = new Set<string>();
            layoutInstances.forEach(layout => {
                layout.content.forEach(atom => {
                    if (atom.style?.fontFamily) {
                        const primaryFont = atom.style.fontFamily.split(',')[0].trim();
                        const fontId = primaryFont.toLowerCase().replace(/\s+/g, '_');
                        fontFamilies.add(fontId);
                    }
                });
            });
            return Array.from(fontFamilies);
        };

        const fontIds = getFontIdsFromLayouts(layouts);
        const stackedFontIds = getFontIdsFromLayouts(stackedLayouts);
        const allFontIds = [...new Set([...fontIds, ...stackedFontIds])];

        if (allFontIds.length > 0) {
            loadFonts(allFontIds);
        }
    }, [loadFonts]);

    return (
        <div style={{ height: '100vh', width: '100vw', backgroundColor: '#111' }}>
            <AudioPlayerUI />
            {fontsReady ? (
                <Frame
                    layouts={layouts}
                    stackedLayouts={stackedLayouts}
                    className="w-full h-full"
                />
            ) : (
                <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    Loading fonts...
                </div>
            )}
        </div>
    )
}


export const DynamicLayoutPage = () => {
    return (
        <AudioStreamProvider>
            <FontLoaderProvider>
                <PlayerEngine />
            </FontLoaderProvider>
        </AudioStreamProvider>
    );
};
