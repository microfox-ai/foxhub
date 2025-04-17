/* eslint-disable @next/next/no-img-element */
import {
  constructAppendBody,
  constructMessageFromButton,
  constructShiftMinionMessage,
} from "@/components/screens/Chat/message/messageHelpers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Cube from "@/components/ui/spinners/cube";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TaskInstanceMetaType, TaskIntegrationPlatform } from "@/server/convertfox/types";
import { ClientSecretPackageType, ClientSecretVariable } from "@/server/types";
import { IN_DEV } from "@/utils/constants/appInfo";
import { prettyPrintDuration } from "@/utils/helpers/prettyprint";
import { useUser } from "@/utils/hooks/useUser";
import { ClientSecret, DEPLOY_STAGE } from "@prisma/client";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CatIcon,
  CheckCircle,
  CheckCircle2,
  Clock,
  FileText,
  GitFork,
  GitPullRequest,
  HelpCircle,
  Info,
  Key,
  Loader2,
  PackageIcon,
  Plus,
  Rocket,
  Target,
  TextQuote
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useLayout } from "../../providers/LayoutProvider";
import { useMicrofox } from "../../providers/MicrofoxProvider";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { EnvVariablesDialog } from "./EnvVariablesDialog";
import { Markdown } from "./markdown";
import { ApiKeyButton } from "./secrets/ApiKeyButton";
import { OAuthButton } from "./secrets/OAuthButton";
import {
  Constructor,
  Package
} from "./types";

dayjs.extend(duration);

interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  persona?: string;
  buttons?: any[];
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
              !IN_DEV &&
              props.areKeysRequired &&
              !props.areKeysFilled &&
              button.type === "confirm"
            }
            onClick={() => {
              console.log("button", button);
              if (button.action === "highlightInput") {
              }
              if (button.action === "appendMessage") {
                setInput("");
                append(
                  constructMessageFromButton(button),
                  constructAppendBody(button.minionType)
                );
              }
              if (button.action === "shiftMinion") {
                console.log("shiftMinion", button.value);
                setMinionType(button.value);
                setInput("");
                append(
                  constructShiftMinionMessage(button),
                  constructAppendBody(button.value)
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
        return <Target className="w-5 h-5 opacity-50 mt-1 text-blue-500" />;
      case "name":
        return (
          <TextQuote className="w-5 h-5 opacity-50 mt-1 text-purple-500" />
        );
      case "summary":
        return <FileText className="w-5 h-5 opacity-50 mt-1 text-green-500" />;
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
  const platforms = uiAnnotation.object.platforms as TaskIntegrationPlatform[];
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const { data: secretsData, mutate: mutateSecrets } = useSWR<{
    clientSecrets: ClientSecret[];
  }>(
    requestParamId
      ? `/api/client-secrets?clientRequestId=${requestParamId}`
      : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch secrets");
      return res.json();
    },
    {
      revalidateOnFocus: true,
    }
  );
  const oauthSecrets = secretsData?.clientSecrets?.filter((secret) => secret.packageType === ClientSecretPackageType.OAUTH2);


  // Compute platform statuses using useMemo to avoid unnecessary recalculations
  const { platformKeyStatus, oauthStatus } = useMemo(() => {
    const keyStatus: Record<string, boolean> = {};
    const authStatus: Record<string, boolean> = {};

    platforms.forEach((platform) => {
      // Set default status for non-optional platforms
      if (!platform.optional) {
        keyStatus[platform.name] = false;
        authStatus[platform.name] = false;
      }
      // Check API Keys
      if (platform.packageInfo?.constructors.some((c: Constructor) => c.auth === "apiKey")) {
        const constructor = platform.packageInfo?.constructors.find((c: Constructor) => c.auth === "apiKey");
        const apiKeySecret = secretsData?.clientSecrets?.find((secret) =>
          secret !== undefined && secret.packageName === platform.packageInfo?.name && secret.packageConstructor === constructor?.name
        );
        if (apiKeySecret && constructor && constructor.requiredKeys) {
          keyStatus[platform.name] = apiKeySecret ? constructor.requiredKeys.every(
            (keyInfo: ClientSecretVariable) =>
              (apiKeySecret.variables as any[]).some(
                (variable: ClientSecretVariable) =>
                  variable.key === keyInfo.key && variable.value?.trim()
              )
          ) : false;
        }
      }
      // Check OAuth
      if (platform.packageInfo?.constructors.some((c: Constructor) => c.auth === "oauth2")) {
        const oauthConstructor = platform.packageInfo.constructors.find((c: Constructor) => c.auth === "oauth2");
        const oauthSecret = secretsData?.clientSecrets?.find((secret) =>
          secret !== undefined && secret.packageName === platform.packageInfo?.name && secret.packageConstructor === oauthConstructor?.name
        );
        if (oauthConstructor && oauthSecret && oauthConstructor.internalKeys) {
          authStatus[platform.name] = oauthSecret
            ? (oauthSecret.variables as any[]).every(
              (variable: ClientSecretVariable) =>
                variable.value?.trim() !== "" &&
                oauthConstructor.internalKeys.some(
                  (key: ClientSecretVariable) => key.key === variable.key
                )
            )
            : false;
        }
      }
    });

    return { platformKeyStatus: keyStatus, oauthStatus: authStatus };
  }, [platforms, secretsData?.clientSecrets, oauthSecrets]);

  // Memoize the areKeysFilled check
  const areKeysFilled = useMemo(() => {
    return platforms.every((platform) => {
      // If platform is optional, skip the check
      if (platform.optional) return true;

      const requiresApiKey = platform.packageInfo?.constructors.some(
        (c: Constructor) => c.auth === "apiKey"
      );
      const requiresOauth = platform.packageInfo?.constructors.some(
        (c: Constructor) => c.auth === "oauth2"
      );

      // Check both API key and OAuth status if required
      if (requiresApiKey && requiresOauth) {
        return platformKeyStatus[platform.name] && oauthStatus[platform.name];
      }
      // Check only API key status if required
      if (requiresApiKey) {
        return platformKeyStatus[platform.name];
      }
      // Check only OAuth status if required
      if (requiresOauth) {
        const oauthConstructor = platform.packageInfo.constructors.find(
          (c: Constructor) => c.auth === "oauth2"
        );
        const matchingOAuthSecret = oauthSecrets?.find(
          (secret) =>
            secret.type ===
            `${platform.packageInfo.name}/${oauthConstructor?.name}`
        );

        const doKeysHaveValues = matchingOAuthSecret?.variables.every(
          (variable: any) => variable.value?.trim() !== ""
        );

        const areKeysMatchingwithInternalKeys =
          matchingOAuthSecret?.variables.every((variable: any) =>
            oauthConstructor?.internalKeys.some((key: ClientSecretVariable) => {
              if (variable.key === "SCOPES") return true;
              return key.key === variable.key;
            })
          );

        return doKeysHaveValues && areKeysMatchingwithInternalKeys;
      }
      return true;
    });
  }, [platforms, platformKeyStatus, oauthStatus, oauthSecrets]);


  // If no platforms available, don't render anything
  if (!platforms || platforms.length === 0) {
    return null;
  }

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
          Configure Integration Settings
        </h3>
        <p className="text-sm text-gray-500">
          Please configure the required integrations to continue
        </p>
      </div>

      <div className="grid gap-4">
        {platforms.map((platform, index) => {
          const packageInfo = platform.packageInfo as Package;
          const areApiKeysRequired = packageInfo?.constructors.some(
            (constructor: Constructor) => constructor.auth === "apiKey"
          );
          const areOAuthRequired = packageInfo?.constructors.some(
            (constructor: Constructor) => constructor.auth === "oauth2"
          );
          return (
            <div
              key={platform.name}
              className="flex rounded-lg border p-4 flex-col gap-2"
            >
              <div className="flex items-start gap-3">
                <img src={packageInfo?.icon} alt={packageInfo?.name} className="w-5 h-5 mt-2" />
                <div className="flex-1">
                  <div className="flex gap-2 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-fit text-gray-900">
                        {platform.name}
                      </span>
                      <TooltipProvider>
                        <Tooltip delayDuration={500}>
                          <TooltipTrigger asChild>
                            <span className="text-xs line-clamp-1 max-w-[200px] flex-1 w-full bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              {packageInfo?.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{packageInfo?.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200">
                      {areOAuthRequired && (
                        <OAuthButton
                          platform={platform}
                          secretsData={secretsData}
                          mutateSecrets={mutateSecrets}
                        />
                      )}
                      {areApiKeysRequired && (
                        <ApiKeyButton
                          platform={platform}
                          secretsData={secretsData}
                          mutateSecrets={mutateSecrets}
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {platform.reason}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ActionButtons
        buttons={uiAnnotation.buttons}
        areKeysRequired={platforms.some(
          (p) =>
            !p.optional &&
            (p.packageInfo?.constructors.some(
              (c: Constructor) => c.auth === "apiKey"
            ) ||
              p.packageInfo?.constructors.some(
                (c: Constructor) => c.auth === "oauth2"
              ))
        )}
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
  return (
    <motion.div
      key={uiAnnotation.objectType + idx}
      className="flex flex-col gap-4 p-3 py-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="">
        <h3 className="text-lg font-semibold text-gray-900">
          {uiAnnotation.text}
        </h3>
        <p className="text-sm text-gray-500">
          Review and manage your task&apos;s components
        </p>
      </div>

      {object && (
        <Tabs
          defaultValue={
            object.lambdaFunctions && object.lambdaFunctions.length > 0
              ? "lambdaFunctions"
              : object.cronJobs && object.cronJobs.length > 0
                ? "cronJobs"
                : object.dbSchemas && object.dbSchemas.length > 0
                  ? "schemas"
                  : undefined
          }
          className="w-full"
        >
          <TabsList
            className="grid gap-2 justify-start items-center bg-gray-50/50 p-1 rounded-lg"
            style={{
              gridTemplateColumns: `repeat(${(object.lambdaFunctions && object.lambdaFunctions.length > 0
                ? 1
                : 0) +
                (object.cronJobs && object.cronJobs.length > 0 ? 1 : 0) +
                (object.dbSchemas && object.dbSchemas.length > 0 ? 1 : 0)
                }, minmax(0, 1fr))`,
            }}
          >
            {object.lambdaFunctions && object.lambdaFunctions.length > 0 && (
              <TabsTrigger
                value="lambdaFunctions"
                className="data-[state=active]:bg-white !px-2"
              >
                <PackageIcon className="w-4 h-4" />
                Webhooks
              </TabsTrigger>
            )}
            {object.cronJobs && object.cronJobs.length > 0 && (
              <TabsTrigger
                value="cronJobs"
                className="data-[state=active]:bg-white !px-2"
              >
                <GitFork className="w-4 h-4" />
                Scheduled-Jobs
              </TabsTrigger>
            )}
            {object.dbSchemas && object.dbSchemas.length > 0 && (
              <TabsTrigger
                value="schemas"
                className="data-[state=active]:bg-white !px-2"
              >
                <FileText className="w-4 h-4" />
                Datatstore
              </TabsTrigger>
            )}
          </TabsList>

          {object.dbSchemas && object.dbSchemas.length > 0 && (
            <TabsContent value="schemas" className="mt-4">
              <div className="grid gap-4">
                {object.dbSchemas.map((schema) => (
                  <div
                    key={schema.modelName}
                    className="bg-gray-50 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">
                        {schema.modelName}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Schema
                      </span>
                    </div>
                    <pre className="text-xs bg-white p-3 rounded-md border overflow-x-auto">
                      {JSON.stringify(schema.jsonSchema, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {object.lambdaFunctions && object.lambdaFunctions.length > 0 && (
            <TabsContent value="lambdaFunctions" className="mt-4">
              <div className="grid gap-4">
                {object.lambdaFunctions.map((fn) => (
                  <div
                    key={fn.name}
                    className="bg-gray-50 rounded-lg p-4 space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {fn.name}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full font-bold font-mono",
                            fn.method === "GET" && "bg-blue-100 text-blue-700",
                            fn.method === "POST" &&
                            "bg-green-100 text-green-700",
                            fn.method === "PUT" &&
                            "bg-amber-100 text-amber-700",
                            fn.method === "DELETE" && "bg-red-100 text-red-700"
                          )}
                        >
                          {fn.method}
                        </span>
                      </div>
                      <pre className="text-xs flex items-center text-gray-600 bg-gray-100 px-1 rounded-md border w-fit">
                        {fn.path}
                      </pre>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <Target className="w-4 h-4 mt-1 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {fn.description}
                        </span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <CheckCircle className="w-4 h-4 mt-1 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {fn.endResult}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {object.cronJobs && object.cronJobs.length > 0 && (
            <TabsContent value="cronJobs" className="mt-4">
              <div className="grid gap-4">
                {object.cronJobs.map((job) => (
                  <div
                    key={job.name}
                    className="bg-gray-50 rounded-lg p-4 space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {job.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Scheduled
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-2 opacity-50" />
                        {job.cronExpression}
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="">
                          <Target className="w-4 h-4 mt-1 text-gray-400" />
                        </div>
                        <span className="text-sm text-gray-600">
                          {job.description}
                        </span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <CheckCircle className="w-4 h-4 mt-1 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {job.endResult}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
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
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<any>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const params = useParams();
  const requestParamId = params?.request_id;
  const projectParamId = params?.project_id;
  const { user } = useUser();
  const { data: secretsData, mutate: mutateSecrets } = useSWR<{
    clientSecrets: ClientSecret[];
  }>(
    requestParamId
      ? `/api/client-secrets?clientRequestId=${requestParamId}&packageType=${ClientSecretPackageType.CUSTOM}`
      : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch secrets");
      return res.json();
    }
  );

  // Populate form with existing values when secret is found
  useEffect(() => {
    if (secretsData?.clientSecrets?.[0]?.variables) {
      const keyMap: Record<string, string> = {};
      (secretsData.clientSecrets[0].variables as any[]).forEach((variable: ClientSecretVariable) => {
        keyMap[variable.key] = variable.value;
      });
      setEnvValues(keyMap);
    }
  }, [secretsData]);

  const clientSecretKeys = (secretsData?.clientSecrets?.[0]?.variables as any[]);
  const envVariables = annotation.envVariablesCollect;
  // .filter((env: any) =>
  //   clientSecretKeys?.some((key) => key.key !== env.env && !env.isSameAs)
  // );

  const handleSaveEnv = async (values: Record<string, string>) => {
    try {
      const existingSecret = secretsData?.clientSecrets?.[0];
      const endpoint = "/api/client-secrets";
      const method = existingSecret ? "PUT" : "POST";

      const body = existingSecret
        ? {
          id: existingSecret.id,
          variables: Object.entries(values)
            .filter(([_, value]) => value.trim())
            .map(([key, value]) => ({
              key,
              value: value.trim(),
              isOptional: false,
            })),
          clientRequestId: requestParamId,
          botProjectId: projectParamId,
          userId: user?.id,
          name: "custom_keys",
          type: "custom",
        }
        : {
          clientRequestId: requestParamId,
          botProjectId: projectParamId,
          name: "custom_keys",
          userId: user?.id,
          type: "custom",
          variables: Object.entries(values)
            .filter(([_, value]) => value.trim())
            .map(([key, value]) => ({
              key,
              value: value.trim(),
              isOptional: false,
            })),
        };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to save environment variables");
      }

      await mutateSecrets();
      toast.success(
        existingSecret
          ? "Environment variables updated successfully"
          : "Environment variables saved successfully"
      );
    } catch (error) {
      console.error("Error saving environment variables:", error);
      toast.error("Failed to save environment variables. Please try again.");
      throw error;
    }
  };

  const hasAllRequiredKeys = envVariables.every((env: any) => {
    // Only check if the key exists in backend data
    return (secretsData?.clientSecrets?.[0]?.variables as any[])?.some(
      (variable) => variable.key === env.env && variable.value?.trim()
    );
  });

  if (envVariables.length === 0) {
    return null;
  }

  return (
    <>
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
            {uiAnnotation.text}
          </h3>
          <p className="text-sm text-gray-500">
            Please provide the following information to continue
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {envVariables?.map((env: any) => (
            <div
              key={env.env + env.name}
              className="flex items-center justify-between  pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{env.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={3000}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-blue-500 hover:text-blue-600 transition-colors p-1 rounded-md border border-blue-100 bg-blue-50 hover:bg-blue-100"
                        onClick={() => {
                          setSelectedEnv(env);
                          setShowDocDialog(true);
                        }}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-[250px] text-xs bg-blue-50 text-blue-900 border border-blue-100 shadow-sm px-3 py-2 [&>svg]:hidden"
                      showArrow={false}
                    >
                      <p>Click for detailed documentation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Button
              variant="outline"
              className="text-blue-500 hover:bg-blue-50 border-blue-100 bg-blue-50 hover:text-blue-600 transition"
              onClick={() => setShowAddEnvModal(true)}
            >
              <Plus className="w-4 h-4 " />
              {!hasAllRequiredKeys ? "Add the keys" : "Update the keys"}
            </Button>
            {!hasAllRequiredKeys ? (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-5 w-5 rounded-full text-green-500" />
            )}
          </div>
        </div>

        <ActionButtons
          buttons={uiAnnotation.buttons}
          areKeysRequired={envVariables.length > 0}
          areKeysFilled={hasAllRequiredKeys}
        />
      </motion.div>

      <EnvVariablesDialog
        isOpen={showAddEnvModal}
        onClose={() => setShowAddEnvModal(false)}
        envVariables={envVariables}
        onSave={handleSaveEnv}
        initialValues={envValues}
      />

      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <HelpCircle className="h-5 w-5" />
              {selectedEnv?.name} Documentation
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Detailed information about this environment variable
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Description</h4>
              <p className="text-sm text-gray-600">{selectedEnv?.what}</p>
            </div>

            {selectedEnv?.how && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">How to Set Up</h4>
                <div className="space-y-3">
                  {selectedEnv.how
                    .split("\n")
                    .map((line: string, i: number) => (
                      <div key={line + i} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        <div className="flex-1 prose prose-sm max-w-none">
                          <Markdown>{line}</Markdown>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {selectedEnv?.examples && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Examples</h4>
                <div className="space-y-2">
                  {selectedEnv.examples.map((example: string, i: number) => (
                    <div
                      key={example + i}
                      className="bg-gray-50 p-3 rounded-md"
                    >
                      <Markdown>{example}</Markdown>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LogsDialog = ({
  isOpen,
  onClose,
  jobId,
  repoName,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  repoName: string;
}) => {
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/github/logs?jobId=${encodeURIComponent(jobId)}&repoName=${encodeURIComponent(repoName)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch logs");
        }
        const data = await response.json();
        setLogs(data.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && jobId) {
      fetchLogs();
    }
  }, [isOpen, jobId, repoName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="h-5 w-5" />
            Deployment Logs
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Detailed logs from the deployment process
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 py-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : (
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {logs}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DeploymentsInfo = ({
  uiAnnotation,
  idx,
}: {
  uiAnnotation: UIAnnotation;
  idx: number;
}) => {
  const annotation = uiAnnotation as any;
  const pingerInterval = annotation.pingerInterval;
  const stage = annotation.stage;
  const runId = annotation.runId;
  const [finalData, setFinalData] = useState<any>(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const { isRightCollapsed, handleRightCollapse } = useLayout();
  const { setDeploymentInfo } = useTaskInstanceMetaContext();
  const { append, setActiveTab } = useMicrofox();
  const {
    data: DeploymentData,
    isLoading,
    isValidating,
  } = useSWR(
    finalData?.shouldBreak
      ? null
      : `/api/client-functions/deployer?stage=${stage}&runId=${runId}&clientRequestId=${requestParamId}`,
    (url: string) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: pingerInterval,
    }
  );

  const deployStep = finalData?.deployStep;
  useEffect(() => {
    if (DeploymentData) {
      console.log(DeploymentData, "DeploymentData");
      setFinalData(DeploymentData);
      setDeploymentInfo(DeploymentData.clientDeployment);
    }
  }, [DeploymentData]);

  const deployToProduction = () => {
    console.log("deployToProduction");
    append(
      constructMessageFromButton(
        {
          text: "Deploy to Production !",
          minionType: "deployfox",
        },
        [
          {
            type: "attachment",
            key: "stage",
            value: DEPLOY_STAGE.PROD,
          },
        ]
      ),
      constructAppendBody("deployfox", {
        stage: DEPLOY_STAGE.PROD,
      })
    );
  };

  const [elapsedTime, setElapsedTime] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);

  // Rotating status messages to keep the user engaged
  const statusMessages = [
    "Preparing deployment resources and configuring environment...",
    "Building application packages and dependencies...",
    "Optimizing assets and code bundles...",
    "Setting up infrastructure and services...",
    "Configuring environment variables and secrets...",
    "Almost there! Finalizing deployment process...",
  ];

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Rotate status messages every 15 seconds
    const messageInterval = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 15000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(messageInterval);
    };
  }, []);

  if (!finalData) {
    return null;
  }

  if (!finalData?.shouldBreak) {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins > 0 ? `${mins}m ` : ""}${secs}s`;
    };

    // Calculate progress percentage (assuming 2 minutes = 120 seconds)
    const progressPercentage = Math.min(
      Math.floor((elapsedTime / 120) * 100),
      95
    );

    return (
      <motion.div
        className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cube size={16} color="#2b7fff" />
            <h3 className="text-base font-medium text-gray-800">
              Deploying to{" "}
              <span className="font-semibold text-blue-600">{stage}</span>{" "}
              environment
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        {/* Estimated time message */}
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <Info size={14} />
          <span>
            This deployment typically takes about 2 minutes to complete.
          </span>
        </div>

        {/* Progress bar with percentage */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <PackageIcon size={14} color="#2b7fff" />
              <span className="text-gray-500">Environment</span>
            </div>
            <div className="font-medium text-gray-800">{stage}</div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <GitFork size={14} color="#2b7fff" />
              <span className="text-gray-500">Branch</span>
            </div>
            <div className="font-medium text-gray-800 truncate">
              {finalData?.clientDeployment?.branch || "main"}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Rocket size={14} color="#2b7fff" />
              <span className="text-gray-500">Status</span>
            </div>
            <div className="font-medium text-yellow-600">In Progress</div>
          </div>
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          <span>{statusMessages[statusMessageIndex]}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
        {/* Header with Status */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                deployStep.status === "failed"
                  ? "bg-red-500 animate-pulse"
                  : deployStep.status === "success"
                    ? "bg-green-500"
                    : "bg-yellow-500 animate-pulse"
              )}
            />
            <h2 className="text-xl font-medium text-gray-900">
              Deployment Status
            </h2>
          </div>
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full",
              deployStep.status === "failed"
                ? "bg-red-50 text-red-700"
                : deployStep.status === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
            )}
          >
            {deployStep.status.toUpperCase()}
          </span>
        </div>

        {/* Title and PR Info */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm flex items-start gap-2">
          <GitPullRequest className="w-4 h-4 text-gray-500 mt-px" />
          <div className="flex flex-col gap-1">
            <div className="font-medium text-gray-900">
              {deployStep.metadata.display_title}
            </div>
            <div className="text-gray-500 mt-1">
              PR #{deployStep.metadata.pull_requests[0].number}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <PackageIcon size={14} color="#2b7fff" />
              <div className="text-gray-500">Environment</div>
            </div>
            <div className="font-medium text-gray-900 mt-1">
              {deployStep.stage}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Clock size={14} color="#2b7fff" />
              <div className="text-gray-500">Duration</div>
            </div>
            <div className="font-medium text-gray-900 mt-1">
              {prettyPrintDuration(deployStep.startTime, deployStep.endTime)}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {/* <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => setShowLogsDialog(true)}
          >
            <FileText className="w-3 h-3" />
            View Logs
          </Button>
        </div> */}

        {/* Run Info */}
        {/* <div className="text-xs text-gray-500">
          Attempt {deployStep.metadata.run_attempt} of deployment #
          {deployStep.metadata.run_number}
        </div> */}

        {deployStep.status === "success" && (
          <>
            {deployStep.stage === DEPLOY_STAGE.STAGING ? (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-900">Staging </span>
                environment is ready to be promoted to{" "}
                <span className="font-medium text-gray-900">Production</span>
              </div>
            ) : (
              <div className="text-md text-gray-500">
                <span className="font-medium text-gray-900">
                  Automation Published !
                </span>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {deployStep.stage === DEPLOY_STAGE.STAGING && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white hover:text-blue-700 hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
                  onClick={deployToProduction}
                >
                  <Rocket className="w-4 h-4" />
                  Deploy to Production
                </Button>
              )}
              {deployStep.stage === DEPLOY_STAGE.PROD && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white hover:text-blue-700 hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
                  onClick={() => {
                    setActiveTab("dashboard");
                  }}
                >
                  <CatIcon className="w-4 h-4" />
                  Open Dashboard
                </Button>
              )}
              <Button
                onClick={() => {
                  setDeploymentInfo(finalData.clientDeployment);
                  handleRightCollapse(!isRightCollapsed);
                }}
                variant="default"
                className="group/button flex items-center gap-2"
              >
                Test Endpoints
                <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform" />
              </Button>
            </div>
          </>
        )}
      </div>

      <LogsDialog
        isOpen={showLogsDialog}
        onClose={() => setShowLogsDialog(false)}
        jobId={deployStep.metadata.job_id}
        repoName={finalData?.clientDeployment?.repoName}
      />
    </>
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
    if (uiAnnotation.objectType === "deploymentsInfo") {
      return (
        <DeploymentsInfo
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
  });
};
