'use client';
import React, { useRef } from 'react';
import { AtomData, MotionTransition } from '../primitives/types';
import { AtomRenderer } from '../primitives/AtomRenderer';
import { useFitText } from '../hooks/useFitText';

const FitTextSlot = ({ atomData, index }: { atomData: AtomData, index: number }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLElement>(null);
    const textStyle = useFitText({
        containerRef,
        textRef,
        strategy: 'fill-width',
    });

    const overrideTransition: MotionTransition = atomData.timing ?? {
        delay: 0.15 * index,
        duration: 0.25,
    };

    return (
        <div ref={containerRef} style={{ width: '100%', display: 'flex' }}>
            <AtomRenderer
                ref={textRef}
                data={atomData}
                overrideStyle={{ ...textStyle }}
                overrideTransition={overrideTransition}
            />
        </div>
    );
};

export const VerticalFillLayout = ({ content }: { content: AtomData[] }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '2em' }}>
            {content.map((atom, index) => (
                <FitTextSlot key={atom.id} atomData={atom} index={index} />
            ))}
        </div>
    );
}; 