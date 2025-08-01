// apps/web/hooks/use-font-loader.tsx

import { useState, createContext, useContext, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { Font, createGoogleFontUrl } from '@microfox/fontuse';

// 1. Define State and Context Type
interface FontLoaderState {
    fonts: Font[];
    loading: boolean;
    fontsReady: boolean;
    error: any;
}

const initialState: FontLoaderState = {
    fonts: [],
    loading: false,
    fontsReady: false,
    error: null,
};

type FontLoaderContextType = {
    loadFonts: (fontIds: string[]) => void;
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
    const [fontsReady, setFontsReady] = useState(false);
    // fontsReady is wrong, not jsut bolean, use soemthing based on the fontIds, as we want to know if a particular font is laoded or not, also only render frame if the related fonts are loaded

    const { data: fonts, error } = useSWR<Font[]>(
        fontIds.length > 0 ? `/api/test/fontuse?fonts=${fontIds.join(',')}` : null,
        fetcher
    );

    useEffect(() => {
        if (!fonts) {
            if (fontIds.length === 0) {
                setFontsReady(true);
            }
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
                setFontsReady(true);
                return;
            }
            try {
                await Promise.all(fonts.map(font => document.fonts.load(`1em "${(font as any).family}"`)));
                setFontsReady(true);
            } catch (e) {
                console.error("Failed to load fonts, proceeding with rendering.", e);
                setFontsReady(true);
            }
        };

        checkFontsReady();

        return () => {
            fontLinks.forEach(link => {
                document.head.removeChild(link);
            });
            setFontsReady(false);
        };
    }, [fonts, fontIds.length]);

    const loadFonts = useCallback((newFontIds: string[]) => {
        const uniqueFontIds = [...new Set(newFontIds)];
        if (uniqueFontIds.length > 0) {
            setFontsReady(false);
            setFontIds(uniqueFontIds);
        }
    }, []);

    const value = {
        fonts: fonts || [],
        loading: !fonts && !error && fontIds.length > 0,
        fontsReady,
        error,
        loadFonts,
    };

    return (
        <FontLoaderContext.Provider value={value}>
            {children}
        </FontLoaderContext.Provider>
    );
};