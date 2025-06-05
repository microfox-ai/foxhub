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
  items?: JsonSchema | JsonSchema[]; // Allow items to be either a single schema or array of schemas
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
  items?: OpenAPISchema; // Allow items to be either a single schema or array of schemas
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
};

type OpenAPIContent = {
  schema: OpenAPISchema;
};

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
    mcp_version?: string;
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
  inputSchema: JsonSchema & { type: "object" };
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

type ToolSchemas = Record<string, ToolSchema> | "automatic";

type ToolExecuteOptions = {
  abortSignal?: AbortSignal;
};

type ToolExecuteFn = (
  args: Record<string, any>,
  options?: ToolExecuteOptions
) => Promise<any>;

type ToolSet = Record<string, Tool>;

// Schema source configuration
type SchemaConfig = {
  /**
   * Source of the OpenAPI schema
   * - object: direct OpenAPIDoc object
   * - text: JSON string of the schema
   * - url: URL to fetch the schema from
   */
  type: "object" | "text" | "url";

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
   * Preset fields to include in request bodies
   * These will be merged with the actual request data, with user-provided fields taking precedence
   */
  presetBodyFields?: Record<string, any>;

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
  private clients: SingleOpenAPIToolsClient[] = [];
  private initialized: boolean = false;

  constructor(
    options: OpenAPIToolsClientOptions | OpenAPIToolsClientOptions[]
  ) {
    // Convert single option to array for unified handling
    const optionsArray = Array.isArray(options) ? options : [options];

    // Create a client for each option
    optionsArray.forEach((opt, index) => {
      this.clients.push(
        new SingleOpenAPIToolsClient({
          ...opt,
          schema:
            typeof opt.schema === "string"
              ? JSON.parse(opt.schema)
              : opt.schema,
          name:
            opt.name ||
            `${(opt.schema as OpenAPIDoc).info.title.toLowerCase().replace(/ /g, "_")}`,
        })
      );
    });
  }

  /**
   * Initialize all clients
   */
  async init(): Promise<OpenAPIToolsClient> {
    if (this.initialized) {
      return this;
    }

    try {
      // Initialize all clients in parallel, each will parse its schema
      await Promise.all(this.clients.map((client) => client.init()));
      this.initialized = true;
      return this;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during initialization";

      throw new Error(`Failed to initialize OpenAPI clients: ${errorMessage}`);
    }
  }

  /**
   * List all available API operations from all OpenAPI schemas
   */
  async listOperations() {
    if (!this.initialized) {
      throw new Error("Clients not initialized. Call init() first.");
    }

    // Get operations from all clients
    const allOperationsResults = await Promise.all(
      this.clients.map((client) => client.listOperations())
    );

    // Combine operations from all clients with properly namespaced IDs
    const operations = allOperationsResults.flatMap((result, index) => {
      const client = this.clients[index];
      if (!client) return []; // Skip if client is undefined

      return result.operations.map((op) => ({
        ...op,
        // Add client name to ID to avoid conflicts
        id: `${client.getName()}-${op.id}`,
      }));
    });

    return { operations };
  }

  /**
   * Call a specific API operation from any client
   */
  async callOperation(
    id: string,
    args: Record<string, any> = {},
    options?: ToolExecuteOptions
  ) {
    if (!this.initialized) {
      throw new Error("Clients not initialized. Call init() first.");
    }

    // Extract client name and operation ID
    const [clientName, operationId] = id.split(":");
    if (!clientName || !operationId) {
      throw new Error(
        `Invalid operation ID format: ${id}. Expected format: "clientName:operationId"`
      );
    }

    // Find the client
    const client = this.clients.find((c) => c.getName() === clientName);
    if (!client) {
      throw new Error(`Client "${clientName}" not found.`);
    }

    // Call the operation on the client
    return client.callOperation(operationId, args, options);
  }

  /**
   * Returns a set of tools generated from all OpenAPI schemas
   */
  async tools({
    schemas = "automatic",
    validateParameters = false,
  }: {
    schemas?: ToolSchemas;
    validateParameters?: boolean; // When true, validates parameters against the schema
  } = {}): Promise<ToolSet> {
    if (!this.initialized) {
      throw new Error("Clients not initialized. Call init() first.");
    }

    // Get tools from all clients
    const allToolsResults = await Promise.all(
      this.clients.map((client) =>
        client.tools({
          schemas,
          validateParameters, // Pass validation option to each client
        })
      )
    );

    // Combine tools from all clients
    const combinedTools: ToolSet = {};

    allToolsResults.forEach((toolSet, index) => {
      const client = this.clients[index];
      if (!client) return; // Skip if client is undefined (shouldn't happen)

      const clientName = client.getName();

      Object.entries(toolSet).forEach(([key, tool]) => {
        // Create a namespaced key to avoid collisions
        const namespacedKey = `${clientName}-${key}`;

        combinedTools[namespacedKey] = {
          ...tool,
          name: namespacedKey, // Update name to include namespace
        };
      });
    });

    return combinedTools;
  }
}

/**
 * Individual client for interacting with a single API described by an OpenAPI schema
 */
class SingleOpenAPIToolsClient {
  private schema: OpenAPIDoc;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private presetBodyFields: Record<string, any>;
  private onError?: (error: Error) => void;
  private operationMap: Map<
    string,
    OpenAPIOperation & { path: string; method: string }
  >;
  private name: string;
  private initialized: boolean = false;
  private schemaCache: Record<string, JsonSchema> = {};
  private mcp_version: string;

  constructor(options: {
    schema: OpenAPIDoc;
    baseUrl?: string;
    headers?: Record<string, string>;
    presetBodyFields?: Record<string, any>;
    onError?: (error: Error) => void;
    name?: string;
  }) {
    this.schema = options.schema;
    this.baseUrl = options.baseUrl || "";
    this.defaultHeaders = options.headers || {};
    this.presetBodyFields = options.presetBodyFields || {};
    this.onError = options.onError;
    this.operationMap = new Map();
    this.name = options.name || "openapi-tools-client";
    this.mcp_version = options.schema.info.mcp_version || "1.0.0";
  }

  /**
   * Get client name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Initialize the client
   */
  async init(): Promise<SingleOpenAPIToolsClient> {
    if (this.initialized) {
      return this;
    }

    try {
      // Set base URL from schema if not provided
      if (
        !this.baseUrl &&
        this.schema.servers &&
        this.schema.servers.length > 0
      ) {
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
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during initialization";

      if (this.onError && error instanceof Error) {
        this.onError(error);
      }

      throw new Error(`Failed to initialize OpenAPI client: ${errorMessage}`);
    }
  }

  private cleanUpMethodSchema(methodSchema: OpenAPIOperation) {
    let cleanedMethodSchema = methodSchema;
    if (this.mcp_version === "1.0.1") {
      if (cleanedMethodSchema?.requestBody?.content["application/json"]?.schema?.properties?.body?.properties?.arguments) {
        let bodySchema = methodSchema.requestBody?.content["application/json"]?.schema?.properties;
        const args = bodySchema?.body?.properties?.arguments?.items;
        if (args && Array.isArray(args)) {
          // if (args.length === 1) {
          //   bodySchema = args[0];
          // } else {
          bodySchema = args.reduce((acc, arg, index) => {
            acc[`arg_${index}`] = arg;
            return acc;
          }, {});
          // }
        }
        cleanedMethodSchema.requestBody.content["application/json"].schema.properties = bodySchema;
      }
    }
    return cleanedMethodSchema;
  }

  private setupOperationMap() {
    for (const [path, methods] of Object.entries(this.schema.paths)) {
      for (const [method, pathOperation] of Object.entries(
        methods as OpenAPIPath
      )) {
        const operation = pathOperation
        const operationId = this.generateOperationId(path, method, operation);

        this.operationMap.set(operationId, {
          ...operation,
          path,
          method: method.toUpperCase(),
        });
      }
    }
  }

  private generateOperationId(
    path: string,
    method: string,
    operation: OpenAPIOperation
  ): string {
    // First priority: use the operationId from the schema if available
    if (operation.operationId) {
      return operation.operationId;
    }

    // Second priority: generate an ID from the path and method
    const pathPart = path
      .replace(/^\/|\/$/g, "")
      .replace(/-/g, "_")
      .replace(/\/\{([^}]+)\}/g, "_by_$1")
      .replace(/\//g, "_");

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
      const pathParams = operation.parameters.filter(
        (param) => param.in === "path"
      );
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
      const queryParams = operation.parameters.filter(
        (param) => param.in === "query"
      );
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
      const headerParams = operation.parameters.filter(
        (param) => param.in === "header"
      );
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
      body = JSON.stringify(args.body);
    }

    return { url, headers, body };
  }

  private async makeRequest(options: FetchOptions): Promise<APIResponse> {
    const { url, method, headers, body, signal } = options;

    try {
      console.log("Making request", { url, method, headers: JSON.stringify(headers, null, 2), body: JSON.stringify(body, null, 2) });
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
      console.log("Response", { status: response.status, contentType, data });

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

      throw new Error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    }
  }

  /**
   * List all available API operations from the OpenAPI schema
   * Operations are individual API endpoints defined in the OpenAPI schema
   */
  async listOperations() {
    if (!this.initialized) {
      throw new Error("Client not initialized. Call init() first.");
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
        method: operation.method,
      });
    }

    return { operations };
  }

  /**
   * Call a specific API operation from the OpenAPI schema
   */
  async callOperation(
    id: string,
    args: Record<string, any> = {},
    options?: ToolExecuteOptions
  ) {
    if (!this.initialized) {
      throw new Error("Client not initialized. Call init() first.");
    }

    const operation = this.operationMap.get(id);
    if (!operation) {
      throw new Error(
        `Operation "${id}" not found. Available operations: ${Array.from(this.operationMap.keys()).join(", ")}`
      );
    }

    const { url, headers, body } = this.prepareRequest(operation, args);

    return this.makeRequest({
      url,
      method: operation.method,
      headers,
      body,
      signal: options?.abortSignal,
    });
  }

  /**
   * Convert operation to JSON Schema
   */
  private convertOperationToJsonSchema(
    operation: OpenAPIOperation & { path: string; method: string }
  ): JsonSchema & { type: "object" } {
    const schema: JsonSchema & { type: "object" } = {
      type: "object",
      properties: {},
      required: [],
      $defs: this.convertComponentsToJsonSchema(),
    };

    // Handle parameters (query, path, header params)
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.schema) {
          const paramSchema = this.convertOpenApiSchemaToJsonSchema(
            param.schema,
            new Set()
          );
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

    // Handle request body - preserve the nested structure
    if (operation.requestBody?.content) {
      if (operation.requestBody.content["application/json"]?.schema) {
        const bodySchema = this.convertOpenApiSchemaToJsonSchema(
          operation.requestBody.content["application/json"].schema,
          new Set()
        );

        // console.log(`🔍 Original body schema for ${operation.operationId}:`, JSON.stringify(bodySchema, null, 2));

        // Don't flatten - preserve the request body structure
        // Add the entire body schema as a single property
        if (bodySchema.type === "object") {
          // If the body schema has properties, add them as individual top-level properties
          // This allows the tool to accept the request body structure directly
          if (bodySchema.properties) {
            for (const [name, propSchema] of Object.entries(
              bodySchema.properties
            )) {
              schema.properties![name] = propSchema;
            }
            if (bodySchema.required) {
              schema.required!.push(...bodySchema.required);
            }
          }
        } else {
          // For non-object body schemas (arrays, primitives), add as 'body' parameter
          schema.properties!["body"] = bodySchema;
          if (operation.requestBody.required) {
            schema.required!.push("body");
          }
        }

        // console.log(
        //   `🔍 Final tool schema for ${operation.operationId}:`,
        //   JSON.stringify(schema, null, 2)
        // );
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
   * Resolve a $ref reference to its schema in the openApiSpec
   */
  private internalResolveRef(
    ref: string,
    resolvedRefs: Set<string>
  ): OpenAPISchema | null {
    if (!ref.startsWith("#/")) {
      return null;
    }
    if (resolvedRefs.has(ref)) {
      return null;
    }

    const parts = ref.replace(/^#\//, "").split("/");
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
    resolveRefs: boolean = false
  ): JsonSchema {
    if (schema.$ref) {
      const ref = schema.$ref;
      if (!resolveRefs) {
        if (ref.startsWith("#/components/schemas/")) {
          return {
            $ref: ref.replace(/^#\/components\/schemas\//, "#/$defs/"),
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
          $ref: ref.replace(/^#\/components\/schemas\//, "#/$defs/"),
          description: schema.description || "",
        };
      } else {
        const converted = this.convertOpenApiSchemaToJsonSchema(
          resolved,
          resolvedRefs,
          resolveRefs
        );
        this.schemaCache[ref] = converted;
        return converted;
      }
    }

    const result: JsonSchema = {};

    if (schema.type) {
      result.type = schema.type;
    }

    if (schema.format === "binary") {
      result.format = "uri-reference";
      const binaryDesc = "absolute paths to local files";
      result.description = schema.description
        ? `${schema.description} (${binaryDesc})`
        : binaryDesc;
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

    if (schema.type === "object") {
      result.type = "object";
      if (schema.properties) {
        result.properties = {};
        for (const [name, propSchema] of Object.entries(schema.properties)) {
          result.properties[name] = this.convertOpenApiSchemaToJsonSchema(
            propSchema,
            resolvedRefs,
            resolveRefs
          );
        }
      }
      if (schema.required) {
        result.required = schema.required;
      }
      if (
        schema.additionalProperties === true ||
        schema.additionalProperties === undefined
      ) {
        result.additionalProperties = true;
      } else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        result.additionalProperties = this.convertOpenApiSchemaToJsonSchema(
          schema.additionalProperties,
          resolvedRefs,
          resolveRefs
        );
      } else {
        result.additionalProperties = false;
      }
    }

    if (schema.type === "array") {
      result.type = "array";
      if (schema.items) {
        // Handle both single schema and array of schemas (tuple validation)
        if (Array.isArray(schema.items)) {
          // For tuple validation, items is an array of schemas
          result.items = schema.items.map((itemSchema: OpenAPISchema) =>
            this.convertOpenApiSchemaToJsonSchema(
              itemSchema,
              resolvedRefs,
              resolveRefs
            )
          );
        } else {
          // For regular arrays, items is a single schema
          result.items = this.convertOpenApiSchemaToJsonSchema(
            schema.items,
            resolvedRefs,
            resolveRefs
          );
        }
      } else {
        // If no items specified, default to object type for Google AI compatibility
        // console.log(`🔍 Array without items, defaulting to object type`);
        result.items = {
          type: "object",
          additionalProperties: true,
        };
      }
    }

    if (schema.oneOf) {
      result.oneOf = schema.oneOf.map((s: OpenAPISchema) =>
        this.convertOpenApiSchemaToJsonSchema(s, resolvedRefs, resolveRefs)
      );
    }
    if (schema.anyOf) {
      result.anyOf = schema.anyOf.map((s: OpenAPISchema) =>
        this.convertOpenApiSchemaToJsonSchema(s, resolvedRefs, resolveRefs)
      );
    }
    if (schema.allOf) {
      result.allOf = schema.allOf.map((s: OpenAPISchema) =>
        this.convertOpenApiSchemaToJsonSchema(s, resolvedRefs, resolveRefs)
      );
    }

    return result;
  }

  /**
   * Convert OpenAPI schema to Zod schema
   * Ensures that any property not in the required array is made optional
   * Ensures arrays have proper item schemas for AI SDK compatibility
   */
  private convertOpenApiSchemaToZod(schema: JsonSchema): z.ZodType {
    // console.log(`🔍 Converting schema to Zod:`, { type: schema.type, hasProperties: !!schema.properties, hasItems: !!schema.items });

    if (!schema.type) {
      console.log(`🔍 No type specified, returning z.any()`);
      return z.any();
    }

    switch (schema.type) {
      case "string":
        // console.log(`🔍 Creating string schema`);
        let stringSchema = z.string();
        // Only use formats supported by Google AI API
        if (schema.format === "date-time") {
          stringSchema = z.string().datetime();
        }
        if (schema.description) {
          stringSchema = stringSchema.describe(schema.description);
        }
        return stringSchema;

      case "number":
      case "integer":
        // console.log(`🔍 Creating number schema`);
        let numberSchema =
          schema.type === "integer" ? z.number().int() : z.number();
        if (schema.description) {
          numberSchema = numberSchema.describe(schema.description);
        }
        return numberSchema;

      case "boolean":
        // console.log(`🔍 Creating boolean schema`);
        let booleanSchema = z.boolean();
        if (schema.description) {
          booleanSchema = booleanSchema.describe(schema.description);
        }
        return booleanSchema;

      case "array":
        // console.log(`🔍 Converting array schema:`, { hasItems: !!schema.items, isItemsArray: Array.isArray(schema.items) });

        // For arrays, always ensure we have a proper item schema
        let itemSchema: z.ZodType;

        if (!schema.items) {
          // console.log(`🔍 No items specified, using z.object({}).passthrough()`);
          // Use passthrough object instead of z.record for better JSON schema generation
          itemSchema = z.object({}).passthrough();
        } else if (Array.isArray(schema.items)) {
          // console.log(`🔍 Converting tuple to regular array for AI SDK compatibility`);
          if (schema.items.length === 0) {
            itemSchema = z.object({}).passthrough();
          } else {
            // console.log(`🔍 Using first tuple item as array element type:`, schema.items[0]?.type);
            const firstItemSchema = schema.items[0];
            if (!firstItemSchema) {
              // console.log(`🔍 No first item found, using z.object({}).passthrough()`);
              itemSchema = z.object({}).passthrough();
            } else {
              itemSchema = this.convertOpenApiSchemaToZod(firstItemSchema);
            }
          }
        } else {
          // console.log(`🔍 Creating array with single item type`);
          itemSchema = this.convertOpenApiSchemaToZod(schema.items);
        }

        let arraySchema = z.array(itemSchema);
        if (schema.description) {
          arraySchema = arraySchema.describe(schema.description);
        }
        // console.log(`🔍 Created array schema with proper item type`);
        return arraySchema;

      case "object":
        // console.log(`🔍 Converting object schema:`, {
        //   propertyCount: schema.properties ? Object.keys(schema.properties).length : 0,
        //   requiredCount: schema.required ? schema.required.length : 0,
        //   properties: schema.properties ? Object.keys(schema.properties) : [],
        //   required: schema.required || []
        // });

        if (!schema.properties || Object.keys(schema.properties).length === 0) {
          // console.log(`🔍 No properties, returning z.object({}).passthrough()`);
          // Use passthrough for better JSON schema generation
          return z.object({}).passthrough();
        }

        const shape: Record<string, z.ZodType> = {};

        // Convert all properties first
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          // console.log(`🔍 Converting property "${key}":`, propSchema.type);
          const propZodSchema = this.convertOpenApiSchemaToZod(propSchema);

          // Check if this property is required
          const isRequired = schema.required && schema.required.includes(key);
          // console.log(`🔍 Property "${key}" is ${isRequired ? 'required' : 'optional'}`);

          if (isRequired) {
            shape[key] = propZodSchema;
          } else {
            shape[key] = propZodSchema.optional();
          }
        }

        // console.log(`🔍 Creating object with ${Object.keys(shape).length} properties`);
        let objectSchema = z.object(shape);
        if (schema.description) {
          objectSchema = objectSchema.describe(schema.description);
        }

        // console.log(`🔍 Created object schema successfully`);
        return objectSchema;

      default:
        // console.log(`🔍 Unknown type "${schema.type}", returning z.any()`);
        return z.any();
    }
  }

  /**
   * Returns a set of tools generated from the OpenAPI schema
   */
  async tools({
    schemas = "automatic",
    validateParameters = false,
  }: {
    schemas?: ToolSchemas;
    validateParameters?: boolean; // When true, validates parameters against the schema
  } = {}): Promise<ToolSet> {
    if (!this.initialized) {
      throw new Error("Client not initialized. Call init() first.");
    }

    const tools: ToolSet = {};

    // Get all available operations
    const { operations } = await this.listOperations();

    for (const operation of operations) {
      const id = operation.id;

      // Skip operations not in schemas if schemas is provided
      if (schemas !== "automatic" && !(id in schemas)) {
        continue;
      }

      // Get the full operation details from the map
      const fullOperation = this.operationMap.get(id) as OpenAPIOperation;

      // Clean up the operation schema for MCP 1.0.1
      const cleanedOperation = this.cleanUpMethodSchema(fullOperation) as OpenAPIOperation & { path: string, method: string };
      if (!cleanedOperation.path || !cleanedOperation.method) continue;

      // Convert operation schema to JSON schema and then to Zod schema
      const jsonSchema = this.convertOperationToJsonSchema(cleanedOperation);
      const zodSchema = this.convertOpenApiSchemaToZod(jsonSchema);

      // // Better Zod schema debugging
      // try {
      //   // Recursive function to inspect Zod schema shapes
      //   const inspectZodShape = (schema: any, path: string = '', depth: number = 0): void => {
      //     if (depth > 6) return; // Increase depth limit to see more nesting

      //     const indent = '  '.repeat(depth);
      //     console.log(`${indent}🔍 Inspecting ${path || 'root'} (${schema._def?.typeName || 'unknown'})`);

      //     if (schema._def?.typeName === 'ZodObject') {
      //       const shape = schema._def.shape();
      //       const keys = Object.keys(shape || {});
      //       console.log(`${indent}  Object keys: [${keys.join(', ')}]`);

      //       // Inspect each property
      //       for (const [key, propSchema] of Object.entries(shape || {})) {
      //         const newPath = path ? `${path}.${key}` : key;
      //         inspectZodShape(propSchema, newPath, depth + 1);
      //       }
      //     } else if (schema._def?.typeName === 'ZodArray') {
      //       console.log(`${indent}  Array element type: ${schema._def.type._def?.typeName || 'unknown'}`);
      //       inspectZodShape(schema._def.type, `${path}[]`, depth + 1);
      //     } else if (schema._def?.typeName === 'ZodTuple') {
      //       const items = schema._def.items || [];
      //       console.log(`${indent}  Tuple with ${items.length} items:`);
      //       items.forEach((item: any, index: number) => {
      //         console.log(`${indent}  --- Tuple Item ${index} ---`);
      //         inspectZodShape(item, `${path}[${index}]`, depth + 1);
      //       });
      //     } else if (schema._def?.typeName === 'ZodOptional') {
      //       console.log(`${indent}  Optional wrapper around: ${schema._def.innerType._def?.typeName || 'unknown'}`);
      //       inspectZodShape(schema._def.innerType, `${path} (optional)`, depth + 1);
      //     } else {
      //       const schemaType = schema._def?.typeName || 'unknown';
      //       console.log(`${indent}  Primitive type: ${schemaType}`);
      //       // For strings, show format if available
      //       if (schemaType === 'ZodString' && schema._def?.checks) {
      //         const checks = schema._def.checks.map((check: any) => check.kind).join(', ');
      //         if (checks) console.log(`${indent}    Format checks: ${checks}`);
      //       }
      //     }
      //   };

      //   console.log(`🔍 === COMPLETE ZOD SCHEMA STRUCTURE ===`);
      //   inspectZodShape(zodSchema);
      //   console.log(`🔍 === END SCHEMA STRUCTURE ===`);

      //   // Test specific arguments structure
      //   console.log(`🔍 === TESTING ARGUMENTS ARRAY STRUCTURE ===`);
      //   const testBodyWithArguments = {
      //     body: {
      //       arguments: [{}] // Empty argument object to see what's required
      //     }
      //   };
      //   const argsValidation = zodSchema.safeParse(testBodyWithArguments);
      //   console.log(`🔍 Arguments validation result:`, {
      //     success: argsValidation.success,
      //     errorCount: argsValidation.success ? 0 : argsValidation.error.issues.length
      //   });

      //   if (!argsValidation.success) {
      //     console.log(`🔍 Arguments validation errors:`,
      //       argsValidation.error.issues.map(issue => ({
      //         path: issue.path.join('.'),
      //         message: issue.message,
      //         expected: issue.code
      //       }))
      //     );
      //   }
      //   console.log(`🔍 === END ARGUMENTS TEST ===`);

      // } catch (e) {
      //   console.log(`🔍 Zod schema validation error:`, e);
      // }
      // // Zod schema created successfully

      // Create the tool
      const description =
        operation.description ||
        operation.summary ||
        `${operation.method} ${operation.path}`;
      const self = this;

      tools[id] = {
        name: id,
        description,
        parameters: zodSchema,
        execute: async (args, options) => {
          console.log(`🔍 Calling tool ${id} with args:`, JSON.stringify(args, null, 2));

          // Throw if aborted
          options?.abortSignal?.throwIfAborted();

          // If validation is enabled, validate the arguments against Zod schema
          // if (validateParameters) {
          //   try {
          //     // Parse and validate arguments against the schema
          //     const validatedArgs = zodSchema.parse(args);
          //     return self.callOperation(id, validatedArgs, options);
          //   } catch (error) {
          //     // Format validation errors in a user-friendly way
          //     if (error instanceof z.ZodError) {
          //       const formattedError = new Error(
          //         `Parameter validation failed: ${error.errors.map(e =>
          //           `${e.path.join('.')}: ${e.message}`
          //         ).join(', ')}`
          //       );
          //       formattedError.name = 'ValidationError';
          //       throw formattedError;
          //     }
          //     throw error;
          //   }
          // }

          // MCP 1.0.1 specific arguments structure
          if (this.mcp_version === "1.0.1") {
            args = {
              body: {
                body: {
                  arguments: Object.values(args),
                  auth: this.presetBodyFields.auth,
                  packageName: this.presetBodyFields.packageName,
                }
              }
            }
            console.log(`🔍 Restructured args for MCP 1.0.1:`, JSON.stringify(args, null, 2));
          }

          // Call the operation without validation
          return self.callOperation(id, args, options);
        },
      };
    }

    return tools;
  }
}

/**
 * Parse and validate the schema configuration
 */
async function parseSchema(
  config: SchemaConfig | OpenAPIDoc | string
): Promise<OpenAPIDoc> {
  let parsedSchema: OpenAPIDoc;

  if (typeof config === "string") {
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
        throw new Error(
          `Invalid schema JSON string and failed to fetch as URL: ${fetchError.message || String(fetchError)}`
        );
      }
    }
  } else if (config && typeof config === "object") {
    if ("type" in config) {
      // Handle SchemaConfig object
      if (
        config.type === "object" &&
        config.schema &&
        typeof config.schema !== "string"
      ) {
        parsedSchema = config.schema;
      } else if (
        config.type === "text" &&
        config.schema &&
        typeof config.schema === "string"
      ) {
        try {
          parsedSchema = JSON.parse(config.schema);
        } catch (error) {
          throw new Error("Invalid schema JSON string");
        }
      } else if (config.type === "url" && config.url) {
        // Fetch from URL
        try {
          const response = await fetch(config.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch schema from URL: ${config.url}`);
          }
          parsedSchema = await response.json();
        } catch (error: any) {
          throw new Error(
            `Failed to fetch schema from URL: ${error.message || String(error)}`
          );
        }
      } else {
        throw new Error(
          "Invalid schema configuration: missing required properties for the specified type"
        );
      }
    } else {
      // Assume it's a raw OpenAPIDoc object
      parsedSchema = config as OpenAPIDoc;
    }
  } else {
    throw new Error("Invalid schema configuration");
  }

  return parsedSchema;
}

/**
 * Create an OpenAPI client for interacting with an API described by an OpenAPI schema
 * The client can be used to call API operations directly or generate AI SDK-compatible tools
 *
 * @param options Client configuration options (single or array for multiple schemas)
 *   - schema: The OpenAPI schema configuration
 *   - baseUrl: Optional base URL to override schema servers
 *   - headers: Custom headers to include with every request
 *   - presetBodyFields: Fields to automatically include in request bodies (can be overridden by tool callers)
 *   - onError: Error handler function
 *   - name: Custom name for the client instance
 * @returns OpenAPIToolsClient instance
 */
export async function createOpenAPIToolsClient(
  options: OpenAPIToolsClientOptions | OpenAPIToolsClientOptions[]
): Promise<OpenAPIToolsClient> {
  try {
    // Handle single option or array of options
    const isArray = Array.isArray(options);

    if (isArray) {
      // For multiple schemas, parse each one independently
      const parsedOptions = await Promise.all(
        options.map(async (opt) => {
          const parsedSchema = await parseSchema(opt.schema);
          return {
            ...opt,
            schema: parsedSchema,
          };
        })
      );

      // Create the client with parsed schemas
      const client = new OpenAPIToolsClient(parsedOptions);
      return await client.init();
    } else {
      // For a single schema
      const parsedSchema = await parseSchema(options.schema);
      const client = new OpenAPIToolsClient({
        ...options,
        schema: parsedSchema,
      });
      return await client.init();
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to create OpenAPI client: ${errorMessage}`);
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
  OpenAPIToolsClientOptions,
};
