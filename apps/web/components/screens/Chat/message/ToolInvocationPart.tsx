import {
  constructAppendBody,
  constructMessageFromButton,
  constructShiftMinionMessage
} from "@/components/screens/Chat/message/messageHelpers";
import { Button } from "@/components/ui/button";
import { UIMessage } from "ai";
import { useMicrofoxChat } from "../MicrofoxChatProvider";
import { PrintCode } from "./PrintCode";

type MessagePartType = UIMessage["parts"][number];

interface ToolInvocationPartProps {
  part: MessagePartType;
  messageId: string;
}

export const ToolInvocationPart = ({
  part,
  messageId,
}: ToolInvocationPartProps) => {
  const { setMessages, status, append, setInput } =
    useMicrofoxChat();

  if (part.type != "tool-invocation") {
    return null;
  }

  if (!part.toolInvocation.args) {
    return null;
  }

  const removeThisPart = () => {
    setMessages((messages) =>
      messages.map((m) => {
        if (m.id === messageId) {
          return {
            ...m,
            parts: m.parts?.filter(
              (p: any) => JSON.stringify(p) !== JSON.stringify(part)
            ),
          };
        }
        return m;
      })
    );
    //TODO: updated the removed part in the message db
  };

  if (part.toolInvocation.toolName === "write_to_file") {
    return (
      <div className="flex flex-col gap-2 my-4 bg-gray-100 p-4 rounded-xl">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-500">
            {`${part.toolInvocation.args.filePath}/${part.toolInvocation.args.fileName}.${part.toolInvocation.args.fileType}`}
          </div>
          {part.toolInvocation.args.content && (
            <PrintCode code={part.toolInvocation.args.content} />
          )}
        </div>
      </div>
    );
  }

  if (
    part.type === "tool-invocation" &&
    part.toolInvocation.state === "result"
  ) {
    return (
      <div className="flex flex-col gap-2 my-4">
        {part.toolInvocation.result.buttons && (
          <div className="flex flex-wrap gap-2">
            {part.toolInvocation.result.buttons.map((button: any) => (
              <Button
                variant={"default"}
                key={button.text}
                className={`text-sm text-black px-2 py-2 rounded-xl cursor-pointer ${button.className}`}
                onClick={() => {
                  if (button.action === "shiftMinion") {
                    setInput("");
                    append(
                      constructShiftMinionMessage(button),
                      constructAppendBody(button.value)
                    );
                    removeThisPart();
                  }
                  if (button.action === "removeThisPart") {
                    removeThisPart();
                  }
                  if (button.action === "appendMessage") {
                    setInput("");
                    append(
                      constructMessageFromButton(button),
                      constructAppendBody(button.minionType)
                    );
                    removeThisPart();
                  }
                }}
              >
                {button.text}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};
