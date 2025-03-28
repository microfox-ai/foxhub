import { ChatUIMessage } from "@prisma/client";
import { JSONValue, UIMessage } from "ai";
import { metadata } from "@/app/layout";
import { MediaPayload } from "../providers/FileUploadProvider";

export interface MessageMetadata {
  githubUrl?: string;
  media: MediaPayload[];
}

export interface ChatUIMessageWithTypes
  extends Omit<ChatUIMessage, "minionType" | "metadata" | "role"> {
  role: "user" | "assistant" | "system";
  minionType?:
    | "hellofox"
    | "convertfox"
    | "buildfox"
    | "testfox"
    | "deployfox"
    | "reviewfox"
    | "packagefox"
    | null;
  metadata?: MessageMetadata;
}

export type AnnotationType = "loading" | "metadata" | "thinking" | "minion";
