import { UIMessage, UIMessagePart } from "ai";
import { MessageMarkdown } from "../text/MessageThoughtWrapper";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";
import { RenderUiTool } from "./RenderUiTool";


type MessagePartType = UIMessage["parts"][number];

const MessagePart = ({
    part,
    messageId,
}: {
    part: MessagePartType;
    messageId: string;
}) => {

    const { status } = useMicrofoxChat();
    if (part.type === "text") {
        return <MessageMarkdown isStreaming={status === "streaming"}>{part.text}</MessageMarkdown>;
    }


    if (part.type === "source-url") {
        return <MessageMarkdown isStreaming={status === "streaming"}>{part.sourceId}</MessageMarkdown>;
    }
};

export const DisplayPart = ({ part, messageId, lastMessage, lastAnnotationIndices, messageIndex }: {
    part: UIMessagePart<any, any>,
    messageId: string,
    lastMessage: boolean
    lastAnnotationIndices: Map<string, number>;
    messageIndex: number;
}) => {
    if (part.type === "text") {
        return <MessagePart
            part={part}
            messageId={messageId}
        />
    }
    if (part.type.startsWith("tool-ui-")) {
        return <RenderUiTool tool={part as any} lastMessage={lastMessage} lastAnnotationIndices={lastAnnotationIndices} messageIndex={messageIndex} />
    }
    return null;
}