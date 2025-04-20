import { ClientSecretVariable } from "@/server/types";

export interface KeyVariableConfig {
  key: string;
  displayName: string;
  description: string;
  defaultValue?: string | string[];
}

export interface Constructor {
  name: string;
  description: string;
  zodSecretSchema: string;
  auth: "apiKey" | "oauth2";
  requiredKeys?: KeyVariableConfig[];
  internalKeys: KeyVariableConfig[];
}

export interface Package {
  name: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  dependencies: string[];
  status: string;
  documentation: string;
  authEndpoint: string;
  constructors: Constructor[];
}

export interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  persona?: string;
  buttons?: any[];
}

export interface TaskInstanceMetaType {
  taskStructure: {
    lambdaFunctions?: Array<{
      name: string;
      method: string;
      path: string;
      description: string;
      endResult: string;
    }>;
    cronJobs?: Array<{
      name: string;
      cronExpression: string;
      description: string;
      endResult: string;
    }>;
    dbSchemas?: Array<{
      modelName: string;
      jsonSchema: Record<string, any>;
    }>;
  };
}

export interface TaskIntegrationPlatform {
  name: string;
  reason: string;
  optional?: boolean;
  packageInfo?: Package;
}

export interface EnvVariable {
  env: string;
  name: string;
  what: string;
  how?: string;
  examples?: string[];
  isSameAs?: string;
}

export interface DeploymentStep {
  status: "success" | "failed" | "in_progress";
  stage: string;
  startTime: string;
  endTime: string;
  metadata: {
    display_title: string;
    pull_requests: Array<{
      number: number;
    }>;
    job_id: string;
    run_attempt: number;
    run_number: number;
  };
}

export interface DeploymentData {
  shouldBreak: boolean;
  deployStep: DeploymentStep;
  clientDeployment: {
    branch?: string;
    repoName?: string;
  };
}
