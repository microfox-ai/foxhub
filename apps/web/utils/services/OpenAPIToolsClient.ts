import { z } from "zod";

// Available HTTP methods
export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

// Type for form values
type FormValues = Record<string, string>;

// Remove external package imports and define our own types
type JsonSchema = {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: any[];
  default?: any;
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  [key: string]: any;
};

type OpenAPISchema = {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  example?: any;
  enum?: any[];
  default?: any;
  additionalProperties?: boolean | OpenAPISchema;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  $ref?: string;
};

type OpenAPIParameter = {
  name: string;
  in: "query" | "path" | "header" | "cookie" | "body";
  required?: boolean;
  schema: OpenAPISchema;
  description?: string;
  example?: any;
}

type OpenAPIContent = {
  schema: OpenAPISchema;
}

type OpenAPIResponse = {
  description: string;
  content?: {
    [key: string]: OpenAPIContent;
  };
};

type OpenAPIRequestBody = {
  required?: boolean;
  content: {
    [key: string]: OpenAPIContent;
  };
};

type OpenAPIOperation = {
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
};

type OpenAPIPath = {
  [method: string]: OpenAPIOperation;
};

type OpenAPIDoc = {
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
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
};

type ToolMethod = {
  name: string;
  description: string;
  inputSchema: JsonSchema & { type: 'object' };
  returnSchema?: JsonSchema;
};

// Update Tool type to use Zod schema
type Tool = {
  name: string;
  description: string;
  parameters: z.ZodType;
  execute: ToolExecuteFn;
};

// AI SDK compatible tools types
type ToolSchema = {
  description?: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
};

type ToolSchemas = Record<string, ToolSchema> | 'automatic';

type ToolExecuteOptions = {
  abortSignal?: AbortSignal;
};

type ToolExecuteFn = (args: Record<string, any>, options?: ToolExecuteOptions) => Promise<any>;

type ToolSet = Record<string, Tool>;

// Schema source configuration
type SchemaConfig = {
  /**
   * Source of the OpenAPI schema
   * - object: direct OpenAPIDoc object
   * - text: JSON string of the schema
   * - url: URL to fetch the schema from
   */
  type: 'object' | 'text' | 'url';

  /**
   * The OpenAPI schema when type is 'object' or 'text'
   */
  schema?: OpenAPIDoc | string;

  /**
   * URL to fetch the schema from when type is 'url'
   */
  url?: string;
};

interface OpenAPIToolsClientOptions {
  /**
   * Schema configuration
   */
  schema: SchemaConfig | OpenAPIDoc | string;

  /**
   * Base URL to use for the client
   * If provided, overrides the URL from the schema's servers array
   */
  baseUrl?: string;

  /**
   * Custom headers to include with every request
   */
  headers?: Record<string, string>;

  /**
   * Function called on API request errors
   */
  onError?: (error: Error) => void;

  /**
   * Name of the client instance
   */
  name?: string;
}

interface FetchOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

interface APIResponse {
  data: any;
  contentType: string;
  status: number;
}

/**
 * Client for interacting with APIs described by OpenAPI schemas
 * Provides methods for calling API operations and generating AI SDK-compatible tools
 */
export class OpenAPIToolsClient {
  private schema: OpenAPIDoc;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private onError?: (error: Error) => void;
  private operationMap: Map<string, OpenAPIOperation & { path: string; method: string }>;
  private name: string;
  private initialized: boolean = false;
  private schemaCache: Record<string, JsonSchema> = {};

  constructor(options: {
    schema: OpenAPIDoc;
    baseUrl?: string;
    headers?: Record<string, string>;
    onError?: (error: Error) => void;
    name?: string;
  }) {
    this.schema = options.schema;
    this.baseUrl = options.baseUrl || '';
    this.defaultHeaders = options.headers || {};
    this.onError = options.onError;
    this.operationMap = new Map();
    this.name = options.name || 'openapi-tools-client';
  }

  /**
   * Initialize the client
   */
  async init(): Promise<OpenAPIToolsClient> {
    if (this.initialized) {
      return this;
    }

    try {
      // Set base URL from schema if not provided
      if (!this.baseUrl && this.schema.servers && this.schema.servers.length > 0) {
        const serverUrl = this.schema.servers[0]?.url;
        if (serverUrl) {
          this.baseUrl = serverUrl;
        }
      }

      // Set up operation map
      this.setupOperationMap();

      this.initialized = true;
      return this;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error during initialization';

      if (this.onError && error instanceof Error) {
        this.onError(error);
      }

      throw new Error(`Failed to initialize OpenAPI client: ${errorMessage}`);
    }
  }

  private setupOperationMap() {
    for (const [path, methods] of Object.entries(this.schema.paths)) {
      for (const [method, pathOperation] of Object.entries(methods as OpenAPIPath)) {
        const operation = pathOperation as OpenAPIOperation;
        const operationId = this.generateOperationId(path, method, operation);

        this.operationMap.set(operationId, {
          ...operation,
          path,
          method: method.toUpperCase()
        });
      }
    }
  }

  private generateOperationId(path: string, method: string, operation: OpenAPIOperation): string {
    // First priority: use the operationId from the schema if available
    if (operation.operationId) {
      return operation.operationId;
    }

    // Second priority: generate an ID from the path and method
    const pathPart = path
      .replace(/^\/|\/$/g, '')
      .replace(/-/g, '_')
      .replace(/\/\{([^}]+)\}/g, '_by_$1')
      .replace(/\//g, '_');

    return `${method.toLowerCase()}_${pathPart}`;
  }

  private prepareRequest(
    operation: OpenAPIOperation & { path: string; method: string },
    args: Record<string, any>
  ) {
    let url = `${this.baseUrl}${operation.path}`;
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      "Content-Type": "application/json",
    };

    // Process path parameters
    if (operation.parameters) {
      const pathParams = operation.parameters.filter((param) => param.in === "path");
      pathParams.forEach((param) => {
        const paramValue = args[param.name];
        if (paramValue !== undefined) {
          url = url.replace(
            `{${param.name}}`,
            encodeURIComponent(String(paramValue))
          );
        }
      });

      // Process query parameters
      const queryParams = operation.parameters.filter((param) => param.in === "query");
      if (queryParams.length > 0) {
        const queryString = queryParams
          .map((param) => {
            const paramValue = args[param.name];
            if (paramValue !== undefined) {
              return `${encodeURIComponent(param.name)}=${encodeURIComponent(String(paramValue))}`;
            }
            return null;
          })
          .filter(Boolean)
          .join("&");

        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Process header parameters
      const headerParams = operation.parameters.filter((param) => param.in === "header");
      headerParams.forEach((param) => {
        const paramValue = args[param.name];
        if (paramValue !== undefined) {
          headers[param.name] = String(paramValue);
        }
      });
    }

    // Prepare request body for POST/PUT/PATCH requests
    let body: string | undefined;
    if (
      ["POST", "PUT", "PATCH"].includes(operation.method) &&
      operation.requestBody?.content?.["application/json"]?.schema
    ) {
      const requestBodySchema = operation.requestBody.content["application/json"].schema;

      if (requestBodySchema.type === "object" && requestBodySchema.properties) {
        // For object request bodies, we assume the args already have the right shape
        // or that the properties are top-level in args
        const bodyData: Record<string, any> = {};

        // Check if there's a single body argument containing the entire body
        if (args.body && typeof args.body === 'object') {
          body = JSON.stringify(args.body);
        } else {
          // Otherwise, build body from individual properties
          Object.keys(requestBodySchema.properties).forEach((key) => {
            if (args[key] !== undefined) {
              bodyData[key] = args[key];
            }
          });
          body = JSON.stringify(bodyData);
        }
      } else if (requestBodySchema.type === "array" && args.body) {
        // For array request bodies
        try {
          if (Array.isArray(args.body)) {
            body = JSON.stringify(args.body);
          } else {
            body = JSON.stringify(JSON.parse(args.body));
          }
        } catch (e) {
          body = JSON.stringify([]);
        }
      } else if (args.body !== undefined) {
        // For primitive request bodies
        body = JSON.stringify(args.body);
      }
    }

    return { url, headers, body };
  }

  private async makeRequest(options: FetchOptions): Promise<APIResponse> {
    const { url, method, headers, body, signal } = options;

    try {
      console.log("Making request", { url })
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal,
      });

      const contentType = response.headers.get("content-type") || "";
      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else if (contentType.includes("image/")) {
        data = await response.blob();
      } else {
        data = await response.text();
      }
      console.log("Response", { data, contentType, status: response.status })

      return {
        data,
        contentType,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      console.error("API Fetch Error:", error);
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }

      throw new Error(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  }

  /**
   * List all available API operations from the OpenAPI schema
   * Operations are individual API endpoints defined in the OpenAPI schema
   */
  async listOperations() {
    if (!this.initialized) {
      throw new Error('Client not initialized. Call init() first.');
    }

    const operations: {
      id: string;
      summary?: string;
      description?: string;
      parameters?: OpenAPIParameter[];
      requestBody?: OpenAPIRequestBody;
      path: string;
      method: string;
    }[] = [];

    for (const [id, operation] of this.operationMap.entries()) {
      operations.push({
        id,
        summary: operation.summary,
        description: operation.description,
        parameters: operation.parameters,
        requestBody: operation.requestBody,
        path: operation.path,
        method: operation.method
      });
    }

    return { operations };
  }

  /**
   * Call a specific API operation from the OpenAPI schema
   */
  async callOperation(id: string, args: Record<string, any> = {}, options?: ToolExecuteOptions) {
    if (!this.initialized) {
      throw new Error('Client not initialized. Call init() first.');
    }

    const operation = this.operationMap.get(id);
    if (!operation) {
      throw new Error(`Operation "${id}" not found. Available operations: ${Array.from(this.operationMap.keys()).join(', ')}`);
    }

    const { url, headers, body } = this.prepareRequest(operation, args);

    return this.makeRequest({
      url,
      method: operation.method,
      headers,
      body,
      signal: options?.abortSignal
    });
  }

  /**
   * Convert OpenAPI parameters and request body to JSON Schema
   */
  private buildParametersSchema(operation: OpenAPIOperation & { path: string; method: string }): ToolSchema['parameters'] {
    const schema: ToolSchema['parameters'] = {
      type: 'object',
      properties: {},
      required: []
    };

    // Add parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        // Use param schema if available, otherwise create simple string schema
        schema.properties[param.name] = param.schema || { type: 'string' };

        // Add description if available
        if (param.description) {
          schema.properties[param.name].description = param.description;
        }

        // Add to required list if parameter is required
        if (param.required && schema.required) {
          schema.required.push(param.name);
        }
      }
    }

    // Add request body properties
    if (operation.requestBody?.content?.['application/json']?.schema) {
      const bodySchema = operation.requestBody.content['application/json'].schema;

      if (bodySchema.type === 'object' && bodySchema.properties) {
        // For object types, merge properties into the main schema
        Object.entries(bodySchema.properties).forEach(([key, propSchema]) => {
          schema.properties[key] = propSchema;

          // Add required properties
          if (bodySchema.required && schema.required) {
            for (const reqKey of bodySchema.required) {
              if (reqKey === key) {
                schema.required.push(key);
              }
            }
          }
        });
      } else {
        // For non-object types (array, string, etc.), add a 'body' property
        schema.properties.body = bodySchema;

        if (operation.requestBody.required && schema.required) {
          schema.required.push('body');
        }
      }
    }

    return schema;
  }

  /**
   * Convert operation to JSON Schema
   */
  private convertOperationToJsonSchema(operation: OpenAPIOperation & { path: string; method: string }): JsonSchema & { type: 'object' } {
    const schema: JsonSchema & { type: 'object' } = {
      type: 'object',
      properties: {},
      required: [],
      $defs: this.convertComponentsToJsonSchema(),
    };

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.schema) {
          const paramSchema = this.convertOpenApiSchemaToJsonSchema(param.schema, new Set());
          if (param.description) {
            paramSchema.description = param.description;
          }
          schema.properties![param.name] = paramSchema;
          if (param.required) {
            schema.required!.push(param.name);
          }
        }
      }
    }

    if (operation.requestBody?.content) {
      if (operation.requestBody.content['application/json']?.schema) {
        const bodySchema = this.convertOpenApiSchemaToJsonSchema(
          operation.requestBody.content['application/json'].schema,
          new Set()
        );
        if (bodySchema.type === 'object' && bodySchema.properties) {
          for (const [name, propSchema] of Object.entries(bodySchema.properties)) {
            schema.properties![name] = propSchema;
          }
          if (bodySchema.required) {
            schema.required!.push(...bodySchema.required);
          }
        }
      }
    }

    return schema;
  }

  /**
   * Convert components to JSON Schema
   */
  private convertComponentsToJsonSchema(): Record<string, JsonSchema> {
    const components = this.schema.components || {};
    const schema: Record<string, JsonSchema> = {};
    for (const [key, value] of Object.entries(components.schemas || {})) {
      schema[key] = this.convertOpenApiSchemaToJsonSchema(value, new Set());
    }
    return schema;
  }

  /**
   * Extract response type from operation
   */
  private extractResponseType(operation: OpenAPIOperation): JsonSchema | null {
    const successResponse = operation.responses['200'] || operation.responses['201'] || operation.responses['202'] || operation.responses['204'];
    if (!successResponse || !successResponse.content) return null;

    if (successResponse.content['application/json']?.schema) {
      const returnSchema = this.convertOpenApiSchemaToJsonSchema(
        successResponse.content['application/json'].schema,
        new Set(),
        false
      );
      returnSchema['$defs'] = this.convertComponentsToJsonSchema();

      if (successResponse.description && !returnSchema.description) {
        returnSchema.description = successResponse.description;
      }

      return returnSchema;
    }

    if (successResponse.content['image/png'] || successResponse.content['image/jpeg']) {
      return { type: 'string', format: 'binary', description: successResponse.description || '' };
    }

    return { type: 'string', description: successResponse.description || '' };
  }

  /**
   * Resolve a $ref reference to its schema in the openApiSpec
   */
  private internalResolveRef(ref: string, resolvedRefs: Set<string>): OpenAPISchema | null {
    if (!ref.startsWith('#/')) {
      return null;
    }
    if (resolvedRefs.has(ref)) {
      return null;
    }

    const parts = ref.replace(/^#\//, '').split('/');
    let current: any = this.schema;
    for (const part of parts) {
      current = current[part];
      if (!current) return null;
    }
    resolvedRefs.add(ref);
    return current as OpenAPISchema;
  }

  /**
   * Convert OpenAPI schema to JSON Schema
   */
  private convertOpenApiSchemaToJsonSchema(
    schema: OpenAPISchema,
    resolvedRefs: Set<string>,
    resolveRefs: boolean = false,
  ): JsonSchema {
    if (schema.$ref) {
      const ref = schema.$ref;
      if (!resolveRefs) {
        if (ref.startsWith('#/components/schemas/')) {
          return {
            $ref: ref.replace(/^#\/components\/schemas\//, '#/$defs/'),
            ...(schema.description ? { description: schema.description } : {}),
          };
        }
      }

      const refSchema: JsonSchema = { $ref: ref };
      if (schema.description) {
        refSchema.description = schema.description;
      }

      if (this.schemaCache[ref]) {
        return this.schemaCache[ref];
      }

      const resolved = this.internalResolveRef(ref, resolvedRefs);
      if (!resolved) {
        return {
          $ref: ref.replace(/^#\/components\/schemas\//, '#/$defs/'),
          description: schema.description || '',
        };
      } else {
        const converted = this.convertOpenApiSchemaToJsonSchema(resolved, resolvedRefs, resolveRefs);
        this.schemaCache[ref] = converted;
        return converted;
      }
    }

    const result: JsonSchema = {};

    if (schema.type) {
      result.type = schema.type;
    }

    if (schema.format === 'binary') {
      result.format = 'uri-reference';
      const binaryDesc = 'absolute paths to local files';
      result.description = schema.description ? `${schema.description} (${binaryDesc})` : binaryDesc;
    } else {
      if (schema.format) {
        result.format = schema.format;
      }
      if (schema.description) {
        result.description = schema.description;
      }
    }

    if (schema.enum) {
      result.enum = schema.enum;
    }

    if (schema.default !== undefined) {
      result.default = schema.default;
    }

    if (schema.type === 'object') {
      result.type = 'object';
      if (schema.properties) {
        result.properties = {};
        for (const [name, propSchema] of Object.entries(schema.properties)) {
          result.properties[name] = this.convertOpenApiSchemaToJsonSchema(propSchema, resolvedRefs, resolveRefs);
        }
      }
      if (schema.required) {
        result.required = schema.required;
      }
      if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
        result.additionalProperties = true;
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        result.additionalProperties = this.convertOpenApiSchemaToJsonSchema(schema.additionalProperties, resolvedRefs, resolveRefs);
      } else {
        result.additionalProperties = false;
      }
    }

    if (schema.type === 'array' && schema.items) {
      result.type = 'array';
      result.items = this.convertOpenApiSchemaToJsonSchema(schema.items, resolvedRefs, resolveRefs);
    }

    if (schema.oneOf) {
      result.oneOf = schema.oneOf.map((s: OpenAPISchema) => this.convertOpenApiSchemaToJsonSchema(s, resolvedRefs, resolveRefs));
    }
    if (schema.anyOf) {
      result.anyOf = schema.anyOf.map((s: OpenAPISchema) => this.convertOpenApiSchemaToJsonSchema(s, resolvedRefs, resolveRefs));
    }
    if (schema.allOf) {
      result.allOf = schema.allOf.map((s: OpenAPISchema) => this.convertOpenApiSchemaToJsonSchema(s, resolvedRefs, resolveRefs));
    }

    return result;
  }

  /**
   * Convert OpenAPI schema to Zod schema
   */
  private convertOpenApiSchemaToZod(schema: OpenAPISchema): z.ZodType {
    if (!schema.type) {
      return z.any();
    }

    switch (schema.type) {
      case 'string':
        let stringSchema = z.string();
        if (schema.format === 'date-time') {
          stringSchema = z.string().datetime();
        } else if (schema.format === 'email') {
          stringSchema = z.string().email();
        } else if (schema.format === 'uri') {
          stringSchema = z.string().url();
        }
        if (schema.description) {
          stringSchema = stringSchema.describe(schema.description);
        }
        return stringSchema;

      case 'number':
      case 'integer':
        let numberSchema = schema.type === 'integer' ? z.number().int() : z.number();
        if (schema.description) {
          numberSchema = numberSchema.describe(schema.description);
        }
        return numberSchema;

      case 'boolean':
        let booleanSchema = z.boolean();
        if (schema.description) {
          booleanSchema = booleanSchema.describe(schema.description);
        }
        return booleanSchema;

      case 'array':
        if (!schema.items) {
          return z.array(z.any());
        }
        const itemSchema = this.convertOpenApiSchemaToZod(schema.items);
        let arraySchema = z.array(itemSchema);
        if (schema.description) {
          arraySchema = arraySchema.describe(schema.description);
        }
        return arraySchema;

      case 'object':
        if (!schema.properties) {
          return z.record(z.any());
        }
        const shape: Record<string, z.ZodType> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          shape[key] = this.convertOpenApiSchemaToZod(propSchema);
        }
        let objectSchema = z.object(shape);
        if (schema.required) {
          objectSchema = objectSchema.extend(
            Object.fromEntries(
              schema.required.map(key => [key, shape[key]?.optional() ?? z.any()])
            )
          );
        }
        if (schema.description) {
          objectSchema = objectSchema.describe(schema.description);
        }
        return objectSchema;

      default:
        return z.any();
    }
  }

  /**
   * Returns a set of tools generated from the OpenAPI schema
   */
  async tools({ schemas = 'automatic' }: { schemas?: ToolSchemas } = {}): Promise<ToolSet> {
    if (!this.initialized) {
      throw new Error('Client not initialized. Call init() first.');
    }

    const tools: ToolSet = {};

    // Get all available operations
    const { operations } = await this.listOperations();

    for (const operation of operations) {
      const id = operation.id;

      // Skip operations not in schemas if schemas is provided
      if (schemas !== 'automatic' && !(id in schemas)) {
        continue;
      }

      // Get the full operation details from the map
      const fullOperation = this.operationMap.get(id);
      if (!fullOperation) continue;

      // Convert operation schema to Zod schema
      const zodSchema = this.convertOpenApiSchemaToZod(this.convertOperationToJsonSchema(fullOperation));

      // Create the tool
      const description = operation.description || operation.summary || `${operation.method} ${operation.path}`;
      const self = this;

      tools[id] = {
        name: id,
        description,
        parameters: zodSchema,
        execute: async (args, options) => {
          // Throw if aborted
          options?.abortSignal?.throwIfAborted();

          // Call the operation
          return self.callOperation(id, args, options);
        }
      };
    }

    return tools;
  }
}

/**
 * Parse and validate the schema configuration
 */
async function parseSchema(config: SchemaConfig | OpenAPIDoc | string): Promise<OpenAPIDoc> {
  let parsedSchema: OpenAPIDoc;

  if (typeof config === 'string') {
    // Handle string as either JSON text or URL
    try {
      parsedSchema = JSON.parse(config);
    } catch (error) {
      // If it's not valid JSON, try to fetch it as a URL
      try {
        const response = await fetch(config);
        if (!response.ok) {
          throw new Error(`Failed to fetch schema from URL: ${config}`);
        }
        parsedSchema = await response.json();
      } catch (fetchError: any) {
        throw new Error(`Invalid schema JSON string and failed to fetch as URL: ${fetchError.message || String(fetchError)}`);
      }
    }
  } else if (config && typeof config === 'object') {
    if ('type' in config) {
      // Handle SchemaConfig object
      if (config.type === 'object' && config.schema && typeof config.schema !== 'string') {
        parsedSchema = config.schema;
      } else if (config.type === 'text' && config.schema && typeof config.schema === 'string') {
        try {
          parsedSchema = JSON.parse(config.schema);
        } catch (error) {
          throw new Error('Invalid schema JSON string');
        }
      } else if (config.type === 'url' && config.url) {
        // Fetch from URL
        try {
          const response = await fetch(config.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch schema from URL: ${config.url}`);
          }
          parsedSchema = await response.json();
        } catch (error: any) {
          throw new Error(`Failed to fetch schema from URL: ${error.message || String(error)}`);
        }
      } else {
        throw new Error('Invalid schema configuration: missing required properties for the specified type');
      }
    } else {
      // Assume it's a raw OpenAPIDoc object
      parsedSchema = config as OpenAPIDoc;
    }
  } else {
    throw new Error('Invalid schema configuration');
  }

  return parsedSchema;
}

/**
 * Create an OpenAPI client for interacting with an API described by an OpenAPI schema
 * The client can be used to call API operations directly or generate AI SDK-compatible tools
 * 
 * @param options Client configuration options
 * @returns OpenAPIToolsClient instance
 */
export async function createOpenAPIToolsClient(options: OpenAPIToolsClientOptions): Promise<OpenAPIToolsClient> {
  try {
    // Parse the schema
    const parsedSchema = await parseSchema(options.schema);

    // Create and initialize the client
    const client = new OpenAPIToolsClient({
      schema: parsedSchema,
      baseUrl: options.baseUrl,
      headers: options.headers,
      onError: options.onError,
      name: options.name
    });

    // Initialize the client and return it
    return await client.init();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create OpenAPI client: ${errorMessage}`);
  }
}

// Export types that aren't already exported inline
export type {
  HttpMethod,
  FormValues,
  OpenAPISchema,
  OpenAPIResponse,
  OpenAPIRequestBody,
  OpenAPIParameter,
  OpenAPIContent,
  OpenAPIOperation,
  OpenAPIPath,
  OpenAPIDoc,
  JsonSchema,
  ToolExecuteOptions,
  ToolExecuteFn,
  Tool,
  ToolSet,
  SchemaConfig,
  APIResponse,
  OpenAPIToolsClientOptions
}; 