"use client";

import { useSparkboard } from "../provider";
import { MediaGrid } from "@/components/screens/Chat/message/uiTool/hitl_output/common/media";
import IndexingProgress from "./indexingProgress";

export default function DisplayContent() {
    const { activeTab, results, isLoading, error, indexingStatus } = useSparkboard();

    if (activeTab === "search") {
        if (isLoading) return <div className="text-center p-8">Loading...</div>;
        if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;
        if (!results || results.length === 0) return <div className="text-center p-8">No results found.</div>;
        return <MediaGrid images={results} />;
    }

    if (activeTab === "index") {
        return <IndexingProgress />;
    }

    if (activeTab === "admin") {
        return <div className="text-center p-8">Admin Panel</div>;
    }

    return null;
} 