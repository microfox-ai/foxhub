import { useEffect, useState } from "react";
import { LayoutDashboard, AlertTriangle, Loader2 } from "lucide-react";
import useSWR from "swr";
import { ClientDeployment } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { HttpMethod } from "../../PreviewWindow/types";
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
import { RequestSettings } from "./RequestSettings";

const ConfigureTab = () => {
    const { clientRequestId } = useClientProject();
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
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-12 gap-4 thin-scrollbar">
            <div className="col-span-12 flex items-center gap-2 mb-8">
                <LayoutDashboard className="w-5 h-5" />
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
            </div>

            <div className="col-span-12">
                <DeployStatus
                />
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
                <RequestSettings />
            </div>
        </div>
    );
};

export default ConfigureTab;