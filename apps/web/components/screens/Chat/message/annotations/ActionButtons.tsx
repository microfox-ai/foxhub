import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IN_DEV } from "@/utils/constants/appInfo";
import {
    constructAppendBody,
    constructMessageFromButton,
    constructShiftMinionMessage,
} from "../messageHelpers";
import { useMicrofox } from "@/components/screens/providers/MicrofoxProvider";

interface ActionButtonsProps {
    buttons?: any[];
    buttonHeaderText?: string;
    areKeysRequired?: boolean;
    areKeysFilled?: boolean;
}

export const ActionButtons = (props: ActionButtonsProps) => {
    const { status, append, setInput, setMinionType } = useMicrofox();

    if (status === "streaming") {
        return null;
    }
    return (
        <div className="flex flex-col gap-2 mt-4">
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
                            !IN_DEV &&
                            props.areKeysRequired &&
                            !props.areKeysFilled &&
                            button.type === "confirm"
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
                                setMinionType(button.value);
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