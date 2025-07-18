import { ToolResultPart, ToolUIPart } from "ai"
import { Button } from "@/components/ui/button"
import { useMicrofoxChat } from "../../../MicrofoxChatProvider";
import { ToolMetadata } from "@microfox/tool-kit";
import { useHitl } from "./HitlProvider";
import { CheckIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import isEqual from 'lodash.isequal';
import { useChatUI } from "../../../ChatUiProvider";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export const AcceptHitl = ({ tool, lastMessage }: { tool: ToolUIPart<any>, lastMessage: boolean }) => {
    const { addHitlToolResult, mutateInput } = useHitl();
    const { scrollToBottom } = useChatUI();
    if (tool.state !== "output-available") {
        return null;
    }
    const toolMetadata = tool.output.metadata;

    const [expanded, setExpanded] = useState(false);
    const [showJson, setShowJson] = useState(false);

    const [jsonString, setJsonString] = useState(JSON.stringify(tool.input, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newJsonString = e.target.value;
        setJsonString(newJsonString);

        console.log("handleJsonChange", newJsonString, tool.input);
        try {
            const parsedJson = JSON.parse(newJsonString);
            setError(null);
            if (isEqual(parsedJson, tool.input)) {
                mutateInput(undefined);
            } else {
                mutateInput(parsedJson);
            }
        } catch (err: any) {
            setError("Invalid JSON: " + err.message);
            mutateInput(undefined);
        }
    }


    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl">
            <h4 className="text-lg font-bold">{toolMetadata?.summary}</h4>
            <div
                className={`text-sm text-gray-500 ${expanded ? "line-clamp-none" : "line-clamp-2"
                    }`}
            >
                {toolMetadata?.description}
            </div>
            {toolMetadata?.description?.length > 100 && (

                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-sm -mt-2 text-gray-400 hover:underline self-start"
                >
                    {expanded ? "Read less" : "Read more"}
                </button>

            )}
            {Object.keys(tool.input)?.length > 0 &&
                (showJson ? (
                    <div className="relative max-w-[380px] self-stretch">
                        <Textarea
                            value={jsonString}
                            onChange={handleJsonChange}
                            className={cn(
                                "font-mono bg-gray-100 p-2 max-w-full w-full max-h-[200px] overflow-y-auto rounded-xl text-xs whitespace-pre-wrap",
                                error && "border-red-500"
                            )}
                            rows={10}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full"
                            onClick={() => setShowJson(false)}
                        >
                            <XIcon className="w-3 h-3" />
                        </Button>
                    </div>
                ) : (
                    <div></div>
                ))}
            <div className="flex gap-2 pt-2 justify-end items-stretch">
                {!showJson && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setShowJson(true);
                            setTimeout(() => {
                                scrollToBottom();
                            }, 50);
                        }}
                        className="flex-1 h-full bg-neutral-100 hover:bg-neutral-200"
                    >
                        Show parameters
                    </Button>
                )}
                <Button
                    variant="outline"
                    className="h-full"
                    onClick={() => {
                        addHitlToolResult({
                            toolCallId: tool.toolCallId,
                            output: {
                                approved: false,
                            }
                        })
                    }}
                >
                    No
                </Button>
                <motion.div
                    className="rounded-md p-[3px]"
                >
                    <Button
                        variant="ghost"
                        className="bg-black hover:bg-black/70 hover:text-white px-4 text-white p-0"
                        onClick={() => {
                            addHitlToolResult({
                                toolCallId: tool.toolCallId,
                                output: {
                                    approved: true,
                                }
                            })
                        }}
                        disabled={!!error}
                    >
                        <CheckIcon className="w-3 h-3" />
                        <span className="text-sm">Yes</span>
                    </Button>
                </motion.div>
            </div>
        </div>
    )
}