import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IN_DEV } from "@/utils/constants/appInfo";
import {
    constructAppendBody,
    constructMessageFromButton,
    constructShiftMinionMessage,
} from "../../messageHelpers";
import { useMicrofoxChat } from "../../../MicrofoxChatProvider";
import { UiComponentProps } from "@/components/screens/Chat/message/uiTool/mappers/UiComponentProps";

type ActionButtonsProps = Omit<UiComponentProps["buttons_list"], "uiType"> & {
    areKeysRequired?: boolean;
    areKeysFilled?: boolean;
} & {
    className?: string;
    disabled?: boolean;
    lastMessage?: boolean;
}

export const ActionButtons = (props: ActionButtonsProps) => {
    const { status, append, setInput, lastKnownMinionType } = useMicrofoxChat();

    if (status === "streaming" || !props.lastMessage) {
        return null;
    }

    return (
        <div className={cn("flex flex-col gap-2 mt-4", props.className)}>
            {props?.buttonHeaderText && (
                <div className="text-md text-gray-500">{props?.buttonHeaderText}</div>
            )}
            <div className="flex gap-2 w-full">
                {props?.buttons?.map((button) => (
                    <Button
                        variant={"outline"}
                        key={button.text}
                        className={cn(
                            `
              text-sm font-medium px-4 py-2 rounded-lg 
              bg-white hover:bg-gray-50 
              text-gray-700 hover:text-gray-900
              border border-gray-200 hover:border-gray-300
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `,
                            button.type === "confirm" &&
                            "bg-black text-white hover:bg-black/80 hover:text-white"
                        )}
                        disabled={
                            props.disabled ||
                            (props.areKeysRequired &&
                                !props.areKeysFilled &&
                                button.type === "confirm")
                        }
                        onClick={() => {
                            console.log("button", button);
                            if (button.action?.id === "highlightInput") {
                            }
                            if (button.action?.id === "appendMessage") {
                                setInput("");
                                append(
                                    constructMessageFromButton(button),
                                    constructAppendBody(lastKnownMinionType, button.action?.props)
                                );
                            }
                            if (button.action?.id === "shiftMinion") {
                                console.log("shiftMinion", button.action?.props);
                                setInput("");
                                append(
                                    constructShiftMinionMessage(button),
                                    constructAppendBody(button.action?.props)
                                );
                            }
                            if (button.action?.id === "link") {
                                window.open(button.action?.props, "_blank");
                            }
                        }}
                    >
                        {button.text}
                    </Button>
                ))}
            </div>
        </div>
    );
}; 