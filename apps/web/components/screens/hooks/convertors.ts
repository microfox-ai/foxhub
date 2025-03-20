import { ChatUIMessage } from "@prisma/client";
import { JSONValue, UIMessage } from "ai";
import { metadata } from "@/app/layout";
import { MediaPayload } from "../providers/FileUploadProvider";

export interface MessageMetadata {
  githubUrl?: string;
  media: MediaPayload[];
}

export interface ChatUIMessageWithTypes
  extends Omit<
    ChatUIMessage,
    "context" | "minionType" | "metadata" | "systemType"
  > {
  context: "chat" | "server";
  systemType?: "git" | "server";
  minionType?:
    | "hellofox"
    | "convert"
    | "build"
    | "test"
    | "deploy"
    | "review"
    | "package"
    | null;
  metadata?: MessageMetadata;
}

export type AnnotationType = "core" | "metadata" | "systemType" | "minion";

export const mapChatUIMessageToVercelUIMessage = (
  apiResponse: ChatUIMessageWithTypes
): UIMessage => {
  const { id, role, content, createdAt, ...rest } = apiResponse;

  return {
    id,
    role: role as UIMessage["role"],
    content,
    createdAt,
    parts: rest.parts as any,
    annotations: [
      {
        type: "core",
        originClientRequestId: rest.originClientRequestId,
        userId: rest.userId,
        //updatedAt: rest.updatedAt?.toISOString(),
      },
      {
        type: "metadata",
        metadata: rest.metadata as any,
      },
      {
        type: "systemType",
        systemType: rest.systemType as JSONValue,
      },
      {
        type: "minion",
        minionId: rest.minionId as JSONValue,
        minionType: rest.minionType as JSONValue,
      },
    ],
  };
};

export const mapVercelUIMessageToChatUIMessage = (
  vercelUIMessage: UIMessage,
  options: {
    extraData?: MessageMetadata;
    minionType?: ChatUIMessageWithTypes["minionType"];
    userId: string;
    originClientRequestId: string;
  }
): ChatUIMessageWithTypes => {
  return {
    ...vercelUIMessage,
    metadata: options.extraData ? (options.extraData as any) : null,
    context: "chat",
    minionType: options.minionType,
    attachments: [],
    userId: options.userId,
    originClientRequestId: options.originClientRequestId,
    updatedAt: new Date(),
  } as any;
};
