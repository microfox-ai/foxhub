import { MyUiTool } from "@/server/ui/uiTool";
import { UIMessage } from "@ai-sdk/react";
import { Tool, ToolResultPart, ToolUIPart } from "ai";

const EXCLUDED_PARTS = ["tool-", "step-start"];
const MUST_INCLUDE_PARTS = ["tool-ui-"];

export const getDisplayParts = (message: UIMessage<any, any, any>) => {
  return message.parts?.filter((part) => {
    if (part.type.startsWith("tool-ui-")) {
      if ((part as any).output?.props?.isUISticky) {
        return false;
      }
      return true;
    }
    if (EXCLUDED_PARTS.some((excluded) => part.type.startsWith(excluded))) {
      return false;
    }
    return true;
  });
};

export const getUiParts = (message: UIMessage<any, any, any>) => {
  return message.parts?.filter((part) =>
    part.type.startsWith("tool-ui-")
  ) as ToolUIPart[];
};

export const getStickyUiParts = (parts: ToolUIPart<any>[]) => {
  return parts?.filter(
    (part) =>
      part.state === "output-available" &&
      (part as any).output?.props?.isUISticky
  );
};
