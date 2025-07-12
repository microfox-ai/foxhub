import { MyUiTool } from "@/server/ui/uiTool";
import { UIMessage } from "@ai-sdk/react";
import { Tool, ToolResultPart, ToolUIPart } from "ai";

const EXCLUDED_PARTS = ["tool-", "step-start"];
const MUST_INCLUDE_PARTS = ["tool-ui-"];

export const getDisplayParts = (message: UIMessage<any, any, any>) => {
  return message?.parts?.filter((part) => {
    if (part.type.startsWith("tool-ui-")) {
      if ((part as any).output?.props?.isUISticky) {
        return false;
      }
      return true;
    }
    if (
      part.type.startsWith("tool-") &&
      (part as any).state == "output-available" &&
      (part as any).output?.ui
    ) {
      return true;
    }
    if (EXCLUDED_PARTS.some((excluded) => part.type.startsWith(excluded))) {
      return false;
    }
    return true;
  });
};

export const getToolParts = (message: UIMessage<any, any, any>) => {
  return message?.parts?.filter((part) => {
    if (part.type.startsWith("tool-")) {
      return true;
    }
  }) as ToolUIPart<any>[];
};

export const getUiParts = (message: UIMessage<any, any, any>) => {
  return message?.parts?.filter(
    (part) =>
      part.type.startsWith("tool-ui-") ||
      (part as any).output?._humanIntervention
  ) as ToolUIPart[];
};

export const getStickyUiParts = (parts: ToolUIPart<any>[]) => {
  return parts?.filter(
    (part, _index) =>
      part.state === "output-available" &&
      ((part as any).output?.props?.isUISticky ||
        part.output?._humanIntervention)
  );
};
export const getLastActiveToolPart = (
  message: UIMessage<any, any, any>,
  activePart: number
): ToolUIPart<any> | undefined => {
  const displayParts = getDisplayParts(message);

  if (!displayParts || displayParts.length === 0) {
    return undefined;
  }

  if (activePart === displayParts.length - 1) {
    const lastDisplayPart = displayParts[activePart];

    if (lastDisplayPart && message.parts) {
      const originalIndexOfLastDisplayPart =
        message.parts.lastIndexOf(lastDisplayPart);

      if (originalIndexOfLastDisplayPart > 0) {
        for (let i = originalIndexOfLastDisplayPart - 1; i >= 0; i--) {
          const part = message.parts[i];
          if (
            part &&
            part.type.startsWith("tool-") &&
            !part.type.startsWith("tool-ui-")
          ) {
            return part as ToolUIPart<any>;
          }
        }
      }
    }
  }

  return undefined;
};
