import { ToolResultPart, ToolUIPart } from "ai"
import { Button } from "@/components/ui/button"
import { useMicrofoxChat } from "../../../MicrofoxChatProvider";

export const AcceptHitl = ({ tool, lastMessage }: { tool: ToolUIPart<any>, lastMessage: boolean }) => {
    const { messages, addToolResult } = useMicrofoxChat();
    if (tool.state !== "output-available") {
        return null;
    }
    const toolMetadata = tool.output?.metadata;
    const lastMessageInChat = messages[messages.length - 1];
    return (
        <div className="flex flex-col gap-2 my-4 bg-gray-100 p-4 rounded-xl">
            <h4 className="text-lg font-bold">{toolMetadata?.name}</h4>
            <div className="text-sm text-gray-500">
                {toolMetadata?.description}
            </div>
            {Object.keys(tool.input)?.length > 0 &&
                (<div className="font-mono bg-gray-200 p-2 rounded text-xs">
                    {JSON.stringify(tool.input, null, 2)}
                </div>
                )}

            <p className="text-sm text-gray-500">
                Can i call the above tool {Object.keys(tool.input)?.length > 0 ? "with the above args?" : "?"}
            </p>
            <div className="flex gap-2 pt-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        addToolResult({
                            toolCallId: tool.toolCallId,
                            output: {
                                approved: false,
                            }
                        })
                    }}
                >
                    No
                </Button>
                <Button
                    variant="default"
                    className="bg-black text-white hover:bg-black/80"
                    onClick={() => {
                        addToolResult({
                            toolCallId: tool.toolCallId,
                            output: {
                                approved: true,
                            }
                        })
                    }}
                >
                    Yes
                </Button>
            </div>
        </div>
    )
}