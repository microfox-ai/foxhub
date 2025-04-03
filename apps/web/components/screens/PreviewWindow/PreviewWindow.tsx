import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Play, X } from "lucide-react";
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

const BASE_URL =
  "https://a1n6ih708c.execute-api.ap-southeast-2.amazonaws.com/latest";

// Get unique endpoints from API_DOC
const endpoints = API_DOC.endpoints.map((endpoint) => endpoint.path);

// Type for form values
type FormValues = Record<string, string>;

interface RequestQueryParam {
  type: string;
  description?: string;
  isRequired?: boolean;
  example?: string;
}

interface RequestBodySchema {
  type: string;
  isRequired: boolean;
  description: string;
  example: string;
}

interface RequestBodyField {
  type: string;
  description?: string;
  required?: boolean;
  example?: string;
}

interface RequestHeader {
  type: string;
  description: string;
  example: string;
}

interface ResponseData {
  data: any;
  contentType: string;
  status: number;
}

interface PathParam {
  name: string;
  example?: string;
}

const PreviewWindow = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    endpoints?.[0] ?? ""
  );
  const [showValidation, setShowValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Get available methods for the selected endpoint
  const availableMethods = API_DOC.endpoints
    .filter((endpoint) => endpoint.path === selectedEndpoint)
    .map((endpoint) => endpoint.method);

  const [selectedMethod, setSelectedMethod] = useState<string>(
    availableMethods?.[0] ?? ""
  );

  // Update selected method when endpoint changes
  useEffect(() => {
    setSelectedMethod(availableMethods?.[0] ?? "");
    setShowValidation(false);
    setResponse(null);
  }, [selectedEndpoint]);

  // Get the current endpoint data
  const currentEndpoint = API_DOC.endpoints.find(
    (endpoint) =>
      endpoint.path === selectedEndpoint && endpoint.method === selectedMethod
  );

  // Function to extract path parameters from the endpoint
  const getPathParams = (path: string): PathParam[] => {
    const params: PathParam[] = [];
    const matches = path.match(/:[a-zA-Z]+/g);

    if (matches) {
      matches.forEach((match) => {
        const name = match.substring(1); // Remove the : prefix
        params.push({
          name,
          example: `example_${name}`, // Default example value
        });
      });
    }

    return params;
  };

  // Function to replace path parameters with actual values
  const replacePath = (path: string, values: Record<string, string>) => {
    let newPath = path;
    Object.entries(values).forEach(([key, value]) => {
      newPath = newPath.replace(`:${key}`, value);
    });
    return newPath;
  };

  // Create form schema based on request parameters
  const createFormSchema = () => {
    if (!currentEndpoint) return z.object({});

    const schemaFields: Record<string, z.ZodType<any>> = {};

    // Add path parameters
    const pathParams = getPathParams(currentEndpoint.path);
    pathParams.forEach((param) => {
      schemaFields[param.name] = z
        .string()
        .min(1, { message: "This field is required" });
    });

    // Add query parameters
    if (currentEndpoint.requestQuery) {
      Object.entries(
        currentEndpoint.requestQuery as Record<string, RequestQueryParam>
      ).forEach(([key, value]) => {
        const isRequired = value?.isRequired === true;
        const schema = z.string();
        schemaFields[key] = isRequired
          ? schema.min(1, { message: "This field is required" })
          : schema.optional();
      });
    }

    // Add body parameters if it's not a GET request
    if (currentEndpoint.requestBody && selectedMethod !== "GET") {
      Object.entries(
        currentEndpoint.requestBody.schema as Record<string, RequestBodySchema>
      ).forEach(([key, value]) => {
        const isRequired = value.isRequired === true;
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

  // Reset form when endpoint or method changes
  useEffect(() => {
    form.reset();
    setShowValidation(false);
    setResponse(null);
  }, [selectedEndpoint, selectedMethod, form]);

  const makeApiCall = async (data: FormValues) => {
    if (!currentEndpoint) return;

    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

    try {
      // Get path parameters and replace them in the URL
      const pathParams = getPathParams(currentEndpoint.path);
      let path = currentEndpoint.path;
      pathParams.forEach((param) => {
        path = path.replace(
          `:${param.name}`,
          data[param.name] || param.example || ""
        );
      });

      // Construct URL with query parameters
      const baseUrlWithoutPath = BASE_URL.split("/latest")[0];
      const url = new URL(`/latest${path}`, baseUrlWithoutPath);

      // Add query parameters
      if (currentEndpoint.requestQuery) {
        Object.entries(data).forEach(([key, value]) => {
          if (
            currentEndpoint.requestQuery &&
            key in currentEndpoint.requestQuery &&
            !pathParams.find((p) => p.name === key) // Exclude path parameters
          ) {
            url.searchParams.append(key, value);
          }
        });
      }

      // Prepare request body
      const requestBody =
        currentEndpoint.requestBody && selectedMethod !== "GET"
          ? JSON.stringify(
              Object.fromEntries(
                Object.entries(data).filter(
                  ([key]) =>
                    currentEndpoint.requestBody?.schema &&
                    key in currentEndpoint.requestBody.schema
                )
              )
            )
          : undefined;

      // Convert request headers to proper format
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (currentEndpoint.requestHeaders) {
        Object.entries(
          currentEndpoint.requestHeaders as Record<string, RequestHeader>
        ).forEach(([key, value]) => {
          headers[key] = value.example;
        });
      }

      const response = await fetch(url.toString(), {
        method: selectedMethod,
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

  const renderCopyToClipboard = () => {
    return (
      <div
        aria-label="button"
        className="group mb-1 flex w-full cursor-pointer justify-end rounded-sm p-[2px] px-[6px] hover:bg-neutral-200"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 transition duration-200 group-hover:text-neutral-500">
          <span>Copy to clipboard</span>
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
    if (!currentEndpoint) return null;

    const pathParams = getPathParams(currentEndpoint.path);

    // Create example request body if it's not a GET request
    const exampleBody =
      currentEndpoint.requestBody && selectedMethod !== "GET"
        ? Object.fromEntries(
            Object.entries(
              currentEndpoint.requestBody.schema as Record<
                string,
                RequestBodySchema
              >
            ).map(([key, value]) => [key, value.example])
          )
        : null;

    // Create example path parameters
    const examplePathParams = Object.fromEntries(
      pathParams.map((param) => [
        param.name,
        param.example || `example_${param.name}`,
      ])
    );

    // Construct example URL with path parameters
    const baseUrlWithoutPath = BASE_URL.split("/latest")[0];
    const examplePath = replacePath(currentEndpoint.path, examplePathParams);
    const exampleUrl = new URL(`/latest${examplePath}`, baseUrlWithoutPath);

    // Add example query parameters if they exist
    if (currentEndpoint.requestQuery) {
      Object.entries(
        currentEndpoint.requestQuery as Record<string, RequestQueryParam>
      ).forEach(([key, value]) => {
        const exampleValue =
          value.example || (value.type === "number" ? "123" : "example_value");
        exampleUrl.searchParams.append(key, exampleValue);
      });
    }

    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Endpoint Documentation</h3>
          <div className="space-y-4 rounded-lg border p-4">
            {/* Description at the top */}
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                {currentEndpoint.description}
              </p>
            </div>

            {/* Path Parameters Section */}
            {pathParams.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Path Parameters</h4>
                <div className="space-y-2">
                  {pathParams.map((param) => (
                    <div key={param.name} className="ml-4">
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-blue-600">
                          {param.name}
                        </span>
                        <span className="text-destructive">*</span>
                        <span className="text-muted-foreground">
                          (example: {param.example})
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example Request */}
            <div>
              <h4 className="text-sm font-medium">Example Request</h4>
              <div className="mt-2 space-y-2">
                {exampleBody && (
                  <div className="relative overflow-hidden rounded-lg bg-muted p-4 text-sm">
                    <div className="absolute right-2 top-2 bg-muted">
                      {renderCopyToClipboard()}
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap break-words leading-loose tracking-wider text-blue-900">
                      {JSON.stringify(exampleBody, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="relative overflow-hidden rounded-lg bg-muted p-4 text-sm">
                    <div className="absolute right-2 top-2 bg-muted">
                      {renderCopyToClipboard()}
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={cn(
                          "h-fit rounded px-2 py-0.5 text-xs font-bold",
                          getMethodColor(selectedMethod)
                        )}
                      >
                        {selectedMethod}
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
                {Object.entries(currentEndpoint.responses).map(
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
                          {response.description}
                        </span>
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex w-full items-center justify-between rounded-lg p-2">
        {/* Left Grouping */}
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" disabled={isLoading}>
            <X className="h-5 w-5" />
          </Button> */}

          <Select
            value={selectedEndpoint}
            onValueChange={setSelectedEndpoint}
            disabled={isLoading}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Endpoint" />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((endpoint) => (
                <SelectItem key={endpoint} value={endpoint}>
                  {endpoint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            className={cn(
              "relative",
              isLoading && "pointer-events-none opacity-50"
            )}
          >
            <Tabs
              value={selectedMethod}
              onValueChange={setSelectedMethod}
              defaultValue={availableMethods[0]}
            >
              <TabsList>
                {availableMethods.map((method) => (
                  <TabsTrigger key={method} value={method}>
                    {method}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Right Grouping */}
        <div className="flex items-center gap-2">
          <Button
            variant={showDocs ? "default" : "outline"}
            className="rounded-full text-sm shadow-none"
            onClick={() => setShowDocs(!showDocs)}
            disabled={isLoading}
          >
            Show Doc
          </Button>
          {/* <Button
            variant={isLoading ? "destructive" : "default"}
            className="flex items-center gap-1 rounded-full shadow-none"
            onClick={handleTrigger}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Trigger
              </>
            )}
          </Button> */}
        </div>
      </div>

      {/* Content Area */}
      {currentEndpoint && (
        <>
          {showDocs ? (
            renderDocs()
          ) : (
            <>
              {!response && (
                <Form {...form}>
                  <form className="space-y-4 p-4">
                    {/* Path Parameters */}
                    {getPathParams(currentEndpoint.path).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Path Parameters</h3>
                        {getPathParams(currentEndpoint.path).map((param) => (
                          <FormField
                            key={param.name}
                            control={form.control}
                            name={param.name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel
                                  className={cn(
                                    showValidation &&
                                      form.formState.errors[param.name] &&
                                      "text-destructive"
                                  )}
                                >
                                  {param.name}{" "}
                                  <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={param.example}
                                    className={cn(
                                      showValidation &&
                                        form.formState.errors[param.name] &&
                                        "border-destructive focus-visible:ring-destructive"
                                    )}
                                  />
                                </FormControl>
                                {showValidation && <FormMessage />}
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* Query Parameters */}
                    {currentEndpoint.requestQuery &&
                      Object.entries(currentEndpoint.requestQuery).length >
                        0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">
                            Query Parameters
                          </h3>
                          {Object.entries(
                            currentEndpoint.requestQuery as Record<
                              string,
                              RequestQueryParam
                            >
                          ).map(([key, value]) => {
                            const isRequired = value?.isRequired === true;
                            return (
                              <FormField
                                key={key}
                                control={form.control}
                                name={key}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel
                                      className={cn(
                                        showValidation &&
                                          form.formState.errors[key] &&
                                          "text-destructive"
                                      )}
                                    >
                                      {key}{" "}
                                      {isRequired && (
                                        <span className="text-destructive">
                                          *
                                        </span>
                                      )}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder={value.example}
                                        className={cn(
                                          showValidation &&
                                            form.formState.errors[key] &&
                                            "border-destructive focus-visible:ring-destructive"
                                        )}
                                      />
                                    </FormControl>
                                    {showValidation && <FormMessage />}
                                  </FormItem>
                                )}
                              />
                            );
                          })}
                        </div>
                      )}

                    {/* Request Body */}
                    {currentEndpoint.requestBody &&
                      selectedMethod !== "GET" && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Request Body</h3>
                          {Object.entries(
                            currentEndpoint.requestBody.schema as Record<
                              string,
                              RequestBodySchema
                            >
                          ).map(([key, value]) => {
                            const isRequired = value.isRequired === true;
                            return (
                              <FormField
                                key={key}
                                control={form.control}
                                name={key}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel
                                      className={cn(
                                        showValidation &&
                                          form.formState.errors[key] &&
                                          "text-destructive"
                                      )}
                                    >
                                      {key}{" "}
                                      {isRequired && (
                                        <span className="text-destructive">
                                          *
                                        </span>
                                      )}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder={value.example}
                                        className={cn(
                                          showValidation &&
                                            form.formState.errors[key] &&
                                            "border-destructive focus-visible:ring-destructive"
                                        )}
                                      />
                                    </FormControl>
                                    {showValidation && <FormMessage />}
                                  </FormItem>
                                )}
                              />
                            );
                          })}
                        </div>
                      )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <Button
                        type="button"
                        variant={isLoading ? "destructive" : "default"}
                        className="flex items-center gap-2 rounded-full px-6 shadow-none"
                        onClick={handleTrigger}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Submit</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
              {response && renderResponse()}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PreviewWindow;
