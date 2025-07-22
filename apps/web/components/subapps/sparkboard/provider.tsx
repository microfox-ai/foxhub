"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { debounce } from "lodash";
import { createAgentClient } from "@/lib/agent-client";
import { paths } from "./sparkboard";
import useQueryState from "@/components/screens/hooks/useQueryState";
import { mapSearchResults } from "./mappers/searchResults";
import useLocalState from "@/components/screens/hooks/useLocalState";

export type IndexingSession = {
    id: string;
    name: string;
    createdAt: number;
};

export type Tab = "search" | "index" | "admin";
export type IndexingLimit = 50 | 500 | 1000 | 5000 | 10000;
export type TopK = 50 | 100 | 150 | 200;


const agentName = "sparkboard";
const searchImageToolName = "searchStocksearchImages";
const DEBOUNCE_DELAY = 300; // 300ms delay

// Create a single, reusable client instance for the sparkboard agent.
const sparkboardClient = createAgentClient<paths>(agentName);


function useSparkboardContextInternal() {
    const [searchQuery, setSearchQuery] = useQueryState("query", "");
    const [searchKeywords, setSearchKeywords] = useQueryState("keyword", "");
    const [artStyle, setArtStyle] = useQueryState("artStyle", "");
    const [audienceKeywords, setAudienceKeywords] = useQueryState("audienceKeyword", "");
    const [activeTab, setActiveTab] = useState<Tab>("search");
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    const [indexingUrls, setIndexingUrls] = useState<string[]>([]);
    const [indexingLimit, setIndexingLimit] = useState<IndexingLimit>(50);
    const [topK, setTopK] = useState<TopK>(50);
    const [indexingSessions, setIndexingSessions] = useLocalState<IndexingSession[]>("sparkboard_indexing_sessions", []);
    const [activeIndexingId, setActiveIndexingId] = useState<string | null>(null);
    const [availableKeywords, setAvailableKeywords] = useState<Set<string>>(new Set());
    const [availableArtStyles, setAvailableArtStyles] = useState<Set<string>>(new Set());
    const [availableAudienceKeywords, setAvailableAudienceKeywords] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!activeIndexingId && indexingSessions.length > 0) {
            setActiveIndexingId(indexingSessions?.[indexingSessions.length - 1]?.id ?? null);
        }
    }, [indexingSessions, activeIndexingId]);

    // Create a stable debounced function using useRef and useEffect
    const debouncedSetQuery = useRef(
        debounce((value: string) => {
            setDebouncedQuery(value);
        }, DEBOUNCE_DELAY)
    ).current;

    // Update debounced value when searchQuery changes
    useEffect(() => {
        debouncedSetQuery(searchQuery);
        // Cleanup on unmount
        return () => {
            debouncedSetQuery.cancel();
        };
    }, [searchQuery, debouncedSetQuery]);

    const { data: searchResults, isLoading: isSearchLoading, error: searchError, mutate: mutateSearchResults } = useSWR(
        debouncedQuery && activeTab === "search" ? [`${agentName}/${searchImageToolName}`, debouncedQuery] : null,
        async ([, query]) => {
            console.log("search", query);
            const { data, error } = await sparkboardClient.GET("/search/images", {
                params: {
                    query: {
                        query: query,
                        topK: 50,
                        ...(searchKeywords && searchKeywords.length > 0 && { keywords: searchKeywords }),
                        ...(artStyle && artStyle.length > 0 && { artStyle: artStyle }),
                        ...(audienceKeywords && audienceKeywords.length > 0 && { audienceKeywords: audienceKeywords }),
                    }
                }
            });

            if (error) {
                throw new Error(String(error) || "An unknown API error occurred.");
            }
            if (data.success && data.data?.results) {
                // Extract keywords, art styles, and audience keywords from search results
                const keywords = new Set<string>();
                const artStyles = new Set<string>();
                const audienceKws = new Set<string>();

                data.data.results.forEach((result) => {
                    // Extract keywords
                    if (result.metadata?.keywords && Array.isArray(result.metadata.keywords)) {
                        result.metadata.keywords.forEach((keyword: string) => {
                            if (typeof keyword === 'string') {
                                keywords.add(keyword.trim());
                            }
                        });
                    }
                    // Extract art styles
                    if (result.metadata?.artStyle && Array.isArray(result.metadata.artStyle)) {
                        result.metadata.artStyle.forEach((style: string) => {
                            if (typeof style === 'string') {
                                artStyles.add(style.trim());
                            }
                        });
                    }
                    // Extract audience keywords
                    if (result.metadata?.audienceKeywords && Array.isArray(result.metadata.audienceKeywords)) {
                        result.metadata.audienceKeywords.forEach((audience: string) => {
                            if (typeof audience === 'string') {
                                audienceKws.add(audience.trim());
                            }
                        });
                    }
                });

                setAvailableKeywords(keywords);
                setAvailableArtStyles(artStyles);
                setAvailableAudienceKeywords(audienceKws);
                return mapSearchResults(data.data);
            }
            return [];
        }
    );

    const triggerIndex = useCallback(async () => {
        if (indexingUrls.length === 0) return;

        const { data, error } = await sparkboardClient.POST("/images/trigger", {
            body: {
                siteLinks: indexingUrls,
                indexingLimit: indexingLimit,
            },
        });

        if (error) {
            console.error(error);
            // Optionally, handle the error in the UI
            return;
        }

        if (data?.indexingId) {
            const newSession: IndexingSession = {
                id: data.indexingId,
                name: `Session ${new Date().toLocaleString()}`,
                createdAt: Date.now()
            };
            setIndexingSessions(prev => [...prev, newSession]);
            setActiveIndexingId(newSession.id);
            return newSession.id;
        }
    }, [indexingUrls, indexingLimit, setIndexingSessions]);

    const { data: indexingStatus, isLoading: isIndexingStatusLoading, mutate: refreshIndexingStatus } = useSWR(
        (activeIndexingId && activeTab === "index") ? [`${agentName}/images/index`, activeIndexingId] : null,
        async ([, id]) => {
            const { data, error } = await sparkboardClient.GET("/images/index", {
                params: {
                    query: {
                        indexingId: id,
                        topK: topK,
                    },
                },
            });

            if (error) {
                throw new Error(String(error) || "An unknown API error occurred.");
            }

            if (data.success) {
                return {
                    progressData: data.data?.indexing,
                    progress: data.data?.indexing?.progress,
                    results: mapSearchResults(data.data),
                };
            }
            return null;
        },
        {
            refreshInterval: (latestData) => {
                // Stop refreshing if indexing is complete
                if (latestData?.progressData?.isFullyIndexed) {
                    return 0;
                }
                return 10000; // Refresh every 10 seconds
            },
        }
    );

    return {
        searchQuery,
        setSearchQuery,
        results: searchResults,
        isLoading: isSearchLoading,
        error: searchError,
        activeTab,
        setActiveTab,
        indexingUrls,
        setIndexingUrls,
        indexingLimit,
        setIndexingLimit,
        topK,
        setTopK,
        triggerIndex,
        indexingStatus,
        isIndexingStatusLoading,
        refreshIndexingStatus,
        indexingSessions,
        activeIndexingId,
        setActiveIndexingId,
        searchKeywords,
        artStyle,
        audienceKeywords,
        setSearchKeywords,
        setArtStyle,
        setAudienceKeywords,
        availableKeywords,
        availableArtStyles,
        availableAudienceKeywords,
        mutateSearchResults,
    };
}

const SparkboardContext = createContext<ReturnType<typeof useSparkboardContextInternal> | undefined>(undefined);

export function SparkboardProvider({ children }: { children: ReactNode }) {
    const context = useSparkboardContextInternal();
    return (
        <SparkboardContext.Provider value={context}>
            {children}
        </SparkboardContext.Provider>
    );
}

export function useSparkboard() {
    const context = useContext(SparkboardContext);
    if (context === undefined) {
        throw new Error("useSparkboard must be used within a SparkboardProvider");
    }
    return context;
}
