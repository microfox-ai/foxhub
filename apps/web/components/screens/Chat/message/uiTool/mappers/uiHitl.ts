import { ToolUIPart } from "ai";
import { mapBraveMcp } from "./brave/mapper";
import { BraveMcp } from "./brave/types";
import { mapBrowseMcp } from "./browse/mapper";
import { BrowseMcp } from "./browse/types";
import { UiCommonTypes, AgentUi } from "@microfox/types";

export type uiHitlMap = {
  brave: BraveMcp;
  "puppeteer-sls": BrowseMcp;
  common: UiCommonTypes;
};

// tool-pkg-puppeteer-sls-webSearch | tool-agent-brave-searchWeb | tool-pkg-maximus-getStokPrice
// mcpType: pkg | agent
// mcpName: puppeteer-sls
// toolName: webSearch

export const parseMcpType = (type: `tool-${string}`) => {
  const mcpType = type.startsWith("tool-pkgAgent")
    ? "pkg"
    : type.startsWith("tool-microAgent")
      ? "agent"
      : "";

  const restOfType = type
    .replace("tool-pkgAgent", "")
    .replace("tool-microAgent", "");

  const lastSplitter = restOfType.lastIndexOf("AsTool");

  const mcpName = restOfType.substring(0, lastSplitter);
  const toolName = restOfType.substring(lastSplitter + 6);

  return { mcpType, mcpName, toolName };
};

export const insertUiHitlOutput = async (
  output: any,
  { part, uiMapper }: { part: ToolUIPart; uiMapper?: AgentUi }
) => {
  const { mcpType, mcpName, toolName } = parseMcpType(part.type);

  switch (mcpName) {
    case "brave":
      return {
        ...output,
        ui: {
          ...output.ui,
          uiType: "hitl_output",
          object: {
            brave: mapBraveMcp(output, toolName as keyof BraveMcp, part),
          },
        },
      };
    case "puppeteer-sls":
      return {
        ...output,
        ui: {
          ...output.ui,
          uiType: "hitl_output",
          object: {
            "puppeteer-sls": mapBrowseMcp(
              output,
              toolName as keyof BrowseMcp,
              part
            ),
          },
        },
      };
    default:
      if (uiMapper?.outputUi?.namespace === "common") {
        return {
          ...output,
          ui: {
            outputUi: uiMapper?.outputUi,
          },
        };
      }
      return output;
  }
};
