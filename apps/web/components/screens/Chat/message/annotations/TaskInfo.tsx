import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FileText, Target, TextQuote } from "lucide-react";
import { useState } from "react";
import { ActionButtons } from "./ActionButtons";
import { Markdown } from "../markdown";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

interface TaskInfoProps {
    uiAnnotation: UIAnnotation;
    idx: number;
}

export const TaskInfo = ({
    uiAnnotation,
    idx,
}: TaskInfoProps) => {
    const object = uiAnnotation.object;
    const [isExpanded, setIsExpanded] = useState(false);

    const getIconForKey = (key: string) => {
        switch (key.toLowerCase()) {
            case "goal":
                return <Target className="w-5 h-5 opacity-50 mt-1 text-blue-500" />;
            case "name":
                return (
                    <TextQuote className="w-5 h-5 opacity-50 mt-1 text-purple-500" />
                );
            case "summary":
                return <FileText className="w-5 h-5 opacity-50 mt-1 text-green-500" />;
            default:
                return null;
        }
    };

    return (
        <motion.div
            key={uiAnnotation.objectType + idx}
            className="flex flex-col gap-4 p-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <h3 className="text-lg uppercase font-bold tracking-wider text-gray-700 border-b pb-2">
                {object.name}
            </h3>
            <div className="space-y-4">
                {Object.keys(object).map((key: string) => {
                    const icon = getIconForKey(key);
                    if (key === "name") {
                        return null;
                    }
                    return (
                        <div key={key} className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                                {icon}
                                <span className="font-semibold text-base tracking-wide text-gray-700 capitalize">
                                    {key}
                                </span>
                            </div>
                            {key === "summary" ? (
                                <div className="flex flex-col gap-1" style={{
                                    fontFamily: "inherit",
                                    fontSize: "14px"
                                }}>
                                    {isExpanded ?
                                        (< div className="pl-7 text-sm text-gray-600 ">
                                            <Markdown>
                                                {object[key]}
                                            </Markdown></div>) : (
                                            <span className="tracking-base pl-7 text-sm text-gray-600 line-clamp-2">
                                                {object[key]}
                                            </span>
                                        )}
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="pl-7 text-left text-sm text-blue-500 hover:text-blue-700 font-medium"
                                    >
                                        {isExpanded ? "Show less" : "Show more"}
                                    </button>
                                </div>
                            ) : (
                                <span className="tracking-base pl-7 text-sm text-gray-600">
                                    {object[key]}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <ActionButtons buttons={uiAnnotation.buttons} />
        </motion.div >
    );
}; 