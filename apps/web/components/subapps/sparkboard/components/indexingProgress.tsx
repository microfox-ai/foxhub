"use client";

import { useSparkboard } from "../provider";
import { MediaGrid } from "@/components/screens/Chat/message/uiTool/hitl_output/common/media";
import { RefreshCw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import SessionSidebar from "./sessionSidebar";

export default function IndexingProgress() {
    const { indexingStatus, isIndexingStatusLoading, refreshIndexingStatus, activeIndexingId } = useSparkboard();
    const [showIndexingMessage, setShowIndexingMessage] = useState(false);

    const progress = indexingStatus?.progress;
    const results = indexingStatus?.results || [];

    const percentage = progress && progress > 0 ? (progress / 100) * 100 : 0;

    useEffect(() => {
        if (activeIndexingId) {
            setShowIndexingMessage(false);
        }
    }, [activeIndexingId]);

    return (
        <div className="flex flex-grow h-screen">
            <SessionSidebar />
            <div className="p-4 flex-grow">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Indexing Progress</h2>
                    <motion.button
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => refreshIndexingStatus()}
                        className="p-2 rounded-full hover:bg-gray-100"
                        disabled={isIndexingStatusLoading}
                    >
                        <RefreshCw className={`h-5 w-5 text-gray-600 ${isIndexingStatusLoading ? "animate-spin" : ""}`} />
                    </motion.button>
                </div>

                <AnimatePresence mode="wait">
                    {isIndexingStatusLoading && !indexingStatus && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center justify-center p-8 space-y-4"
                        >
                            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                            <p className="text-gray-600">Loading status...</p>
                        </motion.div>
                    )}

                    {showIndexingMessage && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center text-gray-500 p-8 border rounded-lg bg-white shadow-sm"
                        >
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-4"
                            >
                                Indexing has started and may take some time. You can safely close this window and check back later.
                            </motion.p>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                Your indexing session has been saved.
                            </motion.p>
                        </motion.div>
                    )}

                    {!showIndexingMessage && progress !== undefined && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 bg-white p-6 rounded-lg shadow-sm border"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <motion.span
                                    className="text-sm font-medium text-gray-700"
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {indexingStatus?.progressData?.isFullyIndexed ? "Completed" : "In Progress"}
                                </motion.span>
                                <motion.span
                                    className="text-sm font-medium text-gray-700"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {indexingStatus?.progressData?.itemsRemaining} remaining of {indexingStatus?.progressData?.totalItemsToIndex}
                                </motion.span>
                            </div>
                            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-red-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                            </div>
                            {indexingStatus?.progressData?.isFullyIndexed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-4 text-center text-neutral-300 font-medium"
                                >
                                    Indexing completed successfully!
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {!showIndexingMessage && results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <MediaGrid images={results} />
                        </motion.div>
                    )}

                    {!isIndexingStatusLoading && progress === undefined && !activeIndexingId && !showIndexingMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-gray-500 p-8 border rounded-lg bg-white shadow-sm"
                        >
                            Enter URLs and click "Index" to start.
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
} 