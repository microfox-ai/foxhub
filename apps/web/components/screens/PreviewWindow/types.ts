// Available HTTP methods
export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

// Type for form values
export type FormValues = Record<string, string>;

// Type definitions for OpenAPI 3.0.1 documentation
export interface OpenAPISchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  example?: any;
  enum?: string[];
}

export interface OpenAPIContent {
  schema: OpenAPISchema;
}

export interface OpenAPIResponse {
  description: string;
  content?: {
    [key: string]: OpenAPIContent;
  };
}

export interface OpenAPIRequestBody {
  required?: boolean;
  content: {
    [key: string]: OpenAPIContent;
  };
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie" | "body";
  required?: boolean;
  schema: OpenAPISchema;
  description?: string;
  example?: any;
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: {
    [key: string]: OpenAPIResponse;
  };
  instructions?: string;
  method?: string;
  path?: string;
}

export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPIDoc {
  openapi: string;
  servers: {
    url: string;
    description: string;
  }[];
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: {
    [path: string]: OpenAPIPath;
  };
}
