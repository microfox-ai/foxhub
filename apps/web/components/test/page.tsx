"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import debounce from "lodash/debounce";
import dynamic from "next/dynamic";
import { Font, UseCaseWithFont } from "@microfox/fontuse";

const ExpandedFontCard = dynamic(() => import("./ExpandedFontCard"), {
    loading: () => <FontCardSkeleton />,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const FontCardSkeleton = () => (
    <div className="p-4 border rounded-lg shadow-md animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-5 bg-gray-300 rounded w-full mb-4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
    </div>
);

const DynamicFontCard = dynamic(() => import("./FontCard"), {
    loading: () => <FontCardSkeleton />,
});

export default function TestFontUsePage() {
    const [usecase, setUsecase] = useState("");
    const [debouncedUsecase, setDebouncedUsecase] = useState("");
    const [selectedFont, setSelectedFont] = useState<UseCaseWithFont | null>(
        null
    );

    const debouncedSetUsecase = useCallback(
        debounce((value: string) => {
            setDebouncedUsecase(value);
        }, 500),
        []
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsecase(e.target.value);
        debouncedSetUsecase(e.target.value);
    };

    const { data: fonts, error } = useSWR<UseCaseWithFont[]>(
        debouncedUsecase ? `/api/test/fontuse?usecase=${debouncedUsecase}&topK=10` : null,
        fetcher
    );

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4">Find the perfect font</h1>
            <input
                type="text"
                value={usecase}
                onChange={handleInputChange}
                placeholder="e.g., 'modern logo for a tech startup'"
                className="w-full p-2 border rounded-lg mb-8"
            />
            {error && <div className="text-red-500">Failed to load fonts.</div>}
            {!fonts && debouncedUsecase && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(5)].map((_, i) => <FontCardSkeleton key={i} />)}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fonts?.map((font) => (
                    <div key={font.id} onClick={() => setSelectedFont(font)}>
                        <DynamicFontCard usecase={font} />
                    </div>
                ))}
            </div>
            {selectedFont && (
                <ExpandedFontCard
                    usecase={selectedFont}
                    onClose={() => setSelectedFont(null)}
                />
            )}
        </div>
    );
}