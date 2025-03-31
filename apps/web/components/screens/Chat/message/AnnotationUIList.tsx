/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import { useMicrofox } from "../../providers/MicrofoxProvider";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Target,
  TextQuote,
  FileText,
  Package,
  GitFork,
  ExternalLink,
  Key,
  Link,
  CheckCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { APIKeyDialog } from "@/components/screens/Chat/message/APIKeyDialog";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { IN_DEV } from "@/utils/constants/appInfo";

interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  persona?: string;
  buttons?: any[];
}

interface ClientSecret {
  id: string;
  name: string;
  type: string;
  variables: Array<{
    key: string;
    value: string;
    isOptional: boolean;
  }>;
}

interface RequiredKey {
  key: string;
  displayName: string;
  description: string;
}

interface Constructor {
  name: string;
  description: string;
  zodSecretSchema: string;
  auth: "apiKey" | "oauth";
  requiredKeys?: RequiredKey[];
  internalKeys: string[];
}

interface Package {
  name: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  dependencies: string[];
  status: string;
  documentation: string;
  constructors: Constructor[];
}

interface Platform {
  name: string;
  reason: string;
  packageInfo: Package;
}

const ActionButtons = (props: any) => {
  const { status, append, setInput, setMinionType } = useMicrofox();

  if (status === "streaming") {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 mt-4">
      {props?.buttonHeaderText && (
        <div className="text-md text-gray-500">{props?.buttonHeaderText}</div>
      )}
      <div className="flex gap-2 w-full">
        {props?.buttons?.map((button: any) => (
          <Button
            variant={"outline"}
            key={button.text}
            className={cn(
              `
              text-sm font-medium px-4 py-2 rounded-lg 
              bg-white hover:bg-gray-50 
              text-gray-700 hover:text-gray-900
              border border-gray-200 hover:border-gray-300
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `,
              button.type === "confirm" &&
              "bg-black text-white hover:bg-black/80 hover:text-white"
            )}
            disabled={
              !IN_DEV && (
                props.areKeysRequired &&
                !props.areKeysFilled &&
                button.type === "confirm")
            }
            onClick={() => {
              console.log("button", button);
              if (button.action === "highlightInput") {
              }
              if (button.action === "appendMessage") {
                setInput("");
                append({
                  id: crypto.randomUUID(),
                  content: button.value ?? button.text,
                  role: "user",
                  parts: [
                    {
                      type: "text",
                      text: button.value ?? button.text,
                    },
                  ],
                });
              }
              if (button.action === "shiftMinion") {
                console.log("shiftMinion", button.value);
                setMinionType(button.value);
                setInput("");
                append(
                  {
                    id: crypto.randomUUID(),
                    content:
                      button.actionText ?? button.text ?? "Changing gears..",
                    role: "user",
                    parts: [
                      {
                        type: "text",
                        text:
                          button.actionText ??
                          button.text ??
                          "Changing gears..",
                      },
                    ],
                    annotations: [
                      {
                        type: "minion",
                        value: button.value,
                      },
                    ],
                  },
                  {
                    body: {
                      minionType: button.value,
                    },
                  }
                );
              }
            }}
          >
            {button.text}
          </Button>
        ))}
      </div>
    </div>
  );
};

const TaskInfo = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const object = uiAnnotation.object;
  const [isExpanded, setIsExpanded] = useState(false);

  const getIconForKey = (key: string) => {
    switch (key.toLowerCase()) {
      case "goal":
        return <Target className="w-5 h-5 opacity-50 mt-1" />;
      case "name":
        return <TextQuote className="w-5 h-5 opacity-50 mt-1" />;
      case "summary":
        return <FileText className="w-5 h-5 opacity-50 mt-1" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-4 p-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg uppercase font-bold tracking-wider text-gray-700 border-b pb-2">
        {object.name}
      </h3>
      <div className="space-y-4">
        {Object.keys(object).map((key: string) => {
          const icon = getIconForKey(key);
          if (key === "name") {
            return null;
          }
          return (
            <div key={key} className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-semibold text-base tracking-wide text-gray-700 capitalize">
                  {key}
                </span>
              </div>
              {key === "summary" ? (
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "tracking-base pl-7 text-sm text-gray-600",
                      !isExpanded && "line-clamp-2"
                    )}
                  >
                    {object[key]}
                  </span>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="pl-7 text-left text-sm text-blue-500 hover:text-blue-700 font-medium"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                </div>
              ) : (
                <span className="tracking-base pl-7 text-sm text-gray-600">
                  {object[key]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

const TaskIntegrations = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const platforms = uiAnnotation.object.platforms as Platform[];

  // Since we're guaranteed to have only one platform and one package for now
  const platform = platforms?.[0];
  const pkg = platform?.packageInfo;

  console.log("platform", platforms, platform, pkg);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [areKeysFilled, setAreKeysFilled] = useState(false);
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();

  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;
  const { data: secretsData } = useSWR<{
    clientSecrets: ClientSecret[];
  }>(
    requestParamId
      ? `/api/client-secrets?clientRequestId=${requestParamId}`
      : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch secrets");
      return res.json();
    }
  );

  // Check for existing keys when component mounts or secrets data changes
  useEffect(() => {
    if (secretsData?.clientSecrets && platform?.name) {
      const existingSecret = secretsData.clientSecrets.find(
        (secret) => secret.type.toLowerCase() === platform.name.toLowerCase()
      );
      // Check if all required keys are present in the existing secret
      if (existingSecret && pkg?.constructors) {
        const requiredKeys = pkg.constructors.flatMap(
          (constructor: Constructor) => constructor.requiredKeys ?? []
        );
        const hasAllKeys = requiredKeys.every((keyInfo: RequiredKey) =>
          existingSecret.variables.some(
            (variable) => variable.key === keyInfo.key && variable.value.trim()
          )
        );
        setAreKeysFilled(hasAllKeys);
      }
    }
  }, [secretsData, platform?.name, pkg?.constructors]);

  // If no platform or package is available, don't render anything
  if (!platform || !pkg) {
    return null;
  }

  const areKeysRequired = pkg.constructors.some(
    (constructor: Constructor) => constructor.auth === "apiKey"
  );

  const areOAuthRequired = pkg.constructors.some(
    (constructor: Constructor) => constructor.auth === "oauth"
  );

  // Get existing secret only if platform exists
  const existingSecret = platform
    ? secretsData?.clientSecrets?.find(
      (secret) => secret.type.toLowerCase() === platform.name.toLowerCase()
    )
    : undefined;

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (submitted?: boolean) => {
    setIsDialogOpen(false);
    if (submitted) {
      setAreKeysFilled(true);
    }
  };

  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-6 p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="">
        <h3 className="text-lg font-semibold text-gray-900">
          {"Configure Integration Settings"}
        </h3>
        {areKeysRequired && (
          <p className="text-sm text-gray-500">
            Please fill in the required API keys before confirming
          </p>
        )}
        {areOAuthRequired && (
          <p className="text-sm text-gray-500">
            Please connect to {platform.name} to continue
          </p>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex rounded-lg border p-4 flex-col gap-2">
          <div className="flex items-start gap-3">
            <img src={pkg.icon} alt={pkg.name} className="w-5 h-5 mt-2" />
            <div className="flex-1">
              <div className="flex gap-2 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium w-fit text-gray-900">
                    {platform.name}
                  </span>
                  {pkg.name && (
                    <span className="text-xs flex-1 w-full bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {pkg.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {areOAuthRequired && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full border border-gray-200 relative"
                            onClick={handleOpenDialog}
                          >
                            <Key className="h-4 w-4" />
                            {!areKeysFilled ? (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" />
                            ) : (
                              <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-2.5 w-2.5 rounded-full text-green-500" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">API Keys</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {pkg.constructors.some(
                    (constructor: Constructor) => constructor.auth === "oauth"
                  ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium"
                        onClick={() => {
                          console.log("Connect to", platform.name);
                        }}
                      >
                        Connect
                      </Button>
                    )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{platform.reason}</p>
            </div>
          </div>
        </div>
      </div>

      <APIKeyDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        platform={{
          name: platform.name,
          requiredKeys: pkg.constructors.flatMap(
            (constructor: Constructor) => constructor.requiredKeys ?? []
          ),
          packageDocumentation: pkg.documentation,
        }}
        existingSecret={existingSecret}
        projectId={projectParamId}
        requestId={requestParamId}
      />
      <ActionButtons
        buttons={uiAnnotation.buttons}
        areKeysRequired={areKeysRequired}
        areKeysFilled={areKeysFilled}
      />
    </motion.div>
  );
};

const TaskStructure = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const object = uiAnnotation.object as TaskInstanceMetaType["taskStructure"];
  //console.log("object", object);
  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-2 p-0 px-4 bg-gray-100 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-bold">{uiAnnotation.text}</h3>
      <Tabs defaultValue="lambdaFunctions" className="w-full">
        <TabsList className="flex flex-wrap gap-2 justify-start items-center">
          <TabsTrigger value="lambdaFunctions">Webhooks</TabsTrigger>
          <TabsTrigger value="cronJobs">Scheduled-Jobs</TabsTrigger>
          {/* <TabsTrigger value="interactions" className="">User Interactions</TabsTrigger> */}
          <TabsTrigger value="schemas">Datatstore</TabsTrigger>
        </TabsList>
        <TabsContent value="schemas">
          <div className="flex flex-col gap-2">
            {object?.dbSchemas?.map((schema) => (
              <div key={schema.modelName} className="flex flex-col gap-1">
                <span className="font-bold text-xs tracking-wide text-gray-500">
                  {schema.modelName}
                </span>
                <pre className="text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(schema.jsonSchema, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="lambdaFunctions">
          <div className="flex flex-col gap-4">
            {object?.lambdaFunctions?.map((fn) => (
              <div key={fn.name} className="flex flex-col gap-1">
                <span className="font-bold text-sm tracking-wide text-black">
                  {fn.name}
                </span>
                <span className="text-xs text-gray-800">
                  {fn.method} {fn.path}
                </span>
                <ul className="list-disc pl-4 text-xs text-gray-500">
                  <li>What it does: {fn.description}</li>
                  <li>Result: {fn.endResult}</li>
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="cronJobs">
          <div className="flex flex-col gap-2">
            {object?.cronJobs?.map((job) => (
              <div key={job.name} className="flex flex-col gap-1">
                <span className="font-bold text-xs tracking-wide text-gray-500">
                  {job.name}
                </span>
                <span className="text-sm">{job.description}</span>
                <span className="text-xs text-gray-500">
                  Result: {job.endResult}
                </span>
                <span className="text-xs text-gray-500">
                  Cron: {job.cronExpression}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        {/* <TabsContent value="endpoints">
                    <div className="flex flex-col gap-2">
                        {object?.endpoints?.map((endpoint) => (
                            <div key={endpoint.path + endpoint.method} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">
                                    {endpoint.method} {endpoint.path}
                                </span>
                                <span className="text-sm">{endpoint.description}</span>
                            </div>
                        ))}
                    </div>
                </TabsContent> */}
        {/* <TabsContent value="interactions">
                    <div className="flex flex-col gap-2">
                        {object?.userInteractions?.map((interaction) => (
                            <div key={interaction.name} className="flex flex-col gap-1">
                                <span className="font-bold text-xs tracking-wide text-gray-500">{interaction.name}</span>
                                <span className="text-sm">{interaction.description}</span>
                                <span className="text-xs text-gray-500">Result: {interaction.endResult}</span>
                                <div className="text-xs text-gray-500">
                                    Endpoints: {interaction.endpointCall.join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent> */}
      </Tabs>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

const EnvCollector = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const annotation = uiAnnotation as any;
  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-2 p-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
    >
      <h3 className="text-lg uppercase font-bold tracking-wider text-gray-700 border-b pb-2">
        {uiAnnotation.text}
      </h3>
      <div className="flex flex-col gap-2">
        {annotation?.envVariables?.map((env: any) => (
          <span key={env}>{env}</span>
        ))}
      </div>
      <ActionButtons buttons={uiAnnotation.buttons} />
    </motion.div>
  );
};

export const AnnotationUIList = ({
  uiAnnotations,
  lastMessage,
}: {
  uiAnnotations: UIAnnotation[];
  lastMessage: boolean;
}) => {
  return uiAnnotations.map((uiAnnotation: UIAnnotation, idx: number) => {
    if (uiAnnotation.objectType === "taskInfo") {
      return (
        <TaskInfo
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "taskIntegrations") {
      return (
        <TaskIntegrations
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "taskStructure") {
      return (
        <TaskStructure
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "buttons" && lastMessage) {
      return (
        <ActionButtons
          key={uiAnnotation.objectType + idx}
          buttons={uiAnnotation.buttons}
          buttonHeaderText={(uiAnnotation as any).buttonHeaderText}
        />
      );
    }
    if (uiAnnotation.objectType === "envCollector") {
      return (
        <EnvCollector
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
  });
};
