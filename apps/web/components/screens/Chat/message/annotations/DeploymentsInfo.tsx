import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClientDeployment, ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    CatIcon,
    Clock,
    FileText,
    GitFork,
    GitPullRequest,
    Info,
    Loader2,
    PackageIcon,
    Rocket,
    XIcon
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { constructAppendBody, constructMessageFromButton } from "../messageHelpers";
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

export const DeploymentsInfo = ({
    uiAnnotation,
    idx,
}: DeploymentsInfoProps) => {
    const annotation = uiAnnotation as any;
    const pingerInterval = annotation.pingerInterval;
    const stage = annotation.stage;
    const runId = annotation.runId;
    const [showLogsDialog, setShowLogsDialog] = useState(false);

    const { isRightCollapsed, handleRightCollapse } = useLayout();
    const { setDeploymentInfo } = useTaskInstanceMetaContext();
    const { append } = useMicrofoxChat();
    const { setActiveTab } = useTabUi();
    const { setSubmitAnnotations, setAutoSubmit } = useClientProject();
    const { finalData, deployStep, clientRequest } = useDeployStatus({
        stage,
        runId,
        pingerInterval
    });

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
        const endpointLink = (finalData?.clientDeployment as ClientDeployment).baseUrl + "/" + deployStep?.stage?.toLowerCase() + "/docs.json";
        toast.promise(
            (async () => {
                const logs = await fetchServerlessLogs({
                    clientDeploymentId: (finalData?.clientDeployment).id,
                    endpointLink,
                    setServerlessLogs: setServerlessLogs
                });

                const errorAttachment = {
                    functionLink: endpointLink,
                    serverlessLogs: logs,
                    deploymentInfo: finalData?.clientDeployment,
                }

                console.log("errorAttachment", errorAttachment);

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
            })(),
            {
                loading: 'Fetching deployment logs...',
                success: 'Successfully gathered debug information',
                error: 'Failed to fetch deployment logs'
            }
        );
    };

    const fetchLogs = () => {
        setShowLogsDialog(true);
        setServerlessLogs(null);
        setCheckForErrors(true);
        const endpointLink = (finalData?.clientDeployment as ClientDeployment).baseUrl + "/" + deployStep?.stage?.toLowerCase() + "/docs.json";
        toast.promise(
            (async () => {
                const logs = await fetchServerlessLogs({
                    clientDeploymentId: (finalData?.clientDeployment).id,
                    endpointLink,
                    setServerlessLogs: setServerlessLogs
                });
            })(),
            {
                loading: 'Fetching deployment logs...',
                success: 'Successfully gathered debug information',
                error: 'Failed to fetch deployment logs'
            }
        );
    }

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
                        <div className="text-gray-500 mt-1 flex items-center gap-2">
                            PR #{deployStep.metadata.pull_requests[0].number}
                            <Link href={`https://github.com/${PROJECT_REPO_OWNER}/${clientRequest?.repoName}/actions/runs/${runId}`} target="_blank" className="text-blue-500 hover:text-blue-600"> View Action</Link>
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

                {deployStep.status === "failed" && (
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
                jobId={deployStep.metadata.job_id}
                repoName={finalData?.clientDeployment?.repoName}
            />

            <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                            <FileText className="h-5 w-5" />
                            Serverless Logs
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Detailed logs from the serverless deployment
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mt-4">
                        {!serverlessLogs ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                                {JSON.stringify(serverlessLogs, null, 2)}
                            </pre>
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