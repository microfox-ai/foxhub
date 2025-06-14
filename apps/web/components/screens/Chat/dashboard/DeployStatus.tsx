import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClientDeploymentMetadata } from "@/server/types";
import { PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { prettyPrintDuration } from "@/utils/helpers/prettyprint";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { ClientDeployment, DEPLOY_STAGE } from "@prisma/client";
import dayjs from "dayjs";
import { CheckCircle, Clock, ExternalLink, GitPullRequest, Loader2, Rocket, XCircle } from "lucide-react";
import useSWR from "swr";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useTabUi } from "../../providers/TabUiProvider";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { useDeployStatus } from "../../providers/useDeployStatus";
const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case "deployed":
            return {
                bg: "bg-green-50",
                border: "border-green-100",
                text: "text-green-700",
                badge: "bg-green-50 text-green-700 border-green-100",
                icon: "text-green-500",
            };
        case "failed":
            return {
                bg: "bg-red-50",
                border: "border-red-100",
                text: "text-red-700",
                badge: "bg-red-50 text-red-700 border-red-100",
                icon: "text-red-500",
            };
        default:
            return {
                bg: "bg-gray-50",
                border: "border-gray-100",
                text: "text-gray-700",
                badge: "bg-gray-50 text-gray-700 border-gray-100",
                icon: "text-gray-500",
            };
    }
};

const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
        case "deployed":
            return <CheckCircle className="w-5 h-5" />;
        case "failed":
            return <XCircle className="w-5 h-5" />;
        default:
            return <Loader2 className="w-5 h-5 animate-spin" />;
    }
};

const getStageColor = (stage: string) => {
    switch (stage?.toUpperCase()) {
        case "PROD":
            return {
                bg: "bg-purple-50",
                border: "border-purple-100",
                text: "text-purple-700",
                badge: "bg-purple-50 text-purple-700 border-purple-100",
            };
        case "STAGING":
            return {
                bg: "bg-blue-50",
                border: "border-blue-100",
                text: "text-blue-700",
                badge: "bg-blue-50 text-blue-700 border-blue-100",
            };
        case "DEV":
            return {
                bg: "bg-green-50",
                border: "border-green-100",
                text: "text-green-700",
                badge: "bg-green-50 text-green-700 border-green-100",
            };
        case "PREVIEW":
            return {
                bg: "bg-amber-50",
                border: "border-amber-100",
                text: "text-amber-700",
                badge: "bg-amber-50 text-amber-700 border-amber-100",
            };
        default:
            return {
                bg: "bg-gray-50",
                border: "border-gray-100",
                text: "text-gray-700",
                badge: "bg-gray-50 text-gray-700 border-gray-100",
            };
    }
};

export const DeployStatus = () => {

    const { selectedRequest } = useClientProject();
    const { deployment, clientDeployment } = useDeployStatus();

    //console.log("clientDeployment", clientDeployment);
    const { setActiveTab } = useTabUi();

    if (!deployment)
        return (
            <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Deployment Pending
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

    const startTime = dayjs(deployment.startTime);
    const endTime = deployment.endTime ? dayjs(deployment.endTime) : null;
    const duration = prettyPrintDuration(
        deployment.startTime || "",
        deployment.endTime || ""
    );

    const status = deployment?.status?.toLowerCase();
    const statusColors = getStatusColor(status || "");
    const StatusIcon = () => getStatusIcon(status || "");

    // Get stage from clientDeployment
    const stage = deployment.stage || clientDeployment?.stage || "UNKNOWN";
    const stageColors = getStageColor(stage);

    // Determine if this is a production deployment
    const isProduction = stage === DEPLOY_STAGE.PROD;
    const isStaging = stage === DEPLOY_STAGE.STAGING;


    return (
        <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col space-y-6">
                {/* Header Section with Stage Badge */}
                <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                statusColors.bg
                            )}
                        >
                            <div className={statusColors.icon}>
                                <StatusIcon />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {status === "failed" ? "Deployment Failed" :
                                        status === "deployed" ? "Successfully Deployed 🎉" :
                                            "Deployment Pending"}
                                </h3>
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    stageColors.badge
                                )}>
                                    {stage}
                                </div>
                            </div>
                            {status === "deployed" && duration && (
                                <p className="text-sm text-gray-500">Completed in {duration}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Deployment Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column - Status and Timing */}
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Deployment Status</h4>
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    status === "failed" ? "bg-red-500" :
                                        status === "deployed" ? "bg-green-500" :
                                            "bg-blue-500 animate-pulse"
                                )} />
                                <span className="text-sm font-medium capitalize">{status || "pending"}</span>
                                <span className="ml-auto text-xs font-medium">Deployed in {duration}</span>
                            </div>
                        </div>


                    </div>

                    {/* Right Column - Deployment Details */}
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Deployment Details</h4>
                            <div className="space-y-2">
                                {clientDeployment?.name && (
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-500">Name</span>
                                        <span className="text-xs font-medium max-w-[200px] truncate">{clientDeployment.name}</span>
                                    </div>
                                )}
                                {clientDeployment?.baseUrl && (
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-500">API Base URL</span>
                                        <a
                                            href={clientDeployment.baseUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs max-w-[200px] truncate font-medium text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            {clientDeployment.baseUrl}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">GitHub Repository</span>
                                    <a
                                        href={`https://github.com/${PROJECT_REPO_OWNER}/${selectedRequest?.repoName}/tree/${selectedRequest?.prBranch}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs max-w-[200px] truncate font-medium text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {`View on GitHub`}
                                        <GitPullRequest className="w-3 h-3" />
                                    </a>
                                </div>
                                {clientDeployment?.metadata && (
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-500">{(clientDeployment.metadata as unknown as ClientDeploymentMetadata)?.serverless?.stage} functions</span>
                                        <span className="text-xs font-medium">{(clientDeployment.metadata as unknown as ClientDeploymentMetadata)?.serverless?.functions?.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stage-specific actions */}
                        {status === "deployed" && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Next Steps</h4>
                                {isStaging && (
                                    <div className="text-xs text-gray-600 mb-2">
                                        Staging deployment is ready. You can now promote to production.
                                    </div>
                                )}
                                {isProduction && (
                                    <div className="text-xs text-gray-600 mb-2">
                                        Production deployment is complete. Your automation is now live.
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    {isStaging && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setActiveTab("chat");
                                            }}
                                            className="flex items-center gap-1 bg-white hover:text-purple-700 hover:bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-300"
                                        >
                                            <Rocket className="w-3 h-3" />
                                            Deploy to Production
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 