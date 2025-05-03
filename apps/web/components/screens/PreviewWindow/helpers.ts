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
  setServerlessLogs: (value: any) => void;
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
      const paramValue = data[`path_${param.name}`];
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
          const paramValue = data[`query_${param.name}`];
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
    const headerParams = parameters.filter((param) => param.in === "header");
    headerParams.forEach((param) => {
      const paramValue = data[`header_${param.name}`];
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
      Object.entries(requestBodySchema.properties).forEach(([key, schema]) => {
        const value = data[`body_${key}`];
        if (value !== undefined) {
          try {
            if (schema.type === "array" || schema.type === "object") {
              bodyData[key] = JSON.parse(value);
            } else if (schema.type === "number" || schema.type === "integer") {
              bodyData[key] = Number(value);
            } else if (schema.type === "boolean") {
              bodyData[key] = value === "true";
            } else {
              bodyData[key] = value;
            }
          } catch (e) {
            bodyData[key] = value;
          }
        }
      });
      body = JSON.stringify(bodyData);
    } else if (requestBodySchema.type === "array" && requestBodySchema.items) {
      const value = data["body"];
      if (value !== undefined) {
        try {
          body = JSON.stringify(JSON.parse(value));
        } catch (e) {
          body = JSON.stringify([]);
        }
      }
    } else {
      const value = data["body"];
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
): Promise<void> {
  const { clientDeploymentId, endpointLink, setServerlessLogs } = options;

  try {
    const logs = await fetch("/api/client-functions/logs", {
      method: "POST",
      body: JSON.stringify({
        clientDeploymentId,
        endpointLink,
      }),
    });
    console.log("logs", logs);
    const logsData = await logs.json();
    setServerlessLogs(logsData);
  } catch (error) {
    console.error("Error fetching logs:", error);
    setServerlessLogs(null);
  }
}
