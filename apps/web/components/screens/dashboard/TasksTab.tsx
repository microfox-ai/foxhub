import { ArrowLeftIcon, Clock, ChevronRight, Server, Database, Target, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { TasksTabProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskInstanceMetaType } from "@/server/convertfox/helpers/types";

// Initialize the relativeTime plugin
dayjs.extend(relativeTime);

export const TasksTab = ({
    activeTab,
    setActiveTab,
    selectedProjectClientRequests,
    selectedProjectClientRequestsLoading,
    selectedProjectId
}: TasksTabProps) => {
    return (
        <div className="bg-white rounded-lg">
            {selectedProjectClientRequestsLoading ? (
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {selectedProjectClientRequests?.length === 0 ? (
                        <p className="text-gray-500">No running tasks</p>
                    ) : (
                        <>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 thin-scrollbar">
                                {selectedProjectClientRequests?.map((request) => {
                                    const taskInstance = request.taskInstanceMeta as TaskInstanceMetaType;
                                    const hasLambdaFunctions = taskInstance?.taskStructure?.lambdaFunctions?.length ?? 0 > 0;
                                    const hasCronJobs = taskInstance?.taskStructure?.cronJobs?.length ?? 0 > 0;
                                    const hasDbSchemas = taskInstance?.taskStructure?.dbSchemas?.length ?? 0 > 0;
                                    const hasIntegrations = taskInstance?.taskIntegrations?.platforms?.length ?? 0 > 0;
                                    // const deployStage = taskInstance?.deployStep?.deployment?.stage;

                                    return (
                                        <Link
                                            href={`/project/${selectedProjectId}/request/${request.id}`}
                                            key={request.id}
                                            className="block transition-transform cursor-pointer"
                                        >
                                            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                                <div className="px-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col items-start gap-2">
                                                            <h3 className="text-md font-medium">
                                                                {request.title || "Unnamed Request"}
                                                            </h3>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <CardContent className="space-y-2 -mt-4">
                                                    {taskInstance?.taskInfo && (
                                                        <div className="text-xs text-muted-foreground space-y-1">
                                                            <div className="flex items-start gap-1">
                                                                <span className="line-clamp-2">{taskInstance.taskInfo.goal}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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
                                                        {hasLambdaFunctions && (
                                                            <div className="flex items-center gap-1">
                                                                <WrenchIcon className="h-3 w-3" />
                                                                <span>{taskInstance?.taskStructure?.lambdaFunctions?.length ?? 0} Tools</span>
                                                            </div>
                                                        )}
                                                        {hasCronJobs && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{taskInstance?.taskStructure?.cronJobs?.length ?? 0} Jobs</span>
                                                            </div>
                                                        )}
                                                        {hasDbSchemas && (
                                                            <div className="flex items-center gap-1">
                                                                <Database className="h-3 w-3" />
                                                                <span>{taskInstance?.taskStructure?.dbSchemas?.length ?? 0} Data</span>
                                                            </div>
                                                        )}
                                                        {/* <div className="flex items-center gap-2 text-muted-foreground">
                                                        <span className="text-xs">{dayjs(taskInstance?.deployStep?.endTime ?? taskInstance?.deployStep?.startTime ?? request.createdAt).fromNow()}</span>
                                                        </div>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            {deployStage ? (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {deployStage}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Building
                                                                </Badge>
                                                            )}
                                                        </div> */}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>
                            <div
                                onClick={() => setActiveTab("home")}
                                className="flex flex-row gap-2 items-center justify-start p-2 hover:text-gray-500 cursor-pointer">
                                <ArrowLeftIcon className="w-4 h-4" />
                                <span> Back Home </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}; 