import { ToolUIPart } from "ai";
import { HitlOutput } from "./uiTool";
import { BraveMcp } from "./brave/types";
import { mapBraveMcp } from "./brave/mapper";

export type uiHitlMap = {
  brave: BraveMcp;
};

export const insertUiHitl = async (output: any, part: ToolUIPart) => {
  const toolTypeParts = part.type.split("-");
  let mcpType = toolTypeParts?.[1];
  let mcpName = toolTypeParts?.[2];
  const toolName = toolTypeParts?.[3];

  switch (mcpName) {
    case "brave":
      return {
        ...output,
        ui: {
          ...output.ui,
          uiType: "hitl_output",
          object: {
            brave: mapBraveMcp(output, toolName, part),
          },
        },
      };
    default:
      return output;
  }
};
