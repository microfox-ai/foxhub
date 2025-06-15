import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClientDeployment, DEPLOY_STAGE } from "@prisma/client";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  AlertCircle,
  ArrowRight,
  CatIcon,
  Clock,
  CodeIcon,
  ExternalLink,
  FileText,
  GitFork,
  GitPullRequest,
  Info,
  Loader2,
  PackageIcon,
  Rocket,
  XIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  constructAppendBody,
  constructMessageFromButton,
} from "../messageHelpers";
import { prettyPrintDuration } from "@/utils/helpers/prettyprint";
import Cube from "@/components/ui/spinners/cube";
import { useLayout } from "@/components/screens/providers/LayoutProvider";
import { useTaskInstanceMetaContext } from "@/components/screens/providers/TaskInstanceMetaProvider";
import Link from "next/link";
import { PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { useDeployStatus } from "@/components/screens/providers/useDeployStatus";
import { useTabUi } from "@/components/screens/providers/TabUiProvider";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";
import { fetchServerlessLogs } from "@/components/screens/PreviewWindow/helpers";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AWS_LAMBDA_DEFAULT_REGION, AWS_LAMBDA_LOG_GROUP_PREFIX } from "@/utils/services/aws/aws_helper";

interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  persona?: string;
  buttons?: any[];
}

interface DeploymentsInfoProps {
  uiAnnotation: UIAnnotation;
  idx: number;
}

dayjs.extend(relativeTime);

export const DeploymentsInfo = ({
  uiAnnotation,
  idx,
}: DeploymentsInfoProps) => {
  const annotation = uiAnnotation as any;
  const pingerInterval = annotation.pingerInterval;
  const stage = annotation.stage;
  const sha = annotation.sha;
  const [showLogsDialog, setShowLogsDialog] = useState(false);

  const { isRightCollapsed, handleRightCollapse } = useLayout();
  const { append } = useMicrofoxChat();
  const { setActiveTab } = useTabUi();
  const { setSubmitAnnotations, selectedRequest, selectedClientDeployment: clientDeployment } =
    useClientProject();

  const { deployment, logs, shouldBreak, progress } = useDeployStatus(sha);

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

  const [serverlessLogs, setServerlessLogs] = useState<any>(null);
  const [checkForErrors, setCheckForErrors] = useState<boolean>(false);
  const debugIssue = () => {
    setServerlessLogs(null);
    setCheckForErrors(true);
    if (!clientDeployment) {
      toast.error("No client deployment found. Please try again later.");
      return;
    }
    const endpointLink =
      (clientDeployment as ClientDeployment)?.baseUrl +
      "/" +
      deployment?.stage?.toLowerCase() +
      "/docs.json";

    if (!clientDeployment) {
      toast.error("No client deployment found. Please try again later.");
      return;
    }

    toast.promise(
      (async () => {
        const logs = await fetchServerlessLogs({
          clientDeploymentId: clientDeployment?.id,
          endpointLink,
          setServerlessLogs: setServerlessLogs,
        });

        const errorAttachment = {
          functionLink: endpointLink,
          serverlessLogs: logs,
          deploymentInfo: clientDeployment,
        };

        console.log("errorAttachment", errorAttachment);

        setSubmitAnnotations((sa) => {
          const existingErrorAttachment = sa.find(
            (a) => a.type === "body" && a.key === "api_errors"
          );
          const newAnnotations = existingErrorAttachment
            ? sa.filter((a) => a.type !== "body" || a.key !== "api_errors")
            : sa;
          return [
            ...newAnnotations,
            {
              type: "body",
              key: "api_errors",
              value: [
                ...(existingErrorAttachment?.value || []),
                errorAttachment,
              ],
            },
          ];
        });
        setActiveTab("chat");
        handleRightCollapse(true);
      })(),
      {
        loading: "Fetching deployment logs...",
        success: "Successfully gathered debug information",
        error: "Failed to fetch deployment logs",
      }
    );
  };

  const fetchLogs = () => {
    setShowLogsDialog(true);
    setServerlessLogs(null);
    setCheckForErrors(true);
    if (!clientDeployment) {
      toast.error("No client deployment found.");
      return;
    }
    const endpointLink =
      clientDeployment?.baseUrl +
      "/" +
      deployment?.stage?.toLowerCase() +
      "/docs.json";

    if (!clientDeployment) {
      toast.error("No client deployment found. Please try again later.");
      return;
    }
    toast.promise(
      (async () => {
        const logs = await fetchServerlessLogs({
          clientDeploymentId: clientDeployment.id,
          endpointLink,
          setServerlessLogs: setServerlessLogs,
        });
        console.log("serverless logs", logs);
      })(),
      {
        loading: "Fetching serverless logs...",
        success: "Successfully gathered debug information",
        error: "Failed to fetch serverless logs",
      }
    );
  };

  if (!deployment) {
    return null;
  }

  if (!shouldBreak) {
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
              <span className="font-semibold text-blue-600">
                {deployment?.stage?.toUpperCase()}
              </span>{" "}
              environment
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              {prettyPrintDuration(
                deployment?.metrics?.timing?.startTime as string,
                new Date().toISOString()
              )}
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
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
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
            <div className="font-medium text-gray-800">
              {deployment?.stage?.toUpperCase()}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CodeIcon size={14} color="#2b7fff" />
              <span className="text-gray-500">Logs</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                className="flex-1 text-left font-medium text-gray-800 truncate hover:text-blue-600 transition-colors"
              >
                {logs?.length || 0}
              </button>
              {clientDeployment && (
                <a
                  href={`https://${AWS_LAMBDA_DEFAULT_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_LAMBDA_DEFAULT_REGION}#logsV2:log-groups/log-group/${encodeURIComponent(`${AWS_LAMBDA_LOG_GROUP_PREFIX}${clientDeployment.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md hover:bg-neutral-100"
                >
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                </a>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Rocket size={14} color="#2b7fff" />
              <span className="text-gray-500">Status</span>
            </div>
            <div className="font-medium text-yellow-600">
              {deployment?.status}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          <span>
            {deployment?.statusDescription}
          </span>
        </div>
        <LogsDialog
          isOpen={showLogsDialog}
          onClose={() => setShowLogsDialog(false)}
          logs={logs || ""}
          serverlessLogs={serverlessLogs}
        />
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
                deployment?.status === "failed"
                  ? "bg-red-500 animate-pulse"
                  : deployment?.status === "deployed"
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
              deployment?.status === "failed"
                ? "bg-red-50 text-red-700"
                : deployment?.status === "deployed"
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
            )}
          >
            {deployment?.status?.toUpperCase()}
          </span>
        </div>

        {/* Title and PR Info */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm flex items-start gap-2">
          <GitPullRequest className="w-4 h-4 text-gray-500 mt-px" />
          <div className="flex flex-col gap-1">
            <div className="font-medium text-gray-900">
              {(selectedRequest?.metadata as any)?.pr?.title as string}
            </div>
            <div className="text-gray-500 mt-1 flex items-center gap-2">
              PR #{selectedRequest?.prNumber}
              {selectedRequest?.prUrl && (
                <Link
                  href="#"
                  onClick={fetchLogs}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {" "}
                  View Logs
                </Link>
              )}
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
              {deployment?.stage || stage}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Clock size={14} color="#2b7fff" />
              <div className="text-gray-500">Duration</div>
            </div>
            <div className="font-medium text-gray-900 mt-1">
              {deployment?.metrics?.timing?.totalDuration
                ? `${(deployment?.metrics?.timing?.totalDuration / 1000).toFixed(2)} seconds`
                : "N/A"}
            </div>
          </div>
        </div>

        {deployment?.status === "failed" && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:text-blue-700 hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
              onClick={debugIssue}
            >
              <Rocket className="w-4 h-4" />
              Debug The Issue & Fix it.
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:text-blue-700 hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
              onClick={fetchLogs}
            >
              <FileText className="w-4 h-4" />
              View Logs
            </Button>
          </div>
        )}

        {deployment?.status === "deployed" && (
          <>
            {deployment?.stage === DEPLOY_STAGE.STAGING ? (
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
              {deployment?.stage === DEPLOY_STAGE.STAGING && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white hover:text-blue-700 hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
                  onClick={deployToProduction}
                >
                  <Rocket className="w-4 h-4" />
                  Deploy to Production
                </Button>
              )}
              {deployment?.stage === DEPLOY_STAGE.PROD && (
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
                  handleRightCollapse(false);
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
        logs={logs || null}
        serverlessLogs={serverlessLogs}
      />
    </>
  );
};

const LogsDialog = ({
  isOpen,
  onClose,
  logs,
  serverlessLogs,
}: {
  isOpen: boolean;
  onClose: () => void;
  logs: string | null;
  serverlessLogs: string | null;
}) => {
  const [activeTab, setActiveTab] = useState<"deployment" | "serverless">(
    "deployment"
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="h-5 w-5" />
            Deployment Logs
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Detailed logs from the deployment process
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Tabs
            defaultValue="deployment"
            className="w-full"
            onValueChange={(value) =>
              setActiveTab(value as "deployment" | "serverless")
            }
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger
                value="deployment"
                className="data-[state=active]:bg-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Deployment Logs
              </TabsTrigger>
              <TabsTrigger
                value="serverless"
                className="data-[state=active]:bg-white"
              >
                <PackageIcon className="w-4 h-4 mr-2" />
                Serverless Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deployment" className="mt-4">
              <div className="relative">
                {!logs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="w-full overflow-hidden">
                    <pre className="bg-neutral-900 text-neutral-200 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-all max-h-[50vh] w-full overflow-y-auto">
                      {logs?.split("\n")?.map((line: string, index: number) => {
                        // Try to parse timestamp if it exists in the line
                        const timestampMatch = line.match(
                          /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/
                        );
                        if (timestampMatch) {
                          const timestamp = timestampMatch[1];
                          const relativeTime = dayjs(timestamp).fromNow();
                          return (
                            <div
                              key={index}
                              className="flex items-start gap-2 break-all"
                            >
                              <span className="text-gray-400 shrink-0">
                                {relativeTime}
                              </span>
                              <span className="break-all">
                                {line.replace(timestampMatch[0], "")}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div key={index} className="break-all">
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="serverless" className="mt-4">
              <div className="relative">
                {!serverlessLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <pre className="bg-neutral-900 text-neutral-200 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-words max-h-[50vh] w-full overflow-y-auto">
                    {JSON.stringify(serverlessLogs, null, 2)}
                  </pre>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
