import { UseCaseWithFont, Font } from "@microfox/fontuse";
import { X } from "lucide-react";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "../ui/badge";

export interface ExpandedFontCardProps {
    usecase: UseCaseWithFont;
    onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ExpandedFontCard: React.FC<ExpandedFontCardProps> = ({
    usecase,
    onClose,
}) => {
    const [selectedPairing, setSelectedPairing] = useState<Font | null>(null);
    const [selectedLowerPairing, setSelectedLowerPairing] = useState<Font | null>(null);
    const [selectedUpperPairing, setSelectedUpperPairing] = useState<Font | null>(null);
    const { data: pairing_fonts, error } = useSWR<Font[]>(
        usecase.pairing ? `/api/test/fontuse?fonts=${[...usecase.pairing.pairing_lower, ...usecase.pairing.pairing_upper].join(",")}` : null,
        fetcher
    );

    const { upper_pairing_fonts, lower_pairing_fonts } = useMemo(() => {
        if (!pairing_fonts || !usecase.pairing) {
            return { upper_pairing_fonts: [], lower_pairing_fonts: [] };
        }
        const upper = pairing_fonts.filter(font => usecase.pairing.pairing_upper.includes(font.id));
        const lower = pairing_fonts.filter(font => usecase.pairing.pairing_lower.includes(font.id));
        return { upper_pairing_fonts: upper, lower_pairing_fonts: lower };
    }, [pairing_fonts, usecase.pairing]);

    const recommendedPairingType = useMemo(() => {
        if (!usecase.font || !usecase.font?.readabilityScore) {
            return null;
        }
        return usecase.font.readabilityScore < 4 ? "lower" : "upper";
    }, [usecase.font]);



    useEffect(() => {
        const fontsToLoad: Font[] = [];
        if (usecase.font) {
            fontsToLoad.push(usecase.font);
        }
        if (pairing_fonts) {
            fontsToLoad.push(...pairing_fonts);
        }

        const links: HTMLLinkElement[] = [];

        fontsToLoad.forEach(font => {
            if (!font || !font.name) return;

            const fontName = font.name.replace(/ /g, "+");
            const weights = font.fonts?.map(f => f.weight).filter(Boolean);
            const uniqueWeights = [...new Set(weights && weights.length > 0 ? weights : [400])];

            const familyQuery = `family=${fontName}`;
            const weightQuery = uniqueWeights.length > 0 ? `:wght@${uniqueWeights.join(";")}` : "";

            const googleFontUrl = `https://fonts.googleapis.com/css2?${familyQuery}${weightQuery}&display=swap`;

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = googleFontUrl;
            document.head.appendChild(link);
            links.push(link);
        });

        return () => {
            links.forEach(link => {
                document.head.removeChild(link);
            });
        };
    }, [usecase.font, pairing_fonts]);


    if (!usecase.font) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                >
                    <X size={24} />
                </button>
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2">
                        <h2 className="text-xl font-bold mb-4">{usecase.font.name}</h2>
                        <ul className="list-disc list-inside">
                            <li className="text-gray-600">
                                Design Score: {usecase.font.designScore}
                            </li>
                            <li className="text-gray-600">
                                Readability Score: {usecase.font.readabilityScore}
                            </li>
                            <li className="text-gray-600">
                                Popularity Score: {usecase.font.popularity}
                            </li>
                            <li className="text-gray-600">
                                All caps: {usecase.font?.properties?.allCaps ? "Yes" : "No"}
                            </li>
                        </ul>
                        {selectedLowerPairing && (
                            <div className="mt-8 p-4 border rounded-lg">
                                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                                    Selected Pairing
                                    {recommendedPairingType === "lower" && <Badge variant="outline">Prefer Lower</Badge>}
                                </h3>
                                <p className="text-3xl text-gray-600 mb-6 whitespace-pre-line gap-2"
                                    style={{ fontFamily: `"${selectedLowerPairing.name}", ${selectedLowerPairing.category?.toLowerCase()}` }}
                                >
                                    This is a test for
                                    <span className={`font-bold text-4xl`} style={{ fontFamily: `"${usecase.font.name}", ${usecase.font.category?.toLowerCase()}` }}> {usecase.font.name}</span>
                                </p>
                            </div>
                        )}
                        {selectedUpperPairing && (
                            <div className="mt-8 p-4 border rounded-lg">
                                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                                    Selected Pairing
                                    {recommendedPairingType === "upper" && <Badge variant="outline">Prefer Upper</Badge>}
                                </h3>
                                <p className="text-3xl text-gray-600 mb-6 whitespace-pre-line gap-2"
                                    style={{ fontFamily: `"${usecase.font.name}", ${usecase.font.category?.toLowerCase()}` }}
                                >
                                    This is a test for <span className="font-bold text-4xl" style={{ fontFamily: `"${selectedUpperPairing.name}", ${selectedUpperPairing.category?.toLowerCase()}` }}> {selectedUpperPairing.name}</span>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="md:w-1/2">
                        <Tabs defaultValue="upper">
                            <TabsList>
                                <TabsTrigger value="upper">Upper Pairings</TabsTrigger>
                                <TabsTrigger value="lower">Lower Pairings</TabsTrigger>
                                <TabsTrigger value="description">Description</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upper">
                                <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                                    {upper_pairing_fonts.map((pairing) => (
                                        <div key={pairing.id} className="border-t pt-4 cursor-pointer hover:bg-gray-100 p-2 rounded" onClick={() => setSelectedUpperPairing(pairing)}>
                                            <h4 className="text-xl font-medium" style={{ fontFamily: `"${pairing.name}"` }}>
                                                {pairing.name}
                                            </h4>
                                            <p className="text-md text-gray-500">{pairing.category}</p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="lower">
                                <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                                    {lower_pairing_fonts.map((pairing) => (
                                        <div key={pairing.id} className="border-t pt-4 cursor-pointer hover:bg-gray-100 p-2 rounded" onClick={() => setSelectedLowerPairing(pairing)}>
                                            <h4 className="text-xl font-medium" style={{ fontFamily: `"${pairing.name}"` }}>
                                                {pairing.name}
                                            </h4>
                                            <p className="text-md text-gray-500">{pairing.category}</p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="description">
                                <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                                    <div>
                                        <h3 className="font-bold">{usecase.title}</h3>
                                        <p>{usecase.description}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Tone and Feel</h3>
                                        <p>{usecase.toneAndFeelKeywords?.join(", ")}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Audience</h3>
                                        <p>{usecase.audienceKeywords?.join(", ")}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Industry</h3>
                                        <p>{usecase.industryKeywords?.join(", ")}</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpandedFontCard; 