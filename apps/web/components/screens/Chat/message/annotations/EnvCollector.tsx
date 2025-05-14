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
import { ActionButtons } from "./ActionButtons";
import { EnvVariablesDialog } from "../EnvVariablesDialog";
import { Markdown } from "../markdown";
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

interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  description?: string;
  persona?: string;
  buttons?: any[];
}

interface EnvCollectorProps {
  uiAnnotation: UIAnnotation;
  idx: number;
  hideMetaInfo?: boolean;
}

interface CodeFile {
  fileName: any;
  filePath: any;
  fileType: any;
  meta: any;
}

interface FileNode {
  name: string;
  type: string;
  children?: Record<string, FileNode>;
  isFile: boolean;
}

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes('json')) return <FileJson className="w-3 h-3 text-yellow-500" />;
  if (type.includes('typescript') || type.includes('tsx')) return <FileCode className="w-3 h-3 text-blue-500" />;
  if (type.includes('javascript') || type.includes('jsx')) return <FileCode className="w-3 h-3 text-yellow-400" />;
  if (type.includes('css')) return <FileCode className="w-3 h-3 text-pink-500" />;
  if (type.includes('html')) return <FileCode className="w-3 h-3 text-orange-500" />;
  if (type.includes('image')) return <FileImage className="w-3 h-3 text-green-500" />;
  if (type.includes('text')) return <FileText className="w-3 h-3 text-gray-500" />;
  return <FileIcon className="w-3 h-3 text-gray-500" />;
};

const FileTreeItem = ({ node, name, level = 0 }: { node: FileNode; name: string; level?: number }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = !node.isFile;

  return (
    <div className="flex flex-col">
      <div className={cn(
        "flex items-center gap-2 py-1 relative",
        level > 0 && "pl-3"
      )}>
        {level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gray-700" />
        )}
        {isFolder ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform duration-200",
                isOpen ? "transform rotate-180" : ""
              )}
            />
            <FolderIcon className="w-3 h-3 text-blue-400" />
            <span className="text-xs">{name}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {getFileIcon(node.type)}
            <span className="text-xs text-gray-400">{name}</span>
            {node.type && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                {node.type}
              </span>
            )}
          </div>
        )}
      </div>
      {isFolder && isOpen && node.children && (
        <div className="flex flex-col">
          {Object.entries(node.children)
            .sort(([aName, aNode], [bName, bNode]) => {
              if (aNode.isFile !== bNode.isFile) {
                return aNode.isFile ? 1 : -1;
              }
              return aName.localeCompare(bName);
            })
            .map(([childName, childNode]) => (
              <FileTreeItem
                key={childName}
                node={childNode}
                name={childName}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const buildFileTree = (files: CodeFile[]): Record<string, FileNode> => {
  const tree: Record<string, FileNode> = {};
  const rootDir: string = files.find((file) => file.filePath.includes('package.json'))?.filePath.replaceAll("\\", "/").split('/').slice(0, -1).join('/') || '';
  const rewrittenFiles = files.map((file) => ({
    ...file,
    filePath: file.filePath.replaceAll("\\", "/").replace(rootDir, '')
  }));

  rewrittenFiles.forEach((file) => {
    const pathParts = file.filePath.replaceAll("\\", "/").split('/').filter(Boolean); // Filter out empty strings
    const fileName = pathParts.pop()!;

    // If no path parts, it's a root level file
    if (pathParts.length === 0) {
      tree[fileName] = {
        name: fileName,
        type: file.fileType || '',
        isFile: true
      };
      return;
    }

    // Handle nested files
    let currentLevel = tree;
    pathParts.forEach((part: string) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          type: '',
          children: {},
          isFile: false
        };
      }
      currentLevel = currentLevel[part].children!;
    });

    currentLevel[fileName] = {
      name: fileName,
      type: file.fileType || '',
      isFile: true
    };
  });

  return tree;
};

export const EnvCollector = ({ uiAnnotation, idx, hideMetaInfo = false }: EnvCollectorProps) => {
  const annotation = uiAnnotation as any;
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [showCodeFiles, setShowCodeFiles] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(true);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const params = useParams();
  const requestParamId = params?.request_id;
  const projectParamId = params?.project_id;
  const { user } = useAuth();
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
  const codeFiles = annotation.codeFiles as CodeFile[];

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

  const clientSecretKeys = customSecret?.variables as any[];
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

  const fileTree = buildFileTree(codeFiles);

  return (
    <>
      <motion.div
        key={uiAnnotation.objectType + idx}
        className={`flex flex-col gap-2 bg-white rounded-xl ${hideMetaInfo ? "" : "p-4 my-4 border border-gray-100 shadow-lg"}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >

        {!hideMetaInfo && (
          <div className="">
            <h3 className="text-lg font-semibold text-gray-900">
              {uiAnnotation.text}
            </h3>
            <p className="text-sm text-gray-500">
              {uiAnnotation.description || "Please provide the following information to continue"}
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
              {Object.entries(fileTree)
                .sort(([aName, aNode], [bName, bNode]) => {
                  if (aNode.isFile !== bNode.isFile) {
                    return aNode.isFile ? 1 : -1;
                  }
                  return aName.localeCompare(bName);
                })
                .map(([name, node]) => (
                  <FileTreeItem key={name} node={node} name={name} />
                ))}
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
                {envVariables?.map((env: any) => (
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
                ))}
              </div>
            )}
            {showEnvVars && (
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
          </div>
        )}
        {hasAllRequiredKeys && (
          <ActionButtons
            buttons={uiAnnotation.buttons}
            areKeysRequired={envVariables.length > 0}
            areKeysFilled={hasAllRequiredKeys}
          />
        )}
      </motion.div>

      <EnvVariablesDialog
        isOpen={showAddEnvModal}
        onClose={() => setShowAddEnvModal(false)}
        envVariables={envVariables}
        onSave={handleSaveEnv}
        initialValues={envValues}
      />

    </>
  );
};
