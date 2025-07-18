import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClientSecret } from "@prisma/client";
import {
  HelpCircle,
  Key,
  Plus,
  CheckCircle2,
  CodeIcon,
  ChevronDown,
  FolderIcon,
  FileText,
  FileCode,
  FileJson,
  FileType,
  FileImage,
  FileIcon,
  PencilIcon
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { EnvVariablesDialog } from "../../../../configuration/EnvVariablesDialog";
import { InternalMarkdown } from "../../../text/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { MotionConfig } from "framer-motion";
import { ClientSecretVariable } from "@/server/types";
import { ClientSecretPackageType } from "@/server/types";
import { ExtraEnvVariable, TaskInstanceMetaType } from "@/server/convertfox/helpers/types";
import { FileTree, type BuildFile, type FileTreeNode } from "../../../../code/FileTree";
import { ActionButtons } from "../../buttons_list/ActionButtons";
import { UiComponentProps } from "@/components/screens/Chat/message/uiTool/mappers/UiComponentProps";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";

interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  description?: string;
  persona?: string;
  buttons?: any[];
}

interface CodeFile {
  fileName: any;
  filePath: any;
  fileType: any;
  meta: any;
}

const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
  </div>
);

const FileTreeSkeleton = () => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2 py-1">
      <div className="w-3 h-3 bg-gray-700 rounded"></div>
      <div className="h-3 bg-gray-700 rounded w-24"></div>
    </div>
    <div className="flex items-center gap-2 py-1 pl-3">
      <div className="w-3 h-3 bg-gray-700 rounded"></div>
      <div className="h-3 bg-gray-700 rounded w-32"></div>
    </div>
    <div className="flex items-center gap-2 py-1 pl-3">
      <div className="w-3 h-3 bg-gray-700 rounded"></div>
      <div className="h-3 bg-gray-700 rounded w-28"></div>
    </div>
  </div>
);

const EnvVarsSkeleton = () => (
  <div className="flex flex-col gap-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0 last:pb-0">
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-700 rounded w-32"></div>
          <div className="w-4 h-4 bg-gray-700 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

const ButtonSkeleton = () => (
  <div className="relative px-2 pb-3">
    <div className="h-9 bg-gray-700 rounded w-32"></div>
  </div>
);

export const EnvCollector = ({
  object,
  isLastInQueue,
  lastMessage,
  text,
  description,
  buttons
}: Omit<UiComponentProps["card"], "uiType"> & { isLastInQueue?: boolean; lastMessage?: boolean }) => {

  const hideMetaInfo = false;

  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [showCodeFiles, setShowCodeFiles] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(true);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const params = useParams();
  const requestParamId = params?.request_id;
  const projectParamId = params?.project_id;
  const { user } = useAuth();
  const { selectedRequest, mutateSelectedClientRequest } = useClientProject();
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
  const customSecret = secretsData?.clientSecrets?.[0];
  // Populate form with existing values when secret is found
  useEffect(() => {
    if (customSecret?.variables) {
      const keyMap: Record<string, string> = {};
      (customSecret.variables as any[]).forEach(
        (variable: ClientSecretVariable) => {
          keyMap[variable.key] = variable.value;
        }
      );
      setEnvValues(keyMap);
    }
  }, [customSecret]);

  const { data: taskInstanceMeta, isLoading: isTaskInstanceMetaLoading } = useSWR<TaskInstanceMetaType>(
    `/api/task-instance-meta?clientRequestId=${requestParamId}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch task instance meta");
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    }, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateOnMount: true,
    refreshInterval: 10000
  }
  );

  useEffect(() => {
    if (selectedRequest && (!selectedRequest.repoName || !selectedRequest.prBranch)) {
      mutateSelectedClientRequest();
    }
  }, [selectedRequest]);

  const isLoading = isTaskInstanceMetaLoading || !taskInstanceMeta;

  const envVariables = taskInstanceMeta?.taskRequiredInfo?.customEnvVariables as ExtraEnvVariable[] ?? [];
  const codeFiles = taskInstanceMeta?.buildingStep?.files as CodeFile[] ?? [];

  const handleFileSelect = (file: FileTreeNode) => {
    // Handle file selection if needed
    console.log('Selected file:', file);
  };

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
        }
        : {
          addToClientRequest: true,
          clientRequestId: requestParamId,
          botProjectId: projectParamId,
          name: "custom_keys",
          userId: user?.id,
          type: "custom",
          packageName: ClientSecretPackageType.CUSTOM,
          packageConstructor: ClientSecretPackageType.CUSTOM,
          packageType: ClientSecretPackageType.CUSTOM,
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
    return (customSecret?.variables as any[])?.some(
      (variable) => variable.key === env.env && variable.value?.trim()
    );
  });

  // Convert CodeFile[] to BuildFile[]
  const buildFiles: BuildFile[] = codeFiles.map(file => ({
    filePath: file.filePath,
    fileType: file.fileType,
    content: file.meta?.content
  }));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 bg-neutral-900 rounded-lg p-2">
        <SkeletonLoader />
      </div>
    );
  }



  return (
    <>
      <motion.div
        className={cn(`flex flex-col gap-2 bg-white rounded-xl`,
          {
            "p-4 my-4 border border-gray-100 shadow-lg": !hideMetaInfo,
            "opacity-50": !isLastInQueue
          }
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >

        {!hideMetaInfo && (
          <div className="">
            <h3 className="text-lg font-semibold text-gray-900">
              {text}
            </h3>
            <p className="text-sm text-gray-500">
              {description || "Please provide the following information to continue"}
            </p>
          </div>)}

        <div className="flex flex-col gap-2 bg-neutral-900 rounded-lg p-2">
          <button
            onClick={() => setShowCodeFiles(!showCodeFiles)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CodeIcon className="w-4 h-4" />
              Code Files
            </h3>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-white transition-transform duration-200",
                showCodeFiles ? "transform rotate-180" : ""
              )}
            />
          </button>
          {showCodeFiles && (
            <div className="flex flex-col gap-1 rounded-lg p-2">
              {isTaskInstanceMetaLoading || !buildFiles.length ? (
                <FileTreeSkeleton />
              ) : (
                <FileTree
                  files={buildFiles}
                  onFileSelect={handleFileSelect}
                  showTitle={false}
                  allChildrenCollapsed={true}
                />
              )}
            </div>
          )}
        </div>

        {envVariables.length > 0 && (
          <div className={cn(
            "flex flex-col gap-2 rounded-lg p-2",
            hasAllRequiredKeys ? "bg-neutral-900" : "bg-neutral-100"
          )}>
            <button
              onClick={() => setShowEnvVars(!showEnvVars)}
              className="flex items-center justify-between w-full"
            >
              <h3 className={cn(
                "text-sm font-semibold flex items-center gap-2",
                hasAllRequiredKeys ? "text-white" : "text-black"
              )}>
                <Key className="w-4 h-4" />
                Secret keys
              </h3>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  hasAllRequiredKeys ? "text-white" : "text-black",
                  showEnvVars ? "transform rotate-180" : ""
                )}
              />
            </button>
            {showEnvVars && (
              <div className="flex flex-col gap-0 rounded-lg p-2">
                {isLoading ? (
                  <EnvVarsSkeleton />
                ) : (
                  envVariables?.map((env: any) => (
                    <div
                      key={env.env + env.name}
                      className={cn(
                        "flex items-center justify-between py-2 border-b last:border-b-0 last:pb-0",
                        hasAllRequiredKeys ? "border-gray-700" : "border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium text-xs",
                          hasAllRequiredKeys ? "text-gray-300" : "text-gray-900"
                        )}>{env.name}</span>
                        {customSecret?.variables?.some((variable: any) =>
                          variable.key === env.env && variable.value?.trim()
                        ) ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {showEnvVars && !isLoading && (
              <div className="relative px-2 pb-3">
                <Button
                  variant="outline"
                  className={cn(
                    "transition",
                    hasAllRequiredKeys
                      ? "text-gray-300 hover:bg-neutral-800 border-neutral-700 bg-neutral-800 hover:text-white"
                      : "text-blue-500 hover:bg-blue-50 border-blue-100 bg-blue-50 hover:text-blue-600"
                  )}
                  onClick={() => setShowAddEnvModal(true)}
                >
                  {hasAllRequiredKeys ?
                    <PencilIcon className="w-4 h-4" />
                    : <Plus className="w-4 h-4" />
                  }
                  {!hasAllRequiredKeys ? "Add the keys" : "Update the keys"}
                </Button>
              </div>
            )}
            {showEnvVars && isLoading && (
              <ButtonSkeleton />
            )}
          </div>
        )}
        <ActionButtons
          buttons={buttons ?? []}
          areKeysRequired={envVariables.length > 0}
          areKeysFilled={hasAllRequiredKeys}
          lastMessage={lastMessage}
        />
      </motion.div>

      <EnvVariablesDialog
        isOpen={showAddEnvModal}
        onClose={() => setShowAddEnvModal(false)}
        onSave={handleSaveEnv}
        envVariables={envVariables}
        initialValues={envValues}
      />

    </>
  );
};
