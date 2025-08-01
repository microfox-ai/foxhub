'use client';
import React, { useRef, useState, useLayoutEffect } from 'react';
import { ResizeObserver } from '@juggle/resize-observer';
import { BaseLayoutProps } from '../primitives/types';
import { AtomRenderer } from '../primitives/AtomRenderer';
import { useSentenceLayout } from '../hooks/useSentenceLayout';
import { Sentence } from '@/hooks/use-audio-stream';
import { FontPairing } from '../primitives/font-primitives';

// This component now requires the raw sentence and font data
interface VerticalFillLayoutProps extends BaseLayoutProps {
}

export const VerticalFillLayout = ({ sentence, fontPairing, atomStyles }: VerticalFillLayoutProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const atoms = useSentenceLayout({
        sentence,
        fontPairing,
        containerWidth: size.width,
        containerHeight: size.height,
        atomStyles: atomStyles ?? [],
    });

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
            {atoms.map((atom) => (
                <AtomRenderer key={atom.id} data={atom} />
            ))}
        </div>
    );
}; 