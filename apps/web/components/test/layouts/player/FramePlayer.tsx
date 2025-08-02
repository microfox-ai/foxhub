
'use client';
import { Frame } from '@/components/test/layouts/dynamic-typography/layouts/Frame';
import { LayoutConstraints, LayoutInstance } from '@/components/test/layouts/dynamic-typography/primitives/types';
import { useFontLoader } from '@/hooks/use-font-loader';
import { useEffect, useMemo, useState } from 'react';
import { AudioPlayerUI } from './AudioPlayer';
import { useAudioStream } from '@/hooks/use-audio-stream';
import { generateLayout } from '../dynamic-typography/layouts/layout-generators';

const fixedConstraints: LayoutConstraints = {
    alignment: 'center',
    minWidth: '20%',
    minHeight: '50%',
};

export const FramePlayer = () => {
    const { loadFonts, areFontsReady, fonts } = useFontLoader();
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

    const [layoutStyles] = useState<string[]>(["vertical-fill"]);
    const [atomStyles] = useState<string[]>(["cool-glow", "default"]);
    const [fontsWithPairing] = useState<{ id: string; pairing: string }[]>([
        { id: "caesar_dressing", pairing: "bebas_neue" },
        //{ id: "bebas_neue", pairing: "caesar_dressing" },
    ]);

    const allFonts = useMemo(() => {
        return [...new Set(fontsWithPairing.flatMap(font => [font.id, font.pairing]))];
    }, [fontsWithPairing]);

    useEffect(() => {
        if (allFonts.length > 0) {
            loadFonts(allFonts);
        }
    }, [allFonts, loadFonts]);

    const layoutQueue = useMemo(() => {
        const fontPairingKeys: any = fontsWithPairing[Math.floor(Math.random() * fontsWithPairing.length)];
        const fontPairing = {
            main: fonts.find(font => font.id === fontPairingKeys?.id) ?? fonts[0],
            sub: fonts.find(font => font.id === fontPairingKeys?.pairing) ?? fonts[0],
        }
        if (!fontPairing.main || !fontPairing.sub) {
            return [];
        }
        return sentences
            .map(sentence => generateLayout(sentence, layoutStyles, fontPairing as any, atomStyles, fixedConstraints))
            .filter((layout): layout is LayoutInstance => layout !== null);
    }, [sentences, layoutStyles, fontsWithPairing, atomStyles]);

    const activeLayout = useMemo(() => {
        if (currentIndex.sentence >= 0 && layoutQueue[currentIndex.sentence]) {
            return layoutQueue[currentIndex.sentence];
        }
        return null;
    }, [currentIndex.sentence, layoutQueue]);

    return (
        <div style={{ height: '100vh', width: '100vw', backgroundColor: '#111' }}>
            <AudioPlayerUI />
            {areFontsReady(allFonts) ? (
                activeLayout ? (
                    <Frame
                        layouts={[activeLayout]}
                        stackedLayouts={[]}
                        className="w-full h-full"
                    />
                ) : (
                    <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        Waiting for sentence...
                    </div>
                )
            ) : (
                <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    Loading fonts...
                </div>
            )}
        </div>
    )
}