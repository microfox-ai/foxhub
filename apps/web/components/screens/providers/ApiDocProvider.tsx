import React, { createContext, useContext, useEffect, useState } from "react";
import { useTaskInstanceMetaContext } from "./TaskInstanceMetaProvider";
import {
  HttpMethod,
  OpenAPIOperation,
  OpenAPIDoc,
  OpenAPIPath,
} from "@/utils/services/OpenAPIToolsClient";
import { ClientDeploymentMetadata } from "@/server/types";

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
  setError: (error: Error | null) => void;
  selectedEndpoint: string | null;
  selectedMethod: HttpMethod | null;
  setSelectedEndpoint: (path: string) => void;
  setSelectedMethod: (method: HttpMethod) => void;
  currentEndpointData:
  | (OpenAPIOperation & { method: HttpMethod; path: string })
  | null;
  forceBaseUrl: string | null;
  setForceBaseUrl: (url: string | null) => void;
  selectedFunctionName: string | null;
}

const ApiDocContext = createContext<ApiDocContextType | undefined>(undefined);

export function ApiDocProvider({ children }: { children: React.ReactNode }) {
  const { deploymentInfo } = useTaskInstanceMetaContext();
  const [apiDoc, setApiDoc] = useState<OpenAPIDoc | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod | null>(null);
  const [forceBaseUrl, setForceBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiDocs = async () => {
      if (!forceBaseUrl && (!deploymentInfo?.baseUrl || !deploymentInfo?.stage)) {
        setApiDoc(null);
        setSelectedEndpoint(null);
        setSelectedMethod(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const baseUrl = forceBaseUrl || deploymentInfo?.baseUrl + "/" + deploymentInfo?.stage?.toLowerCase();
      try {
        const response = await fetch(
          `${baseUrl}/docs.json`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch API documentation");
        }
        const data = await response.json();
        setApiDoc(data);
      } catch (error) {
        console.error("Failed to fetch API docs:", error);
        setForceBaseUrl(null);
        setError(
          error instanceof Error ? error : new Error("Unknown error occurred")
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiDocs();
  }, [deploymentInfo?.stage, deploymentInfo?.baseUrl, forceBaseUrl]);

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
    if (endpoints.length > 0 && selectedEndpoint && !endpoints.map((e) => e.path).includes(selectedEndpoint) && endpoints[0]) {
      const firstEndpoint = endpoints[0];
      setSelectedEndpoint(firstEndpoint.path);
      setSelectedMethod(firstEndpoint.method);
    }
  }, [endpoints, selectedEndpoint]);

  const thisFunction = (deploymentInfo?.metadata as any as ClientDeploymentMetadata)?.serverless?.functions.find(
    (f: any) =>
      f.endpointLink === selectedEndpoint || f.endpointLink.includes(selectedEndpoint)
  );
  const selectedFunctionName =
    (deploymentInfo?.metadata as any as ClientDeploymentMetadata)?.serverless?.functionBase + "-" + thisFunction?.functionName;

  return (
    <ApiDocContext.Provider
      value={{
        apiDoc,
        endpoints,
        isLoading,
        error,
        setError,
        selectedEndpoint,
        selectedMethod,
        setSelectedEndpoint,
        setSelectedMethod,
        currentEndpointData,
        setForceBaseUrl,
        forceBaseUrl,
        selectedFunctionName,
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
