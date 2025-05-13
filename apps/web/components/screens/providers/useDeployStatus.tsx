import { ClientDeployment, ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useTaskInstanceMetaContext } from "./TaskInstanceMetaProvider";
import { DeployStep } from "@/server/convertfox/types";

export const useDeployStatus = ({
    stage,
    runId,
    pingerInterval,
    initialDeployStep,
    initialClientDeployment
}: {
    stage: DEPLOY_STAGE,
    runId: number,
    pingerInterval: number,
    initialDeployStep?: DeployStep,
    initialClientDeployment?: ClientDeployment
}) => {
    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const projectParamId = params?.project_id;
    const requestParamId = params?.request_id;
    const [finalData, setFinalData] = useState<any>({
        shouldBreak: false,
        deployStep: initialDeployStep,
        clientDeployment: initialClientDeployment,
    });
    const { setDeploymentInfo } = useTaskInstanceMetaContext();

    const { data: clientRequest } = useSWR<ClientRequest>(
        requestParamId ? `/api/client-requests/${requestParamId}` : null,
        (url: string) => fetch(url).then((res) => res.json())
    );

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
            revalidateOnMount: true
        }
    );

    const deployStep = finalData?.deployStep;
    useEffect(() => {
        if (DeploymentData) {
            setFinalData(DeploymentData);
            setDeploymentInfo(DeploymentData.clientDeployment);
        }
    }, [DeploymentData]);

    return {
        deployStep,
        isLoading,
        clientRequest,
        isValidating,
        finalData,
    }
}