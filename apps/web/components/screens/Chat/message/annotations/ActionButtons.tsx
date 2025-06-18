import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IN_DEV } from "@/utils/constants/appInfo";
import {
    constructAppendBody,
    constructMessageFromButton,
    constructShiftMinionMessage,
} from "../messageHelpers";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";

interface ActionButtonsProps {
    buttons?: any[];
    buttonHeaderText?: string;
    areKeysRequired?: boolean;
    areKeysFilled?: boolean;
    className?: string;
    disabled?: boolean;
}

export const ActionButtons = (props: ActionButtonsProps) => {
    const { status, append, setInput } = useMicrofoxChat();

    if (status === "streaming") {
        return null;
    }

    console.log("props.areKeysRequired", props.areKeysRequired);
    console.log("props.areKeysFilled", props.areKeysFilled);

    return (
        <div className={cn("flex flex-col gap-2 mt-4", props.className)}>
            {props?.buttonHeaderText && (
                <div className="text-md text-gray-500">{props?.buttonHeaderText}</div>
            )}
            <div className="flex gap-2 w-full">
                {props?.buttons?.map((button: any) => (
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
                            (!IN_DEV &&
                                props.areKeysRequired &&
                                !props.areKeysFilled &&
                                button.type === "confirm")
                        }
                        onClick={() => {
                            console.log("button", button);
                            if (button.action === "highlightInput") {
                            }
                            if (button.action === "appendMessage") {
                                setInput("");
                                append(
                                    constructMessageFromButton(button),
                                    constructAppendBody(button.minionType)
                                );
                            }
                            if (button.action === "shiftMinion") {
                                console.log("shiftMinion", button.value);
                                setInput("");
                                append(
                                    constructShiftMinionMessage(button),
                                    constructAppendBody(button.value)
                                );
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