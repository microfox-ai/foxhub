import { ChatUIMessage } from "@prisma/client";
import { JSONValue, UIMessage } from "ai";
import { metadata } from "@/app/layout";
import { MediaPayload } from "../providers/FileUploadProvider";

export interface MessageMetadata {
  githubUrl?: string;
  media: MediaPayload[];
}

export const MinionFlow = {
  ChatFlow: "chatFlow",
  BuildFlow: "buildFlow",
  //InstallFlow: "installFlow",
  Unknown: "unknown",
} as const;

export type MinionFlowType = (typeof MinionFlow)[keyof typeof MinionFlow];

export const MinionType = {
  Unknown: "unknown",
  HelloFox: "hellofox",
  ConvertFox: "convertfox",
  BuildFox: "buildfox",
  DeployFox: "deployfox",
  HotFixFox: "hotfixfox",
  TestFox: "testfox",
  ReviewFox: "reviewfox",
  PackageFox: "packagefox",
  PublishFox: "publishfox",
  InstallFox: "installfox",
  TaskQueryFox: "taskqueryfox",
} as const;

export type MinionTypeType = (typeof MinionType)[keyof typeof MinionType];

export const MinionSupports = {
  [MinionType.HelloFox]: ["intent-observor"] as string[],
  [MinionType.ConvertFox]: ["intent-observor"] as string[],
  [MinionType.BuildFox]: [] as string[],
  [MinionType.TestFox]: [] as string[],
  [MinionType.DeployFox]: [] as string[],
  [MinionType.HotFixFox]: ["intent-observor"] as string[],
  [MinionType.ReviewFox]: [] as string[],
  [MinionType.PackageFox]: [] as string[],
  [MinionType.Unknown]: [] as string[],
  [MinionType.PublishFox]: [] as string[],
  [MinionType.InstallFox]: [] as string[],
  [MinionType.TaskQueryFox]: [] as string[],
} as const;

export interface ChatUIMessageWithTypes
  extends Omit<ChatUIMessage, "minionType" | "minionFlow" | "role"> {
  role: "user" | "assistant" | "system";
  minionType?: MinionTypeType;
  minionFlow?: MinionFlowType;
}

export type AnnotationType = "loading" | "metadata" | "thinking" | "minion";
