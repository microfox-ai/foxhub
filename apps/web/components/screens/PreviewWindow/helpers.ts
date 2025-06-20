export interface FetchApiOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal: AbortSignal;
  setResponse: (value: any) => void;
}

export interface FetchLogsOptions {
  clientDeploymentId: string;
  endpointLink: string;
  setServerlessLogs?: (value: any) => void;
}

export interface PrepareApiRequestOptions {
  baseUrl: string;
  path: string;
  method: string;
  data: Record<string, any>;
  parameters?: Array<{
    in: string;
    name: string;
    schema: any;
    required?: boolean;
  }>;
  requestBody?: {
    content?: {
      "application/json"?: {
        schema?: {
          type?: string;
          properties?: Record<string, any>;
          items?: Record<string, any>;
        };
      };
    };
  };
}

export interface PreparedApiRequest {
  url: string;
  headers: Record<string, string>;
  body?: string;
}

// Helper function to get nested value from data object
function getNestedValue(
  data: Record<string, any>,
  key: string,
  schema?: any
): any {
  const parts = key.split(/[.[\]]/).filter(Boolean);
  let value: any = data;

  for (const part of parts) {
    if (value === undefined || value === null || typeof value !== "object")
      return undefined;
    if (part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  // Handle string arrays by splitting comma-separated values
  if (
    schema?.type === "array" &&
    schema?.items?.type === "string" &&
    typeof value === "string"
  ) {
    return value.split(",").map((item) => item.trim());
  }

  // Handle nested objects
  if (
    schema?.type === "object" &&
    schema?.properties &&
    typeof value === "object"
  ) {
    const result: Record<string, any> = {};
    for (const [propKey, propSchema] of Object.entries(schema.properties)) {
      if (value[propKey] !== undefined) {
        result[propKey] = getNestedValue(value, propKey, propSchema);
      }
    }
    return result;
  }

  return value;
}

// Helper function to set nested value in data object
function setNestedValue(
  obj: Record<string, any>,
  key: string,
  value: any
): void {
  const parts = key.split(/[.[\]]/).filter(Boolean);
  if (parts.length === 0) return;

  let current: Record<string, any> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;

    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    current[lastPart] = value;
  }
}

export function prepareApiRequest(
  options: PrepareApiRequestOptions
): PreparedApiRequest {
  const { baseUrl, path, method, data, parameters, requestBody } = options;
  let url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Process path parameters
  if (parameters) {
    const pathParams = parameters.filter((param) => param.in === "path");
    pathParams.forEach((param) => {
      const paramValue = getNestedValue(data, `path_${param.name}`);
      if (paramValue !== undefined) {
        url = url.replace(
          `{${param.name}}`,
          encodeURIComponent(String(paramValue))
        );
      }
    });

    // Process query parameters
    const queryParams = parameters.filter((param) => param.in === "query");
    if (queryParams.length > 0) {
      const queryString = queryParams
        .map((param) => {
          const paramValue = getNestedValue(data, `query_${param.name}`);
          if (paramValue !== undefined) {
            // Convert boolean values to "true" string
            const stringValue =
              typeof paramValue === "boolean"
                ? String(paramValue)
                : String(paramValue);
            return `${encodeURIComponent(param.name)}=${encodeURIComponent(stringValue)}`;
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
    const headerParams = parameters.filter((param) => param.in === "header");
    headerParams.forEach((param) => {
      const paramValue = getNestedValue(data, `header_${param.name}`);
      if (paramValue !== undefined) {
        headers[param.name] = String(paramValue);
      }
    });
  }

  // Prepare request body for POST/PUT/PATCH requests
  let body: string | undefined;
  if (
    ["POST", "PUT", "PATCH"].includes(method) &&
    requestBody?.content?.["application/json"]?.schema
  ) {
    const requestBodySchema = requestBody.content["application/json"].schema;

    if (requestBodySchema.type === "object" && requestBodySchema.properties) {
      const bodyData: Record<string, any> = {};

      // Process each property in the request body
      Object.entries(requestBodySchema.properties).forEach(([key, schema]) => {
        const value = getNestedValue(data, `body_${key}`);
        if (value !== undefined) {
          try {
            if (schema.type === "array") {
              if (typeof value === "string") {
                if (value.startsWith("[")) {
                  bodyData[key] = JSON.parse(value);
                } else {
                  bodyData[key] = value.split(",").map((item) => item.trim());
                }
              } else {
                bodyData[key] = value;
              }
            } else if (schema.type === "object") {
              if (typeof value === "string") {
                if (value.startsWith("{")) {
                  bodyData[key] = JSON.parse(value);
                } else {
                  bodyData[key] = value;
                }
              } else {
                bodyData[key] = value;
              }
            } else if (schema.type === "number" || schema.type === "integer") {
              bodyData[key] = Number(value);
            } else if (schema.type === "boolean") {
              bodyData[key] = value === "true";
            } else {
              bodyData[key] = value;
            }
          } catch (e) {
            // If parsing fails, use the value as is
            bodyData[key] = value;
          }
        }
      });
      body = JSON.stringify(bodyData);
    } else if (requestBodySchema.type === "array" && requestBodySchema.items) {
      const value = getNestedValue(data, "body");
      if (value !== undefined) {
        try {
          if (Array.isArray(value)) {
            body = JSON.stringify(value);
          } else if (typeof value === "string" && value.includes(",")) {
            body = JSON.stringify(value?.split(",").map((item) => item.trim()));
          } else if (typeof value === "string") {
            body = JSON.stringify([value]);
          } else {
            body = JSON.stringify([value]);
          }
        } catch (e) {
          body = JSON.stringify([]);
        }
      }
    } else {
      const value = getNestedValue(data, "body");
      if (value !== undefined) {
        try {
          if (
            requestBodySchema.type === "number" ||
            requestBodySchema.type === "integer"
          ) {
            body = JSON.stringify(Number(value));
          } else if (requestBodySchema.type === "boolean") {
            body = JSON.stringify(value === "true");
          } else {
            body = JSON.stringify(value);
          }
        } catch (e) {
          body = JSON.stringify(value);
        }
      }
    }
  } else {
    const bodyParams = parameters?.filter((param) => param.in === "body");
    if (bodyParams?.length) {
      const bodyData: Record<string, any> = {};
      bodyParams.forEach((param) => {
        const paramValue = getNestedValue(
          data,
          `body_${param.name}`,
          param.schema
        );
        if (paramValue !== undefined) {
          bodyData[param.name] = paramValue;
        }
      });
      body = JSON.stringify(bodyData.body);
    }
  }

  return { url, headers, body };
}

export interface FetchApiResponse {
  data: any;
  contentType: string;
  status: number;
}

export async function makeApiCallWithResponseData(
  options: FetchApiOptions
): Promise<FetchApiResponse | null> {
  const { url, method, headers, body, signal, setResponse } = options;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal,
    });

    const contentType = response.headers.get("content-type") || "";
    let responseData;

    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else if (contentType.includes("image/")) {
      responseData = await response.blob();
    } else {
      responseData = await response.text();
    }

    options.setResponse({
      data: responseData,
      contentType,
      status: response.status,
    });
    return {
      data: responseData,
      contentType,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    } else {
      console.error("API Fetch Error:", error);
      options.setResponse({
        data: {
          error:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        },
        contentType: "application/json",
        status: 500,
      });
      return null;
    }
  }
}

export async function fetchServerlessLogs(
  options: FetchLogsOptions
): Promise<any> {
  const { clientDeploymentId, endpointLink, setServerlessLogs } = options;

  try {
    const logs = await fetch("/api/client-functions/logs", {
      method: "POST",
      body: JSON.stringify({
        clientDeploymentId,
        endpointLink,
      }),
    });
    const logsData = await logs.json();
    if (setServerlessLogs) {
      setServerlessLogs(logsData?.logs);
    }
    return logsData?.logs;
  } catch (error) {
    console.error("Error fetching logs:", error);
    if (setServerlessLogs) {
      setServerlessLogs(null);
    }
    return null;
  }
}
