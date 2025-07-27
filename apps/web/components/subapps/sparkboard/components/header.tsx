"use client";

import { useState, memo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Tab, useSparkboard, IndexingLimit, TopK, SearchTopK } from "../provider";
import { Search, Sliders, Link2, ImagePlus, Settings, ChevronDown, Tags, Palette, Users, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { KeywordSelect } from "./KeywordSelect";
import { ArtStyleSelect } from "./ArtStyleSelect";
import { AudienceKeywordSelect } from "./AudienceKeywordSelect";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface TabConfig {
    label: string;
    icon: React.ReactNode;
}

const TABS: Record<Tab, TabConfig> = {
    search: {
        label: "Search",
        icon: <Search className="h-4 w-4 min-w-4 min-h-4" />
    },
    index: {
        label: "Index",
        icon: <ImagePlus className="h-4 w-4 min-w-4 min-h-4" />
    },
    admin: {
        label: "Admin",
        icon: <Settings className="h-4 w-4 min-w-4 min-h-4" />
    }
};

// Memoized TabButton component
const TabButton = memo(({ tab, isActive, onClick }: { tab: Tab; isActive: boolean; onClick: () => void }) => {
    const config = TABS[tab];

    return (
        <motion.button
            layout
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`px-4 py-2 text-sm rounded-full transition-all flex items-center gap-2 ${isActive
                ? "bg-red-600 text-white min-w-[100px] justify-center"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 w-10 justify-center"
                }`}
        >
            {config.icon}
            <AnimatePresence mode="popLayout">
                {isActive && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                    >
                        {config.label}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
});

TabButton.displayName = "TabButton";

const indexingLimitOptions: IndexingLimit[] = [50, 500, 1000, 5000, 10000];
const topKOptions: TopK[] = [50, 100, 150, 200];
const searchTopKOptions: SearchTopK[] = [25, 50, 100, 200];

function IndexingLimitDropdown({
    value,
    onChange,
}: {
    value: IndexingLimit;
    onChange: (value: IndexingLimit) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-red-500"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {value} Images
                    <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                </button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    >
                        <div className="py-1">
                            {indexingLimitOptions.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {option} Images
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TopKDropdown({
    value,
    onChange,
}: {
    value: TopK;
    onChange: (value: TopK) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-red-500"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    Show {value} Results
                    <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                </button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    >
                        <div className="py-1">
                            {topKOptions.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Show {option} Results
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function SearchTopKDropdown({
    value,
    onChange,
}: {
    value: SearchTopK;
    onChange: (value: SearchTopK) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className="inline-flex justify-center items-center rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-red-500"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    Show {value}
                    <ChevronDown className="-mr-1 ml-2 h-4 w-4" aria-hidden="true" />
                </button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    >
                        <div className="py-1">
                            {searchTopKOptions.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Show {option}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SparkBoardHeader() {
    const {
        setSearchQuery,
        activeTab,
        setActiveTab,
        setIndexingUrls,
        indexingLimit,
        setIndexingLimit,
        topK,
        setTopK,
        searchTopK,
        setSearchTopK,
        triggerIndex,
        searchKeywords,
        artStyle,
        audienceKeywords,
        setSearchKeywords,
        setArtStyle,
        setAudienceKeywords,
    } = useSparkboard();
    const [searchInput, setSearchInput] = useState("");
    const [indexInput, setIndexInput] = useState("");
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const filterButton = document.getElementById('filter-button');
            const filterPanel = document.getElementById('filter-panel');

            if (filterButton && filterPanel &&
                !filterButton.contains(event.target as Node) &&
                !filterPanel.contains(event.target as Node)) {
                // setShowFilters(false); // This state is removed
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const parsedSearchKeywords = [searchKeywords];
    const parsedArtStyle = [artStyle];
    const parsedAudienceKeywords = [audienceKeywords];

    // Parse string values into arrays

    useEffect(() => {
        if (searchParams.get("query")) {
            setSearchInput(searchParams.get("query") || "");
        }
    }, [searchParams]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === "search") {
            setSearchQuery(searchInput);
        } else if (activeTab === "index") {
            const urls = indexInput.split("\n").filter(Boolean);
            setIndexingUrls(urls);
            const indexingId = await triggerIndex();
            if (indexingId) {
                setIndexInput(""); // Clear input after successful indexing start
            }
        }
    };

    useEffect(() => {
        if (activeTab === "index") {
            const urls = indexInput.split("\n").filter(Boolean);
            setIndexingUrls(urls);
        }
    }, [indexInput, activeTab, setIndexingUrls]);

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 bg-white shadow-sm px-4 py-2"
        >
            <div className="mx-auto flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex-shrink-0"
                    >
                        <Image
                            src="/logo/sparkboard.svg"
                            alt="SparkBoard"
                            width={40}
                            height={40}
                            className="h-10 w-auto"
                        />
                    </motion.div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 pl-6 flex-1">
                        <TabButton
                            tab="search"
                            isActive={activeTab === "search"}
                            onClick={() => setActiveTab("search")}
                        />
                        <TabButton
                            tab="index"
                            isActive={activeTab === "index"}
                            onClick={() => setActiveTab("index")}
                        />
                        {user?.isAdmin && (
                            <TabButton
                                tab="admin"
                                isActive={activeTab === "admin"}
                                onClick={() => setActiveTab("admin")}
                            />
                        )}

                        {/* Search/Index Input Section */}
                        <AnimatePresence mode="wait">
                            <motion.form
                                key={activeTab}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onSubmit={handleSearch}
                                className="max-w-2xl w-full mr-auto"
                            >
                                <div className="relative">
                                    <input
                                        type={activeTab === "index" ? "textarea" : "text"}
                                        value={activeTab === "search" ? searchInput : indexInput}
                                        onChange={(e) =>
                                            activeTab === "search"
                                                ? setSearchInput(e.target.value)
                                                : setIndexInput(e.target.value)
                                        }
                                        placeholder={
                                            activeTab === "search"
                                                ? "Search for images..."
                                                : "Enter URLs to index (one per line)"
                                        }
                                        className={`w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 
                                            focus:border-red-500 focus:ring-1 focus:ring-red-500 
                                            focus:outline-none transition-colors
                                            ${activeTab === "index" ? "font-mono text-sm" : ""}`}
                                        {...(activeTab === "index" && { as: "textarea" })}
                                    />
                                    {activeTab === "search" ? (
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    ) : (
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    )}

                                    {/* Add Filter Button in Search Bar */}
                                    {activeTab === "search" && (
                                        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${isFiltersOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setIsFiltersOpen(!isFiltersOpen);
                                                    }}
                                                >
                                                    <Sliders className={`h-4 w-4 ${isFiltersOpen ? 'text-red-600' : 'text-gray-400'}`} />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-80 p-4"
                                                align="end"
                                                side="bottom"
                                            >
                                                <div className="space-y-4">
                                                    <h3 className="text-xs text-gray-900 uppercase tracking-[0.5em] mb-4">Filters</h3>

                                                    {/* Search Keywords Filter */}
                                                    <div className="space-y-2 flex flex-row items-center justify-between gap-2">
                                                        <p className="flex items-center gap-2 font-medium text-gray-700">
                                                            <Tags className="h-4 w-4" />
                                                            <span>Keywords</span>
                                                        </p>
                                                        <KeywordSelect />
                                                    </div>

                                                    {/* Art Style Filter */}
                                                    <div className="space-y-2 flex flex-row items-center justify-between gap-2">
                                                        <p className="flex items-center gap-2 font-medium text-gray-700">
                                                            <Palette className="h-4 w-4" />
                                                            <span>Art Style</span>
                                                        </p>
                                                        <ArtStyleSelect />
                                                    </div>

                                                    {/* Audience Keywords Filter */}
                                                    <div className="space-y-2 flex flex-row items-center justify-between gap-2">
                                                        <p className="flex items-center gap-2 font-medium text-gray-700">
                                                            <Users className="h-4 w-4" />
                                                            <span>Audience</span>
                                                        </p>
                                                        <AudienceKeywordSelect />
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                            </motion.form>
                        </AnimatePresence>
                    </div>

                    {/* Filters Button */}
                    <div className="flex items-center gap-2">
                        {activeTab === 'index' && user?.isAdmin && (
                            <>
                                <IndexingLimitDropdown value={indexingLimit} onChange={setIndexingLimit} />
                                <TopKDropdown value={topK as TopK} onChange={setTopK} />
                            </>
                        )}
                        {activeTab === 'search' && (
                            <>
                                <SearchTopKDropdown value={searchTopK} onChange={setSearchTopK} />
                                <div className="flex items-center gap-2">
                                    {searchKeywords && (
                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-2 rounded-md flex items-center gap-1">
                                            #{searchKeywords}
                                            <button
                                                onClick={() => setSearchKeywords("")}
                                                className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    )}
                                    {artStyle && (
                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-2 rounded-md flex items-center gap-1">
                                            @{artStyle}
                                            <button
                                                onClick={() => setArtStyle("")}
                                                className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    )}
                                    {audienceKeywords && (
                                        <span className="text-xs bg-gray-100 px-2 py-2 rounded flex items-center gap-1">
                                            !{audienceKeywords}
                                            <button
                                                onClick={() => setAudienceKeywords("")}
                                                className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
