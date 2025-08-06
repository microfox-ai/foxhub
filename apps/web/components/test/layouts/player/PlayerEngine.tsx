
'use client';
import { AtomData, LayoutInstance } from '@/components/test/layouts/dynamic-typography/primitives/types';
import { AudioPlayerUI } from './AudioPlayer';
import { FramePlayer } from './FramePlayer';
// import { ConversationPlayerUI } from './ConversationPlayer';

export const PlayerEngine = () => {


    return (
        <div style={{ height: '100vh', width: '100vw', backgroundColor: '#111' }}>
            {/* <AudioPlayerUI /> */}
            {/* <ConversationPlayerUI /> */}
            <FramePlayer />
        </div>
    )
}
