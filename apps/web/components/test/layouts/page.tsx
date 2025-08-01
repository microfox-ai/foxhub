
'use client';
import { AudioStreamProvider } from '@/hooks/use-audio-stream';
import { FontLoaderProvider } from '@/hooks/use-font-loader';
import { PlayerEngine } from './player/PlayerEngine';

export const DynamicLayoutPage = () => {
    return (
        <AudioStreamProvider>
            <FontLoaderProvider>
                <PlayerEngine />
            </FontLoaderProvider>
        </AudioStreamProvider>
    );
};

export default DynamicLayoutPage;
