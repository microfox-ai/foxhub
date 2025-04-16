import { DEPLOY_STAGE } from "@prisma/client";

export interface IMediaPayloadType {
  mediaName: string;
  mediaType: string;
  mediaFormat: string;
  mediaUrl: string;
}
[];

export enum dataStreamType {
  STATUS = "status",
  MESSAGE = "message",
  LOG = "log",
}

export interface ClientSecretVariable {
  stage?: "DEV" | "PROD" | "STAGING";
  key: string;
  value: string;
  isOptional?: boolean;
}
