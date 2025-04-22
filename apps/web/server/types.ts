import { ClientSecret, DEPLOY_STAGE } from "@prisma/client";

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

export interface ConfigUi {
  label?: string;
  type:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "textarea"
    | "multiSelect"
    | "image"
    | "password";
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  disabled?: boolean;
}

export interface ClientSecretVariable {
  stage?: "DEV" | "PROD" | "STAGING";
  key: string;
  value: any;
  isOptional?: boolean;
  defaultValue?: string | string[] | any | any[];
  description?: string;
  ui: ConfigUi;
}

export enum PackageStatus {
  STABLE = "stable",
  SEMISTABLE = "semiStable",
  PARTIAL = "partial",
  OAUTHCONNECTOR = "oauthConnector",
}

export enum ClientSecretPackageType {
  TEMPLATE = "template",
  CUSTOM = "custom",
  OAUTH2 = "oauth2",
  APIKEY = "apikey",
}

export enum ClientSecretApiType {
  BOT_TOKEN = "bot_token",
  API_KEY = "api_key",
}

export interface ClientSecretWithPackageInfo extends ClientSecret {
  packageInfo?: any;
}

export interface ClientDeploymentMetadata {
  title?: string;
  version?: string;
  description?: string;
  docData?: {
    openapi?: string;
    info?: any;
    paths?: any;
    servers?: any[];
  };
  serverless: {
    output?: string;
    stage?: DEPLOY_STAGE;
    functions: {
      functionName: string;
      size: string;
    }[];
    serviceName?: string;
    functionBase?: string;
  };
}
