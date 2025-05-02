import { ChatUIMessage } from "@prisma/client";
import { JSONValue, UIMessage } from "ai";
import { metadata } from "@/app/layout";
import { MediaPayload } from "../providers/FileUploadProvider";

export interface MessageMetadata {
  githubUrl?: string;
  media: MediaPayload[];
}

export const MinionFlow = {
  BuildFlow: "buildFlow",
  Unknown: "unknown",
} as const;

export type MinionFlowType = (typeof MinionFlow)[keyof typeof MinionFlow];

export const MinionType = {
  Unknown: "unknown",
  HelloFox: "hellofox",
  ConvertFox: "convertfox",
  BuildFox: "buildfox",
  TestFox: "testfox",
  DeployFox: "deployfox",
  ReviewFox: "reviewfox",
  PackageFox: "packagefox",
} as const;

export type MinionTypeType = (typeof MinionType)[keyof typeof MinionType];

export interface ChatUIMessageWithTypes
  extends Omit<ChatUIMessage, "minionType" | "minionFlow" | "role"> {
  role: "user" | "assistant" | "system";
  minionType?: MinionTypeType;
  minionFlow?: MinionFlowType;
}

export type AnnotationType = "loading" | "metadata" | "thinking" | "minion";
