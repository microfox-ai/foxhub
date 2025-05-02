import React, { createContext, useContext, useEffect, useState } from "react";
import { useTaskInstanceMetaContext } from "./TaskInstanceMetaProvider";
import {
  HttpMethod,
  OpenAPIOperation,
  OpenAPIDoc,
  OpenAPIPath,
} from "../PreviewWindow/types";

export interface Endpoint {
  path: string;
  method: HttpMethod;
  title: string;
  operationId?: string;
  operation: OpenAPIOperation;
}

interface ApiDocContextType {
  apiDoc: OpenAPIDoc | null;
  endpoints: Endpoint[];
  isLoading: boolean;
  error: Error | null;
  selectedEndpoint: string | null;
  selectedMethod: HttpMethod | null;
  setSelectedEndpoint: (path: string) => void;
  setSelectedMethod: (method: HttpMethod) => void;
  currentEndpointData:
  | (OpenAPIOperation & { method: HttpMethod; path: string })
  | null;
}

const ApiDocContext = createContext<ApiDocContextType | undefined>(undefined);

export function ApiDocProvider({ children }: { children: React.ReactNode }) {
  const { deploymentInfo } = useTaskInstanceMetaContext();
  const [apiDoc, setApiDoc] = useState<OpenAPIDoc | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod | null>(null);

  useEffect(() => {
    console.log("deploymentInfo", deploymentInfo);
    const fetchApiDocs = async () => {
      if (!deploymentInfo?.baseUrl || !deploymentInfo?.stage) {
        setApiDoc(null);
        setSelectedEndpoint(null);
        setSelectedMethod(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${deploymentInfo.baseUrl}/${deploymentInfo.stage.toLowerCase()}/docs.json`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch API documentation");
        }
        const data = await response.json();
        setApiDoc(data);
      } catch (error) {
        console.error("Failed to fetch API docs:", error);
        setError(
          error instanceof Error ? error : new Error("Unknown error occurred")
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiDocs();
  }, [deploymentInfo?.stage, deploymentInfo?.baseUrl]);

  const endpoints = apiDoc?.paths
    ? Object.entries(apiDoc.paths).flatMap(
      ([path, pathData]: [string, OpenAPIPath]) =>
        Object.entries(pathData || {}).map(
          ([method, operation]: [string, OpenAPIOperation]) => ({
            path,
            method: method.toUpperCase() as HttpMethod,
            title: operation?.summary || "",
            operationId: operation?.operationId,
            operation,
          })
        )
    )
    : [];

  const currentEndpointData =
    selectedEndpoint && selectedMethod
      ? {
        ...(apiDoc?.paths?.[selectedEndpoint]?.[
          selectedMethod.toLowerCase()
        ] as OpenAPIOperation),
        method: selectedMethod,
        path: selectedEndpoint,
      }
      : null;

  // Initialize with first endpoint if none selected
  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpoint && endpoints[0]) {
      const firstEndpoint = endpoints[0];
      setSelectedEndpoint(firstEndpoint.path);
      setSelectedMethod(firstEndpoint.method);
    }
  }, [endpoints, selectedEndpoint]);

  return (
    <ApiDocContext.Provider
      value={{
        apiDoc,
        endpoints,
        isLoading,
        error,
        selectedEndpoint,
        selectedMethod,
        setSelectedEndpoint,
        setSelectedMethod,
        currentEndpointData,
      }}
    >
      {children}
    </ApiDocContext.Provider>
  );
}

export function useApiDoc() {
  const context = useContext(ApiDocContext);
  if (context === undefined) {
    throw new Error("useApiDoc must be used within an ApiDocProvider");
  }
  return context;
}
