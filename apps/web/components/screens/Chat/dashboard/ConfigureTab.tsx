import { useEffect, useState } from "react";
import { LayoutDashboard, AlertTriangle, Loader2 } from "lucide-react";
import useSWR from "swr";
import { ClientDeployment } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { HttpMethod } from "@/utils/services/OpenAPIToolsClient";
import { useLayout } from "../../providers/LayoutProvider";
import { useApiDoc } from "../../providers/ApiDocProvider";
import { DeployStatus } from "./DeployStatus";
import { EndpointsSection } from "./EndpointsSection";
import { DeployStep } from "@/server/convertfox/types";
import { SecretVault } from "./SecretVault";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TaskSettings } from "./TaskSettings";
import { TaskRequiredInfo } from "./TaskRequiredInfo";

const ConfigureTab = () => {
    const { selectedRequest } = useClientProject();
    const { handleRightCollapse } = useLayout();
    const {
        taskInstanceMeta,
        mutate: mutateTaskInstanceMeta,
        deploymentInfo,
    } = useTaskInstanceMetaContext();
    const {
        endpoints,
        isLoading,
        error,
        setSelectedEndpoint,
        setSelectedMethod,
    } = useApiDoc();
    useEffect(() => {
        mutateTaskInstanceMeta();
    }, []);


    const handleEndpointClick = (endpoint: {
        path: string;
        method: HttpMethod;
    }) => {
        setSelectedEndpoint(endpoint.path);
        setSelectedMethod(endpoint.method);
        handleRightCollapse(false);
    };

    return (
        <div className="max-w-[1000px] w-full mx-auto p-6 grid grid-cols-12 gap-4 thin-scrollbar">
            <div className="col-span-12 flex items-center gap-2 mb-8">
                <LayoutDashboard className="w-5 h-5" />
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
            </div>

            <div className="col-span-12">
                <div className="grid grid-cols-12 gap-4 rounded-md mb-10">
                    <div className="col-span-8 flex flex-col items-start gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                            {selectedRequest?.title}
                        </h3>
                        <p className="text-3xl text-gray-800">
                            {taskInstanceMeta?.taskInfo?.goal ?? ""}
                        </p>
                    </div>
                </div>
                <div className="col-span-4">
                    <div className="flex flex-col items-start gap-2">

                    </div>
                </div>
            </div>

            <div className="col-span-6">
                <EndpointsSection
                    endpoints={endpoints}
                    isLoading={isLoading}
                    error={error}
                    onEndpointClick={handleEndpointClick}
                />
            </div>

            <div className="col-span-6">
                <SecretVault />
            </div>

            <div className="col-span-12">
                <TaskRequiredInfo />
            </div>

            <div className="col-span-12">
                <DeployStatus
                />
            </div>

            <div className="col-span-12">
                <TaskSettings />
            </div>
        </div>
    );
};

export default ConfigureTab;