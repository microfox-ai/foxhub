import { cn } from "@/lib/utils";
import { OpenAPIOperation, OpenAPIParameter, OpenAPISchema } from "./types";

// Function to get color class based on HTTP method
export const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-green-100 text-green-700";
    case "POST":
      return "bg-blue-100 text-blue-700";
    case "PUT":
      return "bg-yellow-100 text-yellow-700";
    case "DELETE":
      return "bg-red-100 text-red-700";
    case "PATCH":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// Function to get color class based on HTTP status code
export const getStatusColor = (status: string) => {
  const statusNum = parseInt(status);
  if (statusNum >= 200 && statusNum < 300) {
    return "bg-green-100 text-green-700"; // Success
  } else if (statusNum >= 300 && statusNum < 400) {
    return "bg-blue-100 text-blue-700"; // Redirection
  } else if (statusNum >= 400 && statusNum < 500) {
    return "bg-yellow-100 text-yellow-700"; // Client Error
  } else if (statusNum >= 500) {
    return "bg-red-100 text-red-700"; // Server Error
  }
  return "bg-gray-100 text-gray-700"; // Default
};

// Function to build example URL with parameters for GET requests
export const buildExampleUrl = (
  baseUrl: string,
  endpointData: (OpenAPIOperation & { method: string; path: string }) | null
) => {
  if (!endpointData) return baseUrl;

  let url = baseUrl + endpointData.path;

  // Only add parameters for GET requests
  if (endpointData.method === "GET" && endpointData.parameters) {
    // Process path parameters
    const pathParams = endpointData.parameters.filter(
      (param: OpenAPIParameter) => param.in === "path"
    );

    pathParams.forEach((param: OpenAPIParameter) => {
      if (param.schema.example !== undefined) {
        url = url.replace(
          `{${param.name}}`,
          encodeURIComponent(String(param.schema.example))
        );
      }
    });

    // Process query parameters
    const queryParams = endpointData.parameters.filter(
      (param: OpenAPIParameter) => param.in === "query"
    );

    if (queryParams.length > 0) {
      const queryString = queryParams
        .map((param: OpenAPIParameter) => {
          if (param.schema.example !== undefined) {
            return `${encodeURIComponent(param.name)}=${encodeURIComponent(String(param.schema.example))}`;
          }
          return null;
        })
        .filter(Boolean)
        .join("&");

      if (queryString) {
        url += `?${queryString}`;
      }
    }
  }

  return url;
};

// Function to get placeholder text for form fields
export const getPlaceholder = (
  fieldName: string,
  type: string,
  isGetRequest: boolean,
  example?: any
) => {
  const name = fieldName.replace(/^(path|query|header)_/, "");

  // For GET requests, include the example in the placeholder if available
  if (isGetRequest && example !== undefined) {
    const exampleValue =
      typeof example === "object" ? JSON.stringify(example) : example;

    switch (type) {
      case "string":
        return `Enter ${name} (e.g. ${exampleValue})`;
      case "number":
      case "integer":
        return `Enter numeric value for ${name} (e.g. ${exampleValue})`;
      case "array":
        return `Enter JSON array for ${name} (e.g. ${exampleValue})`;
      case "object":
        return `Enter JSON object for ${name} (e.g. ${exampleValue})`;
      default:
        return `Enter ${name} (e.g. ${exampleValue})`;
    }
  }

  // Default placeholders without examples
  switch (type) {
    case "string":
      return `Enter ${name}`;
    case "number":
    case "integer":
      return `Enter numeric value for ${name}`;
    case "array":
      return `Enter JSON array for ${name}`;
    case "object":
      return `Enter JSON object for ${name}`;
    default:
      return `Enter ${name}`;
  }
};
