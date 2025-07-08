import { ToolResultPart, ToolUIPart } from "ai"
import { Button } from "@/components/ui/button"
import { useMicrofoxChat } from "../../../MicrofoxChatProvider";
import { ToolMetadata } from "@microfox/tool-kit";
import { useHitl } from "./HitlProvider";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";

export const AcceptHitl = ({ tool, lastMessage }: { tool: ToolUIPart<any>, lastMessage: boolean }) => {
    const { messages } = useMicrofoxChat();
    const { addHitlToolResult } = useHitl();
    if (tool.state !== "output-available") {
        return null;
    }
    const toolMetadata = tool.output.metadata;
    const lastMessageInChat = messages[messages.length - 1];

    const [expanded, setExpanded] = useState(false);
    const [showJson, setShowJson] = useState(true);
    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl">
            <h4 className="text-lg font-bold">{toolMetadata?.summary}</h4>
            <div
                className={`text-sm text-gray-500 ${expanded ? "line-clamp-none" : "line-clamp-2"
                    }`}
            >
                {toolMetadata?.description}
            </div>
            <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm -mt-2 text-gray-400 hover:underline self-start"
            >
                {expanded ? "Read less" : "Read more"}
            </button>
            {/* <div className="text-sm text-gray-500">
                So, can i call the tool {Object.keys(tool.input)?.length > 0 ? "with the below args?" : "?"}
            </div> */}
            {Object.keys(tool.input)?.length > 0 &&
                (showJson ? (
                    <div className="relative">
                        <pre className="font-mono bg-gray-100 p-2 rounded-xl text-xs overflow-x-auto">
                            {JSON.stringify(tool.input, null, 2)}
                        </pre>
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowJson(true)}
                    >
                        Show parameters
                    </Button>
                ))}
            <div className="flex gap-2 pt-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        addHitlToolResult({
                            toolCallId: tool.toolCallId,
                            output: {
                                approved: false,
                            }
                        })
                    }}
                >
                    <XIcon className="w-4 h-4" />
                    No
                </Button>
                <Button
                    variant="default"
                    className="bg-black text-white hover:bg-black/80"
                    onClick={() => {
                        addHitlToolResult({
                            toolCallId: tool.toolCallId,
                            output: {
                                approved: true,
                            }
                        })
                    }}
                >
                    <CheckIcon className="w-4 h-4" />
                    Yes
                </Button>
            </div>
        </div>
    )
}