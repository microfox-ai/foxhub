import { ToolUIPart, UIMessage, UIMessagePart } from "ai";
import { MessageMarkdown } from "../text/MessageThoughtWrapper";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";
import { RenderUiTool } from "./RenderUiTool";
import { RenderToolOutput } from "../uiTool/hitl_output/RenderToolOutput";
import { parseMcpType } from "@/components/screens/Chat/message/uiTool/mappers/uiHitl";
import { RenderToolInput } from "../uiTool/hitl_output/RenderToolInput";


type MessagePartType = UIMessage["parts"][number];

const MessagePart = ({
    part,
    messageId,
    message
}: {
    part: MessagePartType;
    messageId: string;
    message: UIMessage;
}) => {

    const { status, messages } = useMicrofoxChat();
    if (part.type === "text") {
        return (
            <div className={`flex flex-col text-md ${message.role === "user" ? "" : "p-4"}`}>
                <MessageMarkdown isStreaming={status === "streaming"}>{part.text}</MessageMarkdown>
            </div>
        );
    }


    if (part.type === "source-url") {
        return <MessageMarkdown isStreaming={status === "streaming"}>{part.sourceId}</MessageMarkdown>;
    }
};

export const DisplayPart = ({ part, messageId, lastMessage, lastAnnotationIndices, messageIndex, message }: {
    part: UIMessagePart<any, any>,
    messageId: string,
    lastMessage: boolean
    lastAnnotationIndices: Map<string, number>;
    messageIndex: number;
    message: UIMessage;
}) => {
    if (part.type === "text") {
        return <MessagePart
            part={part}
            messageId={messageId}
            message={message}
        />
    }
    if (part.type.startsWith("tool-ui-")) {
        return <RenderUiTool tool={part as any} lastMessage={lastMessage} lastAnnotationIndices={lastAnnotationIndices} messageIndex={messageIndex} />
    }
    if (part.type.startsWith("tool-") && (part as any).state == "output-available" && (part as any).output) {
        const { mcpType, mcpName, toolName } = parseMcpType(part.type as `tool-${string}`);
        return (
            <div className="flex flex-col gap-2">
                <RenderToolInput tool={part as any} />
                <RenderToolOutput
                    fullOutput={(part as any).output}
                    uiOutput={(part as any).output?.ui}
                    mcpName={mcpName}
                    toolName={toolName}
                    part={part as ToolUIPart<any>}
                />
            </div>
        )
    }
    return null;
}