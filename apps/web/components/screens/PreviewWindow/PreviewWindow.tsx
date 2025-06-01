/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import {
  FormValues,
  HTTP_METHODS,
  HttpMethod,
  OpenAPIResponse,
  OpenAPISchema
} from "@/utils/services/OpenAPIToolsClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientDeployment } from "@prisma/client";
import { ArrowLeftIcon, ChevronDown, Clock, Copy, Monitor, Play, RefreshCw, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useApiDoc } from "../providers/ApiDocProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useLayout } from "../providers/LayoutProvider";
import { useTabUi } from "../providers/TabUiProvider";
import { useTaskInstanceMetaContext } from "../providers/TaskInstanceMetaProvider";
import { fetchServerlessLogs, makeApiCallWithResponseData, prepareApiRequest } from "./helpers";
import {
  buildExampleUrl,
  getMethodColor,
  getPlaceholder,
  getStatusColor,
  getStatusText,
} from "./utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandInput } from "@/components/ui/command";

const PreviewWindow = () => {
  const { taskInstanceMeta, deploymentInfo } = useTaskInstanceMetaContext();
  const {
    apiDoc,
    endpoints,
    selectedMethod,
    selectedEndpoint,
    setSelectedMethod,
    setSelectedEndpoint,
    currentEndpointData,
    error,
    setError
  } = useApiDoc();
  const [showValidation, setShowValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [request, setRequest] = useState<any | null>(null);
  const [response, setResponse] = useState<any | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [serverlessLogs, setServerlessLogs] = useState<any | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [modificationInstructions, setModificationInstructions] = useState<string>("");
  const { copied, copyToClipboard: copyText } = useCopyToClipboard();
  const [lastCopiedId, setLastCopiedId] = useState<string>("");
  const { isRightCollapsed, handleRightCollapse } = useLayout();
  const [showLogs, setShowLogs] = useState(false);
  const { setSubmitAnnotations, setAutoSubmit } = useClientProject();
  const { setActiveTab } = useTabUi()
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  //const baseURLFROMDOCS = `${apiDoc?.servers?.[0]?.url}`;
  const BASE_URL = `${deploymentInfo?.baseUrl}/${deploymentInfo?.stage.toLowerCase()}`;

  // Create form schema based on request parameters
  const createFormSchema = () => {
    const schemaFields: Record<string, any> = {};

    if (currentEndpointData?.parameters) {
      currentEndpointData.parameters.forEach((param) => {
        const fieldName = `${param.in}_${param.name}`;
        let fieldSchema: any = z.string();

        if (param.schema) {
          switch (param.schema.type) {
            case "number":
            case "integer":
              fieldSchema = z.string().transform((val) => Number(val));
              break;
            case "boolean":
              fieldSchema = z.string().transform((val) => val === "true");
              break;
            case "array":
              fieldSchema = z.union([
                z.string().transform((val) => {
                  try {
                    return JSON.parse(val);
                  } catch {
                    return [];
                  }
                }),
                z.array(z.any())
              ]);
              break;
            case "object":
              fieldSchema = z.union([
                z.string().transform((val) => {
                  try {
                    return JSON.parse(val);
                  } catch {
                    return {};
                  }
                }),
                z.record(z.any())
              ]);
              break;
          }
        }

        schemaFields[fieldName] = fieldSchema.optional();
      });
    }

    // Add request body field for POST/PUT/PATCH methods
    if (
      currentEndpointData?.method &&
      ["POST", "PUT", "PATCH"].includes(currentEndpointData.method)
    ) {
      const requestBodySchema =
        currentEndpointData.requestBody?.content?.["application/json"]?.schema;
      if (requestBodySchema) {
        if (
          requestBodySchema.type === "object" &&
          requestBodySchema.properties
        ) {
          // Add individual fields for each property in the request body
          Object.entries(requestBodySchema.properties).forEach(([key, schema]) => {
            let fieldSchema: any = z.string();

            if (schema.type === "array" || schema.type === "object") {
              fieldSchema = z.union([
                z.string().transform((val) => {
                  try {
                    return JSON.parse(val);
                  } catch {
                    return schema.type === "array" ? [] : {};
                  }
                }),
                schema.type === "array" ? z.array(z.any()) : z.record(z.any())
              ]);
            } else if (
              schema.type === "number" ||
              schema.type === "integer"
            ) {
              fieldSchema = z.string().transform((val) => Number(val));
            } else if (schema.type === "boolean") {
              fieldSchema = z.string().transform((val) => val === "true");
            }

            schemaFields[`body_${key}`] = fieldSchema.optional();
          });
        } else {
          // For non-object request bodies, add a single "body" field
          let bodySchema: any = z.string();

          if (
            requestBodySchema.type === "array" &&
            requestBodySchema.items
          ) {
            bodySchema = z.union([
              z.string().transform((val) => {
                try {
                  return JSON.parse(val);
                } catch {
                  return [];
                }
              }),
              z.array(z.any())
            ]);
          } else if (
            requestBodySchema.type === "number" ||
            requestBodySchema.type === "integer"
          ) {
            bodySchema = z.string().transform((val) => Number(val));
          } else if (requestBodySchema.type === "boolean") {
            bodySchema = z.string().transform((val) => val === "true");
          }

          schemaFields["body"] = bodySchema.optional();
        }
      }
    }

    return z.object(schemaFields);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema()),
    mode: "onChange",
  });

  // Reset form when endpoint changes
  useEffect(() => {
    const resetForm = () => {
      form.reset();
      setShowValidation(false);
      setResponse(null);
    };

    resetForm();
  }, [selectedEndpoint, form]);

  // Helper function to create Zod schema from OpenAPI schema
  const createZodSchemaFromOpenAPI = (
    schema: OpenAPISchema
  ): z.ZodType<any> => {
    switch (schema.type) {
      case "string":
        let stringSchema = z.string();
        if (schema.format === "email") {
          stringSchema = z.string().email();
        } else if (schema.format === "uri") {
          stringSchema = z.string().url();
        } else if (schema.format === "date-time") {
          stringSchema = z.string().datetime();
        }
        return stringSchema;
      case "number":
        return z.number();
      case "integer":
        return z.number().int();
      case "boolean":
        return z.boolean();
      case "array":
        if (schema.items) {
          return z.array(createZodSchemaFromOpenAPI(schema.items));
        }
        return z.array(z.any());
      case "object":
        if (schema.properties) {
          const objectSchema: Record<string, z.ZodType<any>> = {};
          Object.entries(schema.properties).forEach(([key, value]) => {
            objectSchema[key] = createZodSchemaFromOpenAPI(
              value as OpenAPISchema
            );
          });
          return z.object(objectSchema);
        }
        return z.record(z.any());
      default:
        return z.any();
    }
  };

  const makeApiCall = async () => {
    if (!currentEndpointData) {
      return;
    }

    // Create new abort controller
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

    let endpointLink: string = `${BASE_URL}${currentEndpointData.path}`;

    try {
      setServerlessLogs(null);
      setResponse(null);
      setRequest(null);
      const formValues = form.getValues();
      const { url, headers, body } = prepareApiRequest({
        baseUrl: BASE_URL,
        path: currentEndpointData.path || "",
        method: currentEndpointData.method,
        data: formValues,
        parameters: currentEndpointData.parameters,
        requestBody: currentEndpointData.requestBody
      });

      endpointLink = url;
      setRequest({
        url,
        method: currentEndpointData.method,
        headers,
        body,
      });

      // First make the API call
      await makeApiCallWithResponseData({
        url,
        method: currentEndpointData.method,
        headers,
        body,
        signal: controller.signal,
        setResponse: setResponse
      });
    } catch (error) {
      // Handle error silently
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchServerlessLogs({
        clientDeploymentId: (deploymentInfo as ClientDeployment).id,
        endpointLink: endpointLink,
        setServerlessLogs: setServerlessLogs
      });
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
      form.handleSubmit(
        (data) => {
          makeApiCall();
        },
        (errors) => {
          // Handle validation errors silently
        }
      )();
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

  const renderFormField = (
    key: string,
    schema: OpenAPISchema,
    isRequired: boolean,
    description?: string
  ) => {
    // Common label and description rendering
    const renderLabelAndDescription = () => (
      <>
        <FormLabel className="-mb-1 text-sm text-neutral-700">
          {key.replace(/^(path|query|header|body)_/, "")}
          {isRequired && <span className=" text-red-500">*</span>}
        </FormLabel>
        {(description || schema.description) && (
          <p className="text-xs text-neutral-500 mb-1">
            {description || schema.description}
          </p>
        )}
      </>
    );

    switch (schema.type) {
      case "string":
        if (schema.enum) {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  {renderLabelAndDescription()}
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={getPlaceholder(
                          key,
                          "string",
                          currentEndpointData?.method === "GET",
                          schema.example
                        )} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schema.enum?.map((value) => (
                        <SelectItem key={value} value={value} className="text-sm">
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showValidation && <FormMessage className="text-xs" />}
                </FormItem>
              )}
            />
          );
        }
        if (schema.format === "date-time") {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  {renderLabelAndDescription()}
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      className="h-8 text-sm"
                      placeholder={getPlaceholder(
                        key,
                        "string",
                        currentEndpointData?.method === "GET",
                        schema.example
                      )}
                    />
                  </FormControl>
                  {showValidation && <FormMessage className="text-xs" />}
                </FormItem>
              )}
            />
          );
        }
        if (schema.format === "email") {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  {renderLabelAndDescription()}
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      className="h-8 text-sm"
                      placeholder="Enter email address"
                    />
                  </FormControl>
                  {showValidation && <FormMessage className="text-xs" />}
                </FormItem>
              )}
            />
          );
        }
        if (schema.format === "uri") {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  {renderLabelAndDescription()}
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      className="h-8 text-sm"
                      placeholder="Enter URL"
                    />
                  </FormControl>
                  {showValidation && <FormMessage className="text-xs" />}
                </FormItem>
              )}
            />
          );
        }
        // For long text strings, use textarea
        if (
          schema.description?.toLowerCase().includes("long") ||
          schema.description?.toLowerCase().includes("description")
        ) {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  {renderLabelAndDescription()}
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[100px] text-sm"
                      placeholder={getPlaceholder(
                        key,
                        "string",
                        currentEndpointData?.method === "GET",
                        schema.example
                      )}
                    />
                  </FormControl>
                  {showValidation && <FormMessage className="text-xs" />}
                </FormItem>
              )}
            />
          );
        }
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem>
                {renderLabelAndDescription()}
                <FormControl>
                  <Input
                    {...field}
                    className="h-8 text-sm"
                    placeholder={getPlaceholder(
                      key,
                      "string",
                      currentEndpointData?.method === "GET",
                      schema.example
                    )}
                  />
                </FormControl>
                {showValidation && <FormMessage className="text-xs" />}
              </FormItem>
            )}
          />
        );
      case "number":
      case "integer":
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem>
                {renderLabelAndDescription()}
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    className="h-8 text-sm"
                    placeholder={getPlaceholder(
                      key,
                      "number",
                      currentEndpointData?.method === "GET",
                      schema.example
                    )}
                  />
                </FormControl>
                {showValidation && <FormMessage className="text-xs" />}
              </FormItem>
            )}
          />
        );
      case "boolean":
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem className="flex flex-col space-y-2">
                <div className="flex flex-row items-start space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={
                        typeof field.value === "boolean"
                          ? field.value
                          : field.value === "true"
                      }
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    {renderLabelAndDescription()}
                  </div>
                </div>
                {showValidation && <FormMessage className="text-xs" />}
              </FormItem>
            )}
          />
        );
      case "array":
        const description = schema.description;
        if (schema.items?.type === "object") {
          return (
            <div className="grid gap-2">
              <h4 className="text-sm font-medium text-neutral-700">
                {description}
              </h4>
              {Object.entries(schema.items).map(([_key, value], _index) => {
                return renderFormField(key + "[" + _index + "]" + "." + _key, value, schema.required?.includes(_key) || false, value.description);
              })}
            </div>
          )
        }
        if (schema.items?.type === "string") {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <FormItem>
                  {renderLabelAndDescription()}
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {field.value ? field.value.split(",").map((item: string, index: number) => (
                        <Badge
                          key={`${item}-${index}`}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {item}
                          <button
                            onClick={() => {
                              const newItems = field.value.split(",").filter((_, i) => i !== index);
                              field.onChange(newItems.join(","));
                            }}
                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove item</span>
                          </button>
                        </Badge>
                      )) : null}
                    </div>
                    <div className="flex gap-2">
                      <Command className="rounded-lg border shadow-md">
                        <CommandInput
                          placeholder={getPlaceholder(
                            key,
                            "array",
                            currentEndpointData?.method === "GET",
                            schema.example
                          )}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              e.preventDefault();
                              const newValue = e.currentTarget.value.trim();
                              if (newValue) {
                                const currentItems = field.value ? field.value.split(",") : [];
                                if (!currentItems.includes(newValue)) {
                                  field.onChange([...currentItems, newValue].join(","));
                                }
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                      </Command>
                    </div>
                  </div>
                  {showValidation && <FormMessage className="text-xs" />}
                </FormItem>
              )}
            />
          );
        }
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem>
                {renderLabelAndDescription()}
                <FormControl>
                  <Textarea
                    {...field}
                    className="min-h-[100px] font-mono text-sm"
                    placeholder={getPlaceholder(
                      key,
                      "array",
                      currentEndpointData?.method === "GET",
                      schema.example
                    )}
                  />
                </FormControl>
                {showValidation && <FormMessage className="text-xs" />}
              </FormItem>
            )}
          />
        );
      case "object":
        if (schema.properties) {
          return (
            <div className="grid gap-2">
              {Object.entries(schema.properties).map(([_key, value]) => {
                return renderFormField(key + "." + _key, value, schema.required?.includes(_key) || false, value.description);
              })}
            </div>
          )
        }
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem>
                {renderLabelAndDescription()}
                <FormControl>
                  <Textarea
                    {...field}
                    className="min-h-[100px] font-mono text-sm"
                    placeholder={getPlaceholder(
                      key,
                      "object",
                      currentEndpointData?.method === "GET",
                      schema.example
                    )}
                  />
                </FormControl>
                {showValidation && <FormMessage className="text-xs" />}
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  const renderParameters = () => {
    if (!currentEndpointData?.parameters) return null;

    const pathParams = currentEndpointData.parameters.filter(
      (param) => param.in === "path"
    );
    const queryParams = currentEndpointData.parameters.filter(
      (param) => param.in === "query"
    );
    const headerParams = currentEndpointData.parameters.filter(
      (param) => param.in === "header"
    );
    const bodyParams = currentEndpointData.parameters.filter(
      (param) => param.in === "body"
    );

    //console.log("bodyParams", currentEndpointData);

    return (
      <div className="space-y-4">
        {pathParams.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-neutral-700">
              Path Parameters
            </h4>
            <div className="grid gap-2">
              {pathParams.map((param) => {
                const key = `path_${param.name}`;
                return renderFormField(
                  key,
                  param.schema,
                  param.required || false,
                  param.description
                );
              })}
            </div>
          </div>
        )}

        {queryParams.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-neutral-700">
              Query Parameters
            </h4>
            <div className="grid gap-2">
              {queryParams.map((param) => {
                const key = `query_${param.name}`;
                return renderFormField(
                  key,
                  param.schema,
                  param.required || false,
                  param.description
                );
              })}
            </div>
          </div>
        )}

        {headerParams.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-neutral-700">
              Header Parameters
            </h4>
            <div className="grid gap-2">
              {headerParams.map((param) => {
                const key = `header_${param.name}`;
                return renderFormField(
                  key,
                  param.schema,
                  param.required || false,
                  param.description
                );
              })}
            </div>
          </div>
        )}

        {bodyParams.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-medium text-neutral-700">
              Body Parameters
            </h4>
            <div className="grid gap-2">
              {bodyParams.map((param) => {
                const key = `body_${param.name}`;
                return renderFormField(
                  key,
                  param.schema,
                  param.required || false,
                  param.description
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };


  const [errorServerlessLogs, setErrorServerlessLogs] = useState<any | null>(null);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const fetchErrorLogs = async () => {
      try {
        if (deploymentInfo) {
          const endpointLink = `${deploymentInfo.baseUrl}/${deploymentInfo.stage.toLowerCase()}/docs.json`;
          await fetchServerlessLogs({
            clientDeploymentId: (deploymentInfo as ClientDeployment).id,
            endpointLink: endpointLink,
            setServerlessLogs: setErrorServerlessLogs
          });
          setFetchError(null); // Clear any previous errors
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to fetch server logs");
        setErrorServerlessLogs(null);
      }
    };
    fetchErrorLogs();
  }, [error, deploymentInfo]);


  const refreshServerlessLogs = async () => {
    if (!currentEndpointData || !deploymentInfo) return;

    setIsRefreshingLogs(true);
    try {
      const endpointLink = `${BASE_URL}${currentEndpointData.path}`;
      await fetchServerlessLogs({
        clientDeploymentId: (deploymentInfo as ClientDeployment).id,
        endpointLink: endpointLink,
        setServerlessLogs: setServerlessLogs
      });
    } catch (error) {
      // Handle error silently
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  if (!deploymentInfo && apiDoc) {
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
          </div>
        </div>
        <p className="text-sm p-4">There is an error loading the deployment info, can you refresh the page?</p>
      </div>
    );
  }


  if (error) {

    return (
      <div className="flex h-full flex-col overflow-hidden bg-background">
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
          </div>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm">There is an error loading the deployment info, checking the log...</p>

          {fetchError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{fetchError}</p>
            </div>
          )}

          {errorServerlessLogs && (
            <>
              <div className="space-y-2">
                <button
                  onClick={() => setShowErrorLogs(!showErrorLogs)}
                  className="flex w-full items-center justify-between rounded-lg border bg-white p-3 hover:bg-neutral-50"
                >
                  <span className="text-xs font-medium">View Server Logs</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showErrorLogs ? 'rotate-180' : ''}`} />
                </button>
                {showErrorLogs && (
                  <div className="overflow-hidden rounded-lg border bg-white">
                    <div className="p-3">
                      <pre className="max-h-[20vh] overflow-y-auto whitespace-pre-wrap break-words text-xs text-neutral-800">
                        {JSON.stringify(errorServerlessLogs, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-row justify-between w-full gap-2">
                <Button
                  type="submit"
                  variant={"default"}
                  onClick={() => {
                    const errorAttachment = {
                      functionLink: `${deploymentInfo?.baseUrl}/${deploymentInfo?.stage.toLowerCase()}/docs.json`,
                      serverlessLogs: errorServerlessLogs,
                      error: error,
                      deploymentInfo: deploymentInfo,
                      fetchError: fetchError
                    }
                    setSubmitAnnotations((sa) => {
                      const existingErrorAttachment = sa.find((a) => a.type === "body" && a.key === "api_errors");
                      const newAnnotations = existingErrorAttachment ? sa.filter((a) => a.type !== "body" || a.key !== "api_errors") : sa;
                      return [
                        ...newAnnotations,
                        {
                          type: "body",
                          key: "api_errors",
                          value: [...(existingErrorAttachment?.value || []), errorAttachment]
                        }
                      ]
                    });
                    setActiveTab("chat")
                    handleRightCollapse(true);
                  }}
                  className="w-full"
                >
                  <ArrowLeftIcon className="h-3 w-3" />
                  <span className="ml-2">Auto Fix this Error</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
          {endpoints.length > 0 && (
            <Button
              variant={showDocs ? "default" : "outline"}
              size="sm"
              className="ml-auto h-8 gap-2 rounded-md px-3 text-xs"
              onClick={() => setShowDocs(!showDocs)}
              disabled={isLoading}
            >
              {showDocs ? "Hide Docs" : "Show Docs"}
            </Button>
          )}
        </div>
        <div className="px-3 py-2">
          {endpoints.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1">
              <Select
                value={selectedMethod || undefined}
                onValueChange={(value: HttpMethod) => {
                  setSelectedMethod(value);
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="h-7 w-fit border-0 bg-transparent text-xs hover:bg-white focus:ring-0">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  {selectedEndpoint
                    ? endpoints
                      .filter((e) => e.path === selectedEndpoint)
                      .map((endpoint) => (
                        <SelectItem
                          key={`${endpoint.path}-${endpoint.method}`}
                          value={endpoint.method}
                          className="text-xs"
                        >
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded px-1.5 font-medium",
                              getMethodColor(endpoint.method)
                            )}
                          >
                            {endpoint.method}
                          </span>
                        </SelectItem>
                      ))
                    : HTTP_METHODS.map((method) => (
                      <SelectItem
                        key={method}
                        value={method}
                        className="text-xs"
                      >
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
                value={selectedEndpoint || undefined}
                onValueChange={(value) => {
                  setSelectedEndpoint(value);
                  // Get available methods for this endpoint
                  const endpointMethods = endpoints
                    .filter((e) => e.path === value)
                    .map((e) => e.method);
                  // Set the first available method
                  if (endpointMethods.length > 0) {
                    setSelectedMethod(endpointMethods[0] as HttpMethod);
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="h-7 w-full border-0 bg-transparent text-xs hover:bg-white focus:ring-0">
                  <SelectValue
                    className="truncate max-w-[200px]"
                    placeholder="Select Endpoint"
                  />
                </SelectTrigger>
                <SelectContent className="max-w-[300px]">
                  {[...new Set(endpoints.map((e) => e.path))].map((path) => (
                    <SelectItem key={path} value={path} className="text-xs">
                      <div className="flex items-center gap-2 w-full">
                        <span className="truncate">{path}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : apiDoc ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-blue-100 p-1">
                  <Clock className="h-4 w-4 text-blue-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-700">
                    Automated Service
                  </p>
                  <p className="text-xs text-neutral-500">
                    This API operates as an automated service (e.g., cron job)
                    and doesn&apos;t expose any interactive endpoints. Please
                    refer to the documentation for setup instructions and
                    configuration details.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-neutral-500">
                No API documentation available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="min-h-0 pb-4 flex-1 overflow-y-auto thin-scrollbar">
        {!endpoints.length && apiDoc && apiDoc.paths ? (
          <div className="p-4">
            {Object.entries(apiDoc.paths).map(([path, pathData]) => (
              <div key={`path-${path}`} className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <h3 className="mb-2 text-sm font-medium">{path}</h3>
                  <p className="text-xs text-muted-foreground">
                    {pathData[selectedMethod?.toLowerCase() ?? ""]
                      ?.description || "No description available"}
                  </p>
                </div>
                {Object.entries(pathData).map(([method, operation]) => (
                  <div
                    key={`${path}-${method}`}
                    className="space-y-4 rounded-lg border bg-white p-4"
                  >
                    <div>
                      <h4 className="text-sm font-medium">
                        {operation.summary || path}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {operation.description}
                      </p>
                    </div>
                    {operation.instructions && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium">
                          Setup Instructions
                        </p>
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                            {operation.instructions}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : endpoints.length > 0 && currentEndpointData ? (
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
                                  ).map(([key, schema]) => [
                                    key,
                                    (schema as OpenAPISchema).example ||
                                    "example_value",
                                  ])
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
                                  ).map(([key, schema]) => [
                                    key,
                                    (schema as OpenAPISchema).example ||
                                    "example_value",
                                  ])
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
                          currentEndpointData.method === "GET"
                            ? buildExampleUrl(
                              BASE_URL,
                              currentEndpointData as any
                            )
                            : BASE_URL + currentEndpointData.path,
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
                            {currentEndpointData.method === "GET"
                              ? buildExampleUrl(
                                BASE_URL,
                                currentEndpointData as any
                              )
                              : BASE_URL + currentEndpointData.path}
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
                    {currentEndpointData.responses &&
                      Object.entries(currentEndpointData.responses).map(
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
                              {(response as OpenAPIResponse).description}
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>

                {/* Setup Instructions */}
                {currentEndpointData.instructions && (
                  <div>
                    <h3 className="mb-2 text-xs font-medium">
                      Setup Instructions
                    </h3>
                    <div className="rounded-lg border bg-white p-3">
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                        {currentEndpointData.instructions}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!response ? (
                  <Form {...form}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleTrigger();
                      }}
                      className="space-y-4 p-4"
                    >
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {currentEndpointData.description}
                        </p>
                      </div>
                      {renderParameters()}
                      {currentEndpointData?.requestBody && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-neutral-700">
                            Request Body
                          </h4>
                          <div className="grid gap-2">
                            {Object.entries(
                              currentEndpointData.requestBody.content?.[
                                "application/json"
                              ]?.schema?.properties || {}
                            ).map(([key, value]) => {
                              const schema = value as OpenAPISchema;
                              return renderFormField(
                                `body_${key}`,
                                schema,
                                currentEndpointData.requestBody?.required ||
                                false,
                                currentEndpointData.requestBody?.content?.[
                                  "application/json"
                                ]?.schema?.description
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        variant={isLoading ? "destructive" : "default"}
                      >
                        {isLoading ? (
                          <>
                            <Square className="h-3 w-3" />
                            <span className="ml-2">Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            <span className="ml-2">Trigger</span>
                          </>
                        )}
                      </Button>
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
                                : response.status >= 300 &&
                                  response.status < 400
                                  ? "bg-blue-100 text-blue-700"
                                  : response.status >= 400 &&
                                    response.status < 500
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                            )}
                          >
                            {response.status}{" "}
                            {response.statusText ||
                              getStatusText(response.status)}
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
                          {response.contentType?.includes(
                            "application/json"
                          ) ? (
                            <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-xs text-neutral-800">
                              {JSON.stringify(response.data, null, 2)}
                            </pre>
                          ) : response.contentType?.includes("image/") ? (
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
                      {(response.status < 200 || response.status >= 300) &&
                        (<div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-medium">Server Logs</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setResponse(null)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-md hover:bg-neutral-100"
                            >
                              <X className="h-3 w-3 text-neutral-500" />
                            </button>
                          </div>
                        </div>)}
                      {serverlessLogs && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setShowLogs(!showLogs)}
                              className="flex w-full items-center justify-between rounded-lg border bg-white p-3 hover:bg-neutral-50"
                            >
                              <span className="text-xs font-medium">View Server Logs</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    refreshServerlessLogs();
                                  }}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-md hover:bg-neutral-100"
                                  disabled={isRefreshingLogs}
                                >
                                  <RefreshCw className={`h-3 w-3 text-neutral-500 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                                </button>
                                <ChevronDown className={`h-4 w-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                          </div>
                          {showLogs && (
                            <div className="overflow-hidden rounded-lg border bg-white">
                              <div className="p-3">
                                <pre className="max-h-[20vh] overflow-y-auto whitespace-pre-wrap break-words text-xs text-neutral-800">
                                  {JSON.stringify(serverlessLogs, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {serverlessLogs && (
                        <div className="flex flex-col items-center justify-between mb-3">
                          <Textarea
                            className="w-full mb-3"
                            value={modificationInstructions}
                            placeholder="Enter any  modification instructions you want"
                            onChange={(e) => setModificationInstructions(e.target.value)}
                            rows={3}
                          />
                          <div className="flex flex-row justify-between w-full gap-2">
                            <Button
                              type="submit"
                              variant={"default"}
                              onClick={() => {
                                const errorAttachment = {
                                  functionLink: `${BASE_URL}/${currentEndpointData.path}`,
                                  serverlessLogs: serverlessLogs,
                                  response: response,
                                  request: request,
                                  modificationInstructions: modificationInstructions
                                }
                                setModificationInstructions("");
                                setSubmitAnnotations((sa) => {
                                  const existingErrorAttachment = sa.find((a) => a.type === "body" && a.key === "api_errors");
                                  const newAnnotations = existingErrorAttachment ? sa.filter((a) => a.type !== "body" || a.key !== "api_errors") : sa;
                                  return [
                                    ...newAnnotations,
                                    {
                                      type: "body",
                                      key: "api_errors",
                                      value: [...(existingErrorAttachment?.value || []), errorAttachment]
                                    }
                                  ]
                                });
                                setActiveTab("chat")
                                handleRightCollapse(true);
                              }}
                              className="w-full"
                            >
                              <ArrowLeftIcon className="h-3 w-3" />
                              {(response.status < 200 || response.status >= 300) ?
                                <span className="ml-2">Auto Fix this Error</span>
                                : <span className="ml-2">Modify / Fix this Response</span>
                              }
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          selectedMethod &&
          selectedEndpoint && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No endpoint available for {selectedMethod} {selectedEndpoint}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default PreviewWindow;
