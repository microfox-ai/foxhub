import { ClientRequest, ClientSecret } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Loader2, Clock, Database, Server, Target, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Initialize the relativeTime plugin
dayjs.extend(relativeTime);

interface JobsTabProps {
    clientRequestIds?: string[];
}

const JobsTab = ({ clientRequestIds }: JobsTabProps) => {
    const { data: clientRequestsData, error, isLoading } = useSWR(
        clientRequestIds ? `/api/client-requests?ids=${clientRequestIds.join(",")}&includeTaskInstanceMeta=true` : null,
        (url: string) => PortalSdk.getData(url, {})
    );

    const clientRequests = clientRequestsData?.data;

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading client requests...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                Failed to load client requests
            </div>
        );
    }

    if (!clientRequests || clientRequests.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No client requests found for this bot
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {clientRequests?.map((request: ClientRequest & { taskInstanceMeta: TaskInstanceMetaType }) => {
                const taskInstance = request.taskInstanceMeta;
                const hasLambdaFunctions = taskInstance?.taskStructure?.lambdaFunctions?.length ?? 0 > 0;
                const hasCronJobs = taskInstance?.taskStructure?.cronJobs?.length ?? 0 > 0;
                const hasDbSchemas = taskInstance?.taskStructure?.dbSchemas?.length ?? 0 > 0;
                const hasIntegrations = taskInstance?.taskIntegrations?.platforms?.length ?? 0 > 0;
                const deployStage = taskInstance?.deployStep?.deployment?.stage;

                return (
                    <Link
                        href={`/project/${request.botProjectId}/request/${request.id}`}
                        key={request.id}
                        className="block transition-transform hover:scale-[1.01] cursor-pointer"
                    >
                        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader className="pb-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-sm font-medium">
                                            {request.title || "Unnamed Request"}
                                        </CardTitle>
                                        {deployStage && (
                                            <Badge variant="outline" className="text-xs">
                                                {deployStage}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs">{dayjs(request.createdAt).fromNow()}</span>
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 -mt-4">
                                {taskInstance?.taskInfo && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div className="flex items-start gap-1">
                                            <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                            <span className="line-clamp-2">{taskInstance.taskInfo.goal}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    {hasLambdaFunctions && (
                                        <div className="flex items-center gap-1">
                                            <Server className="h-3 w-3" />
                                            <span>{taskInstance?.taskStructure?.lambdaFunctions?.length ?? 0} APIs</span>
                                        </div>
                                    )}
                                    {hasCronJobs && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{taskInstance?.taskStructure?.cronJobs?.length ?? 0} Cron Jobs</span>
                                        </div>
                                    )}
                                    {hasDbSchemas && (
                                        <div className="flex items-center gap-1">
                                            <Database className="h-3 w-3" />
                                            <span>{taskInstance?.taskStructure?.dbSchemas?.length ?? 0} DB Models</span>
                                        </div>
                                    )}
                                    {hasIntegrations && (
                                        <div className="flex items-center gap-1">
                                            {taskInstance?.taskIntegrations?.platforms?.map((platform: any) => (
                                                <Tooltip key={platform.name}>
                                                    <TooltipTrigger asChild>
                                                        <img src={platform.packageInfo?.icon} alt="" className="w-4 h-4" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{platform.name}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
};

export default JobsTab; 