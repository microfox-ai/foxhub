/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Play, X, Monitor } from "lucide-react";
import API_DOC from "./data.json";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { useLayout } from "../providers/LayoutProvider";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";

const BASE_URL =
  "https://a1n6ih708c.execute-api.ap-southeast-2.amazonaws.com/latest";

// Type definitions for API documentation
interface ApiEndpoint {
  title: string;
  description: string;
  method: string;
  path: string;
  requestBody?: {
    description: string;
    required: boolean;
    content: {
      "application/json": {
        schema: {
          type: string;
          properties: Record<string, unknown>;
        };
      };
    };
  };
  responses: {
    [key: string]: {
      description: string;
      content: {
        "application/json": {
          schema: {
            type: string;
            properties: Record<string, unknown>;
          };
        };
      };
    };
  };
  setupInstructions?: string;
}

interface ApiSection {
  title: string;
  description: string;
  endpoints: {
    [key: string]: ApiEndpoint;
  };
}

interface ApiDoc {
  title: string;
  description: string;
  version: string;
  sections: {
    [key: string]: ApiSection;
  };
}

// Get all endpoints from sections
const endpoints = Object.entries((API_DOC as ApiDoc).sections).flatMap(
  ([sectionKey, section]) =>
    Object.entries(section.endpoints).map(([endpointKey, endpoint]) => ({
      path: endpoint.path,
      method: endpoint.method,
      title: endpoint.title,
      sectionKey: sectionKey as keyof typeof API_DOC.sections,
      endpointKey:
        endpointKey as keyof (typeof API_DOC.sections)[keyof typeof API_DOC.sections]["endpoints"],
    }))
);

// Type for form values
type FormValues = Record<string, string>;

// Available HTTP methods
const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

const PreviewWindow = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    endpoints?.[0]?.path ?? ""
  );
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod>("POST");
  const [showValidation, setShowValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const { copied, copyToClipboard: copyText } = useCopyToClipboard();
  const [lastCopiedId, setLastCopiedId] = useState<string>("");

  const { isRightCollapsed, handleRightCollapse } = useLayout();

  // Get the current endpoint data
  const currentEndpoint = endpoints.find((e) => e.path === selectedEndpoint);
  const currentEndpointData = currentEndpoint
    ? ((API_DOC as ApiDoc).sections[currentEndpoint.sectionKey as string]
        ?.endpoints?.[currentEndpoint.endpointKey as string] as
        | ApiEndpoint
        | undefined)
    : null;

  // Update method when endpoint changes
  useEffect(() => {
    if (currentEndpointData) {
      setSelectedMethod(currentEndpointData.method as HttpMethod);
    }
  }, [currentEndpointData]);

  // Create form schema based on request parameters
  const createFormSchema = () => {
    if (!currentEndpointData) return z.object({});

    const schemaFields: Record<string, z.ZodType<any>> = {};

    // Add body parameters if it's a POST/PUT/PATCH request
    const properties =
      currentEndpointData.requestBody?.content?.["application/json"]?.schema
        ?.properties;
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        const required = currentEndpointData.requestBody?.required;
        const isRequired = Array.isArray(required) && required.includes(key);
        const schema = z.string();
        schemaFields[key] = isRequired
          ? schema.min(1, { message: "This field is required" })
          : schema.optional();
      });
    }

    return z.object(schemaFields);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema()),
    mode: "onChange",
  });

  // Reset form when endpoint changes
  useEffect(() => {
    form.reset();
    setShowValidation(false);
    setResponse(null);
  }, [selectedEndpoint, form]);

  const makeApiCall = async (data: FormValues) => {
    if (!currentEndpointData) return;

    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

    try {
      // Construct URL
      const baseUrlWithoutPath = BASE_URL.split("/latest")[0];
      const url = new URL(
        `/latest${currentEndpointData.path}`,
        baseUrlWithoutPath
      );

      // Prepare request body for POST/PUT/PATCH requests
      const requestBody = ["POST", "PUT", "PATCH"].includes(
        currentEndpointData.method
      )
        ? JSON.stringify(data)
        : undefined;

      // Convert request headers to proper format
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const response = await fetch(url.toString(), {
        method: currentEndpointData.method,
        headers,
        body: requestBody,
        signal: controller.signal,
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

      setResponse({
        data: responseData,
        contentType,
        status: response.status,
      });
    } catch (error) {
      // Only set error response if it's not an abort error
      if (error instanceof Error && error.name === "AbortError") {
        setResponse(null);
      } else {
        setResponse({
          data: {
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
          contentType: "application/json",
          status: 500,
        });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleTrigger = () => {
    if (isLoading && abortController) {
      // If request is in progress, abort it
      abortController.abort();
      setIsLoading(false);
      setAbortController(null);
    } else {
      // Start new request
      setShowValidation(true);
      form.handleSubmit(makeApiCall)();
    }
  };

  const renderCopyToClipboard = (text: string, identifier: string) => {
    const handleCopy = async () => {
      await copyText(text);
      setLastCopiedId(identifier);
    };

    return (
      <div
        aria-label="button"
        className="group mb-1 flex w-full cursor-pointer justify-end rounded-sm p-[2px] px-[6px] hover:bg-neutral-200"
        onClick={handleCopy}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 transition duration-200 group-hover:text-neutral-500">
          <span>
            {copied && lastCopiedId === identifier
              ? "Copied!"
              : "Copy to clipboard"}
          </span>
          <Copy size={14} />
        </div>
      </div>
    );
  };

  const renderResponse = () => {
    if (!response) return null;

    const { data, contentType, status } = response;

    return (
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Response</h3>
          <span
            className={cn(
              "rounded-full px-2 py-1 text-sm",
              status >= 200 && status < 300
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            )}
          >
            Status: {status}
          </span>
        </div>
        <div className="rounded-lg border p-4">
          {contentType.includes("application/json") ? (
            <pre className="whitespace-pre-wrap break-words text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : contentType.includes("image/") ? (
            <img
              src={URL.createObjectURL(data)}
              alt="Response"
              className="max-w-full rounded-lg"
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words text-sm">
              {String(data)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  const getMethodColor = (method: string) => {
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

  const getStatusColor = (status: string) => {
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

  const renderDocs = () => {
    if (!currentEndpointData) return null;

    // Create example request body
    const exampleBody = currentEndpointData.requestBody?.content?.[
      "application/json"
    ]?.schema?.properties
      ? Object.fromEntries(
          Object.entries(
            currentEndpointData.requestBody.content["application/json"].schema
              .properties
          ).map(([key, value]) => [
            key,
            (value as any).example || "example_value",
          ])
        )
      : null;

    // Construct example URL
    const baseUrlWithoutPath = BASE_URL.split("/latest")[0];
    const exampleUrl = new URL(
      `/latest${currentEndpointData.path}`,
      baseUrlWithoutPath
    );

    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Endpoint Documentation</h3>
          <div className="space-y-4 rounded-lg border p-4">
            {/* Description */}
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                {currentEndpointData.description}
              </p>
            </div>

            {/* Example Request */}
            <div>
              <h4 className="text-sm font-medium">Example Request</h4>
              <div className="mt-2 space-y-2">
                {exampleBody && (
                  <div className="relative overflow-hidden rounded-lg bg-muted p-4 text-sm">
                    <div className="absolute right-2 top-2 bg-muted">
                      {renderCopyToClipboard(
                        JSON.stringify(exampleBody, null, 2),
                        "request-body"
                      )}
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap break-words leading-loose tracking-wider !text-blue-900">
                      {JSON.stringify(exampleBody, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="relative overflow-hidden rounded-lg bg-muted p-4 text-sm">
                    <div className="absolute right-2 top-2 bg-muted">
                      {renderCopyToClipboard(
                        exampleUrl.toString(),
                        "request-url"
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={cn(
                          "h-fit rounded px-2 py-0.5 text-xs font-bold",
                          getMethodColor(currentEndpointData.method)
                        )}
                      >
                        {currentEndpointData.method}
                      </span>
                      <pre className="text-wrap text-[0.85rem] font-light tracking-wider text-neutral-600">
                        {exampleUrl.toString()}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Section */}
            <div>
              <h4 className="mb-4 text-sm font-medium">Responses</h4>
              <div className="space-y-2">
                {Object.entries(currentEndpointData.responses).map(
                  ([status, response]) => (
                    <div key={status} className="ml-4">
                      <p className="flex gap-2 text-sm">
                        <span
                          className={cn(
                            "h-fit rounded px-2 py-0.5 font-medium",
                            getStatusColor(status)
                          )}
                        >
                          {status}
                        </span>
                        <span className="text-muted-foreground">
                          {(response as any).description}
                        </span>
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Setup Instructions */}
            {currentEndpointData.setupInstructions && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Setup Instructions</h4>
                <div className="rounded-lg bg-muted p-4">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {currentEndpointData.setupInstructions}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-10 flex flex-col border-b bg-white shadow-sm">
        <div className="flex mb-2 gap-4 items-center bg-zinc-100 px-3 py-2">
          <X
            className="cursor-pointer h-4 w-4 text-gray-500 hover:text-gray-700"
            onClick={() => handleRightCollapse(!isRightCollapsed)}
          />
          <div className="flex gap-2 items-center">
            <p className="text-base font-medium">Preview</p>
            <Monitor className="h-4 w-4 " />
          </div>
          <Button
            variant={showDocs ? "default" : "outline"}
            size="sm"
            className="ml-auto h-8 gap-2 rounded-md px-3 text-xs"
            onClick={() => setShowDocs(!showDocs)}
            disabled={isLoading}
          >
            {showDocs ? "Hide Docs" : "Show Docs"}
          </Button>
        </div>
        <div className=" px-3 py-2 ">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1">
            <Select
              value={selectedMethod}
              onValueChange={(value) => setSelectedMethod(value as HttpMethod)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-7 w-fit border-0 bg-transparent text-xs hover:bg-white focus:ring-0">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((method) => (
                  <SelectItem key={method} value={method} className="text-xs">
                    <span
                      className={cn(
                        "inline-flex h-5 items-center rounded px-1.5 font-medium",
                        getMethodColor(method)
                      )}
                    >
                      {method}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedEndpoint}
              onValueChange={setSelectedEndpoint}
              disabled={isLoading}
            >
              <SelectTrigger className="h-7 w-full border-0 bg-transparent text-xs hover:bg-white focus:ring-0">
                <SelectValue placeholder="Select Endpoint" />
              </SelectTrigger>
              <SelectContent>
                {endpoints.map((endpoint) => (
                  <SelectItem
                    key={endpoint.path}
                    value={endpoint.path}
                    className="text-xs"
                    disabled={endpoint.method !== selectedMethod}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate">{endpoint.path}</span>
                      {endpoint.method !== selectedMethod && (
                        <span
                          className={cn(
                            "ml-auto inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium",
                            getMethodColor(endpoint.method)
                          )}
                        >
                          {endpoint.method}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="min-h-0 pb-4 flex-1 overflow-y-auto thin-scrollbar">
        {currentEndpointData &&
        selectedMethod === currentEndpointData.method ? (
          <div className="pb-safe">
            {showDocs ? (
              <div className="space-y-4 p-4">
                {/* Description */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {currentEndpointData.description}
                  </p>
                </div>

                {/* Example Request */}
                <div>
                  <h3 className="mb-2 text-xs font-medium">Example Request</h3>
                  <div className="space-y-2">
                    {currentEndpointData.requestBody?.content?.[
                      "application/json"
                    ]?.schema?.properties && (
                      <div className="relative overflow-hidden rounded-lg border bg-white">
                        <div className="absolute right-2 top-2 z-10">
                          {renderCopyToClipboard(
                            JSON.stringify(
                              Object.fromEntries(
                                Object.entries(
                                  currentEndpointData.requestBody.content[
                                    "application/json"
                                  ].schema.properties
                                ).map(([key]) => [key, "example_value"])
                              ),
                              null,
                              2
                            ),
                            "request-body"
                          )}
                        </div>
                        <div className="p-3">
                          <pre className="text-xs text-neutral-800">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(
                                  currentEndpointData.requestBody.content[
                                    "application/json"
                                  ].schema.properties
                                ).map(([key]) => [key, "example_value"])
                              ),
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="group relative overflow-hidden rounded-lg border bg-white">
                      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                        {renderCopyToClipboard(
                          BASE_URL + currentEndpointData.path,
                          "request-url"
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium",
                              getMethodColor(currentEndpointData.method)
                            )}
                          >
                            {currentEndpointData.method}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {BASE_URL + currentEndpointData.path}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responses */}
                <div>
                  <h3 className="mb-2 text-xs font-medium">Responses</h3>
                  <div className="space-y-2">
                    {Object.entries(currentEndpointData.responses).map(
                      ([status, response]) => (
                        <div
                          key={status}
                          className="flex items-center gap-2 rounded-lg border bg-white p-2"
                        >
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium shrink-0",
                              getStatusColor(status)
                            )}
                          >
                            {status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(response as any).description}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Setup Instructions */}
                {currentEndpointData.setupInstructions && (
                  <div>
                    <h3 className="mb-2 text-xs font-medium">
                      Setup Instructions
                    </h3>
                    <div className="rounded-lg border bg-white p-3">
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                        {currentEndpointData.setupInstructions}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!response ? (
                  <Form {...form}>
                    <form className="space-y-4 p-4">
                      {/* Request Body */}
                      {(() => {
                        const properties =
                          currentEndpointData?.requestBody?.content?.[
                            "application/json"
                          ]?.schema?.properties;
                        if (!properties) return null;

                        return (
                          <div>
                            <h3 className="mb-2 text-xs font-medium">
                              Request Body
                            </h3>
                            <div className="space-y-3">
                              {Object.entries(properties).map(
                                ([key, value]) => {
                                  const required =
                                    currentEndpointData?.requestBody?.required;
                                  const isRequired =
                                    Array.isArray(required) &&
                                    required.includes(key);
                                  return (
                                    <FormField
                                      key={key}
                                      control={form.control}
                                      name={key}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs text-neutral-700">
                                            {key}
                                            {isRequired && (
                                              <span className="ml-1 text-red-500">
                                                *
                                              </span>
                                            )}
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              className="h-8 text-sm"
                                              placeholder={
                                                (value as any).example ||
                                                `Enter ${key}`
                                              }
                                            />
                                          </FormControl>
                                          {showValidation && (
                                            <FormMessage className="text-xs" />
                                          )}
                                        </FormItem>
                                      )}
                                    />
                                  );
                                }
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Submit Button */}
                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          variant={isLoading ? "destructive" : "default"}
                          className="h-8 gap-2 rounded-md px-4 text-xs"
                          onClick={handleTrigger}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              <span>Cancel</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              <span>Submit</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium">Response</h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium",
                              response.status >= 200 && response.status < 300
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            Status: {response.status}
                          </span>
                          <button
                            onClick={() => setResponse(null)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-md hover:bg-neutral-100"
                          >
                            <X className="h-3 w-3 text-neutral-500" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-lg border bg-white">
                        <div className="p-3">
                          {response.contentType.includes("application/json") ? (
                            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-xs text-neutral-800">
                              {JSON.stringify(response.data, null, 2)}
                            </pre>
                          ) : response.contentType.includes("image/") ? (
                            <img
                              src={URL.createObjectURL(response.data)}
                              alt="Response"
                              className="max-h-[60vh] w-full rounded object-contain"
                            />
                          ) : (
                            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-xs text-neutral-800">
                              {String(response.data)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No endpoint available for {selectedMethod} {selectedEndpoint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewWindow;

