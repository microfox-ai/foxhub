'use client';

import { useEffect, useMemo } from "react";
import { Font, getRecommendedPairing, UseCaseWithFont } from "@microfox/fontuse";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const createGoogleFontUrl = (font: Font | null | undefined): string | null => {
    if (!font?.name) return null;

    const fontName = font.name.replace(/ /g, "+");

    if (!font.fonts || font.fonts.length === 0) {
        return `https://fonts.googleapis.com/css2?family=${fontName}:wght@400&display=swap`;
    }

    const hasItalic = font.fonts.some(f => f.style === 'italic');

    if (!hasItalic) {
        const weights = [...new Set(font.fonts.map(f => f.weight).filter(Boolean))];
        if (weights.length === 0) weights.push(400);
        return `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weights.join(';')}&display=swap`;
    }

    // Has italics. Format is family=Name:ital,wght@ital_val,weight;...
    const weightPairs = new Set<string>();
    font.fonts.forEach(f => {
        const weight = f.weight || 400;
        if (f.style === 'italic') {
            weightPairs.add(`1,${weight}`);
        } else { // normal or undefined style
            weightPairs.add(`0,${weight}`);
        }
    });

    if (weightPairs.size > 0) {
        return `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@${Array.from(weightPairs).join(';')}&display=swap`;
    }

    // Fallback
    return `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
};


const FontCard = ({ usecase }: { usecase: UseCaseWithFont }) => {
    if (!usecase || !usecase?.font) {
        return null;
    }
    const fontName = usecase.font?.name;

    useEffect(() => {
        const googleFontUrl = createGoogleFontUrl(usecase.font);
        if (!googleFontUrl) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = googleFontUrl;
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, [usecase.font]);

    const recommendedPairing = getRecommendedPairing(usecase);
    const { data: pairing_fonts, error } = useSWR<Font[]>(
        recommendedPairing?.pairingFont ? `/api/test/fontuse?fonts=${recommendedPairing.pairingFont}` : null,
        fetcher
    );

    const pairingFontData = (recommendedPairing?.pairingFont && pairing_fonts && pairing_fonts.length > 0) ? pairing_fonts[0] : null;

    useEffect(() => {
        if (pairingFontData) {
            const googleFontUrl = createGoogleFontUrl(pairingFontData);
            if (!googleFontUrl) return;

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = googleFontUrl;
            document.head.appendChild(link);
            return () => {
                document.head.removeChild(link);
            };
        }
    }, [pairingFontData]);

    if (!pairingFontData) {
        return null;
    }

    console.log(pairingFontData);
    return (
        <div className="p-4 cursor-pointer hover:bg-gray-100 border rounded-lg shadow-md" style={{ fontFamily: `'${fontName}', ${usecase.font?.category?.toLowerCase()}` }}>
            <h2 className="text-xl font-bold">{fontName}</h2>
            <p className="text-lg">The quick brown
                {pairingFontData && <span className="font-bold text-2xl" style={{ fontFamily: `"${pairingFontData?.name}", ${pairingFontData?.category?.toLowerCase()}` }}>
                    {" "}fox{" "}
                </span>}
                jumps over the lazy dog.</p>
            <p className="text-xs text-gray-500 lowercase">{usecase.font?.category}</p>
        </div>
    );
};

export default FontCard; 