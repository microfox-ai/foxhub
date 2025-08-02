// apps/web/hooks/use-font-loader.tsx

import { useState, createContext, useContext, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { Font, createGoogleFontUrl } from '@microfox/fontuse';

// 1. Define State and Context Type
interface FontLoaderState {
    fonts: Font[];
    loading: boolean;
    fontsReady: Record<string, boolean>;
    error: any;
}

const initialState: FontLoaderState = {
    fonts: [],
    loading: false,
    fontsReady: {},
    error: null,
};

type FontLoaderContextType = {
    loadFonts: (fontIds: string[]) => void;
    areFontsReady: (fontIds: string[]) => boolean;
} & FontLoaderState;

// 2. Create Context
const FontLoaderContext = createContext<FontLoaderContextType | undefined>(undefined);

// 3. Create Hook
export const useFontLoader = () => {
    const context = useContext(FontLoaderContext);
    if (!context) {
        throw new Error("useFontLoader must be used within a FontLoaderProvider");
    }
    return context;
};

// 4. Create Provider
const fetcher = (url: string) => fetch(url).then(res => res.json());

export const FontLoaderProvider = ({ children }: { children: React.ReactNode }) => {
    const [fontIds, setFontIds] = useState<string[]>([]);
    const [fontsReady, setFontsReady] = useState<Record<string, boolean>>({});

    const { data: fonts, error } = useSWR<Font[]>(
        fontIds.length > 0 ? `/api/test/fontuse?fonts=${fontIds.join(',')}` : null,
        fetcher
    );

    useEffect(() => {
        if (!fonts) {
            return;
        }

        const fontLinks: HTMLLinkElement[] = [];
        fonts.forEach(font => {
            const googleFontUrl = createGoogleFontUrl(font);
            if (googleFontUrl) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = googleFontUrl;
                document.head.appendChild(link);
                fontLinks.push(link);
            }
        });

        const checkFontsReady = async () => {
            if (!fonts || fonts.length === 0) {
                return;
            }

            await Promise.all(
                fonts.map(async (font) => {
                    if (fontsReady[font.id]) {
                        return;
                    }
                    try {
                        await document.fonts.load(`1em "${(font as any).family}"`);
                        setFontsReady(prev => ({ ...prev, [font.id]: true }));
                    } catch (e) {
                        console.error(`Failed to load font: ${(font as any).family}`, e);
                        setFontsReady(prev => ({ ...prev, [font.id]: false })); // Consider a different state for error
                    }
                })
            );
        };

        checkFontsReady();

        return () => {
            fontLinks.forEach(link => {
                document.head.removeChild(link);
            });
        };
    }, [fonts]);

    const loadFonts = useCallback((newFontIds: string[]) => {
        const uniqueFontIds = [...new Set(newFontIds)];

        setFontsReady(prev => {
            const newState = { ...prev };
            let needsUpdate = false;
            uniqueFontIds.forEach(id => {
                if (!(id in newState)) {
                    newState[id] = false;
                    needsUpdate = true;
                }
            });
            return needsUpdate ? newState : prev;
        });

        setFontIds(currentIds => {
            const currentIdSet = new Set(currentIds);
            const newIdsToAdd = uniqueFontIds.filter(id => !currentIdSet.has(id));
            if (newIdsToAdd.length > 0) {
                return [...currentIds, ...newIdsToAdd];
            }
            return currentIds;
        });
    }, []);

    const areFontsReady = useCallback((requiredFontIds: string[]) => {
        if (requiredFontIds.length === 0) {
            return true;
        }
        return requiredFontIds.every(id => fontsReady[id]);
    }, [fontsReady]);

    const value = {
        fonts: fonts || [],
        loading: !fonts && !error && fontIds.length > 0,
        fontsReady,
        error,
        loadFonts,
        areFontsReady,
    };

    return (
        <FontLoaderContext.Provider value={value}>
            {children}
        </FontLoaderContext.Provider>
    );
};