"use client";

import { useEffect } from "react";
import { SparkboardProvider } from "./provider";
import SparkBoardHeader from "./components/header";
import SparkBoardGrid from "./components/grid";
import DisplayContent from "./components/displayContent";

const agentName = "sparkboard";
const toolNames = [""];

export default function SparkBoardMainPage() {
    return (
        <SparkboardProvider>
            <div className="flex flex-col h-screen bg-gray-50">
                <SparkBoardHeader />
                <main className="flex-1 overflow-y-auto p-4">
                    <DisplayContent />
                </main>
            </div>
        </SparkboardProvider>
    );
}


// 1. Header Search Bar (with both Search & Filters along with Indexing as a tab)
// 2. MediaGrid
// 3. DialogOpen

