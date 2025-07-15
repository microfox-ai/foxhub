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

export const AcceptHitl = ({ tool, lastMessage }: { tool: ToolUIPart<any>, lastMessage: boolean }) => {
    const { addHitlToolResult, mutateInput } = useHitl();
    if (tool.state !== "output-available") {
        return null;
    }
    const toolMetadata = tool.output.metadata;

    const [expanded, setExpanded] = useState(false);
    const [showJson, setShowJson] = useState(true);

    const [jsonString, setJsonString] = useState(JSON.stringify(tool.input, null, 2));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        mutateInput(undefined);
    }, [mutateInput]);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newJsonString = e.target.value;
        setJsonString(newJsonString);

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
            <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm -mt-2 text-gray-400 hover:underline self-start"
            >
                {expanded ? "Read less" : "Read more"}
            </button>
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
                    disabled={!!error}
                >
                    <CheckIcon className="w-4 h-4" />
                    Yes
                </Button>
            </div>
        </div>
    )
}