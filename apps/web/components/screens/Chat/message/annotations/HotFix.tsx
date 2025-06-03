import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClientSecret } from "@prisma/client";
import { HelpCircle, Key, Plus, CheckCircle2, FileWarningIcon, EditIcon, ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActionButtons } from "./ActionButtons";
import { EnvVariablesDialog } from "../../configuration/EnvVariablesDialog";
import { Markdown } from "../markdown";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { MotionConfig } from "framer-motion";
import { ClientSecretVariable } from "@/server/types";
import { ClientSecretPackageType } from "@/server/types";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

interface HotFixesProps {
    uiAnnotation: UIAnnotation;
    idx: number;
}

export const HotFixes = ({ uiAnnotation, idx }: HotFixesProps) => {
    const annotation = uiAnnotation as any;
    const filesFixed = annotation.filesFixed;
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
    const [expandedTexts, setExpandedTexts] = useState<Record<string, boolean>>({});
    const textRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const toggleExpand = (filePath: string) => {
        setExpandedFiles(prev => ({
            ...prev,
            [filePath]: !prev[filePath]
        }));
    };

    const toggleTextExpand = (textId: string) => {
        setExpandedTexts(prev => ({
            ...prev,
            [textId]: !prev[textId]
        }));
    };

    const isTextTruncated = (element: HTMLDivElement | null | undefined) => {
        if (!element) return false;
        return element.scrollHeight > element.clientHeight;
    };

    return (
        <>
            <motion.div
                key={uiAnnotation.objectType + idx}
                className="flex flex-col gap-6 p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                <div className="">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {uiAnnotation.text}
                    </h3>
                </div>

                <div className="space-y-4">
                    {filesFixed?.map((file: any) => {
                        const isExpanded = expandedFiles[file.filePath];
                        return (
                            <div
                                key={file.filePath}
                                className="bg-gray-50 px-4 rounded-lg overflow-hidden py-2"
                            >
                                <div className="flex flex-col items-start gap-2 w-full">
                                    <div
                                        className="flex items-center justify-between w-full cursor-pointer"
                                        onClick={() => toggleExpand(file.filePath)}
                                    >
                                        <span className="font-medium text-gray-900 ">
                                            {file.filePath.split("/").pop()}
                                        </span>
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        </motion.div>
                                    </div>
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            height: isExpanded ? 'auto' : 0,
                                            opacity: isExpanded ? 1 : 0,
                                            marginTop: isExpanded ? '0.5rem' : 0,
                                            marginBottom: isExpanded ? '0.5rem' : 0,
                                        }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden w-full space-y-2"
                                    >
                                        <div className="w-full border-b border-gray-200 pb-2 mb-2"></div>
                                        {file.errorContext && (
                                            <div className="flex items-start justify-start gap-2">
                                                <FileWarningIcon className="w-4 h-4 min-w-4 min-h-4 mt-0.5" />
                                                <div className="flex flex-col gap-1 w-full">
                                                    <div
                                                        ref={el => {
                                                            textRefs.current[`error-${file.filePath}`] = el;
                                                        }}
                                                        className={cn(
                                                            "text-sm text-gray-500",
                                                            !expandedTexts[`error-${file.filePath}`] && "line-clamp-3"
                                                        )}
                                                    >
                                                        {file.errorContext}
                                                    </div>
                                                    {isTextTruncated(textRefs.current[`error-${file.filePath}`]) && (
                                                        <button
                                                            onClick={() => toggleTextExpand(`error-${file.filePath}`)}
                                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium self-start"
                                                        >
                                                            {expandedTexts[`error-${file.filePath}`] ? "Show Less" : "Read More"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {file.modification && (
                                            <div className="flex items-start justify-start gap-2">
                                                <EditIcon className="w-4 h-4 min-w-4 min-h-4 mt-0.5" />
                                                <div className="flex flex-col gap-1 w-full">
                                                    <div
                                                        ref={el => {
                                                            textRefs.current[`mod-${file.filePath}`] = el;
                                                        }}
                                                        className={cn(
                                                            "text-sm text-gray-500",
                                                            !expandedTexts[`mod-${file.filePath}`] && "line-clamp-3"
                                                        )}
                                                    >
                                                        {file.modification}
                                                    </div>
                                                    {isTextTruncated(textRefs.current[`mod-${file.filePath}`]) && (
                                                        <button
                                                            onClick={() => toggleTextExpand(`mod-${file.filePath}`)}
                                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium self-start"
                                                        >
                                                            {expandedTexts[`mod-${file.filePath}`] ? "Show Less" : "Read More"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <ActionButtons
                    buttons={uiAnnotation.buttons}
                />
            </motion.div>
        </>
    );
};
