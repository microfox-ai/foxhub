import { ClientDeployment, ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { useTaskInstanceMetaContext } from "./TaskInstanceMetaProvider";
import { DeployStep } from "@/server/convertfox/types";
import { useClientProject } from "./ClientProjectProvider";

interface SSEStatusData {
  clientRequestId: string;
  stage: string;
  status: string;
  statusDescription: string;
  progress: {
    percentage: number;
    step: string;
    isComplete: boolean;
  };
  startTime?: string;
  endTime?: string;
  pid?: string;
  pm2Id?: string;
  error?: any;
  lastUpdated: string;
  clientDeployment: ClientDeployment;
  logs?: string;
}

interface SSEProgressData {
  percentage: number;
  step: string;
  isComplete: boolean;
  status: string;
  clientDeployment: ClientDeployment;
  logs?: string;
  stage: string;
}

interface SSECompleteData {
  status: string;
  success: boolean;
  message: string;
  endTime: string;
  duration?: number;
  clientDeployment: ClientDeployment;
  logs?: string;
  stage: string;
}

export const useDeployStatus = ({
  stage,
  initialClientDeployment,
}: {
  stage: DEPLOY_STAGE;
  initialClientDeployment?: ClientDeployment;
}) => {
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const requestParamId = params?.request_id;
  const { setDeploymentInfo, updateTaskInstanceMeta, taskInstanceMeta } =
    useTaskInstanceMetaContext();

  const initialData = useMemo(() => {
    return {
      shouldBreak: taskInstanceMeta?.deployStep?.shouldBreak ??
        (initialClientDeployment?.stage === stage && taskInstanceMeta?.deployStep?.status !== "pending") ??
        false,
      deployStep: { ...taskInstanceMeta?.deployStep },
      clientDeployment: initialClientDeployment,
    };
  }, [taskInstanceMeta, initialClientDeployment, stage]);

  const { selectedRequest: clientRequest } = useClientProject();

  // Real-time deployment status subscription using SSE
  const { data: deploymentData, error: sseError } = useSWRSubscription(
    ["deployment-status-sse", requestParamId, stage],
    ([_, clientRequestId, stage], { next }) => {
      if (!clientRequestId || !stage) {
        return;
      }
      // if (taskInstanceMeta?.deployStep?.deployment?.stage === stage && taskInstanceMeta?.deployStep?.status !== "pending") {
      //   return () => {
      //     console.log("🔌 Closing SSE connection as deployment already exists");
      //   };
      // }
      const sseUrl = `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployment-status/events/${clientRequestId}/${stage?.toLowerCase()}`;
      console.log(`🔌 Establishing SSE connection to: ${sseUrl}`);

      const eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("open", (event: MessageEvent) => {
        console.log(
          "📡 SSE connection established:",
          event.data ? JSON.parse(event.data) : null
        );
      });

      eventSource.addEventListener("status", (event: MessageEvent) => {
        try {
          const statusData: SSEStatusData = JSON.parse(event.data);
          console.log("📊 Received deployment status update:", statusData);

          // Create deployStep format compatible with the context
          const deployStepData: DeployStep = {
            ...taskInstanceMeta?.deployStep,
            startTime: statusData.startTime,
            endTime: statusData.endTime,
            status:
              statusData.status === "deployed"
                ? "success"
                : statusData.status === "failed"
                  ? "failed"
                  : "pending",
            message: statusData.statusDescription,
            logs: statusData.logs,
            metadata: {
              ...taskInstanceMeta?.deployStep?.metadata,
              progress: statusData.progress,
              pid: statusData.pid,
              pm2Id: statusData.pm2Id,
              stage: statusData.stage,
              lastUpdated: statusData.lastUpdated,
            },
            shouldBreak:
              statusData.status === "deployed" ||
              statusData.status === "failed",
            deployment: {
              stage: statusData.stage?.toUpperCase(),
              type: "deployment",
              id: statusData.clientRequestId,
            },
          };
          next(null, {
            deployStep: deployStepData,
            clientDeployment: statusData.clientDeployment,
            shouldBreak:
              statusData.status === "deployed" ||
              statusData.status === "failed",
          });
        } catch (error) {
          console.error("❌ Error parsing SSE status data:", error);
          next(error as Error);
        }
      });

      eventSource.addEventListener("progress", (event: MessageEvent) => {
        try {
          const progressData: SSEProgressData = JSON.parse(event.data);
          console.log("📈 Received deployment progress update:", progressData);

          // Create updated deployStep with new progress
          const updatedDeployStep: DeployStep = {
            ...taskInstanceMeta?.deployStep,
            status:
              progressData.status === "deployed"
                ? "success"
                : progressData.status === "failed"
                  ? "failed"
                  : "pending",
            logs: progressData.logs,
            metadata: {
              ...taskInstanceMeta?.deployStep?.metadata,
              progress: progressData,
              lastUpdated: new Date().toISOString(),
            },
            deployment: {
              stage: progressData.stage?.toUpperCase(),
              type: "deployment",
              id: progressData.clientDeployment?.id,
            },
            shouldBreak: progressData.isComplete,
          };
          next(null, {
            deployStep: updatedDeployStep,
            clientDeployment: progressData.clientDeployment,
            shouldBreak: progressData.isComplete,
          });
        } catch (error) {
          console.error("❌ Error parsing SSE progress data:", error);
        }
      });

      eventSource.addEventListener("complete", (event: MessageEvent) => {
        try {
          const completeData: SSECompleteData = JSON.parse(event.data);
          console.log("✅ Deployment completed:", completeData);

          const finalDeployStep: DeployStep = {
            ...taskInstanceMeta?.deployStep,
            endTime: completeData.endTime,
            status: completeData.success ? "success" : "failed",
            message: completeData.message,
            logs: completeData.logs,
            metadata: {
              ...taskInstanceMeta?.deployStep?.metadata,
              duration: completeData.duration,
              finalStatus: completeData.status,
              lastUpdated: completeData.endTime,
            },
            deployment: {
              stage: completeData.stage?.toUpperCase(),
              type: "deployment",
              id: completeData.clientDeployment.id,
            },
            shouldBreak: true,
          };
          next(null, {
            deployStep: finalDeployStep,
            clientDeployment: completeData?.clientDeployment,
            shouldBreak: true,
          });
        } catch (error) {
          console.error("❌ Error parsing SSE complete data:", error);
        }
      });

      eventSource.addEventListener("error", (event: MessageEvent) => {
        try {
          const errorData = JSON.parse(event.data);
          console.error("❌ SSE deployment error:", errorData);
          next(new Error(`Deployment error: ${errorData.message}`));
        } catch (parseError) {
          console.error("❌ SSE connection error:", event);
          next(new Error("SSE connection failed"));
        }
      });

      eventSource.addEventListener("heartbeat", (event: MessageEvent) => {
        console.log("💓 SSE heartbeat received");
      });

      eventSource.addEventListener("close", (event: MessageEvent) => {
        try {
          const closeData = JSON.parse(event.data);
          console.log("🔌 SSE connection closing:", closeData);
        } catch (error) {
          console.log("🔌 SSE connection closed");
        }
      });

      eventSource.onerror = (error) => {
        console.error("❌ SSE connection error:", error);
        next(new Error("SSE connection failed"));
      };

      // Return cleanup function
      return () => {
        console.log("🔌 Closing SSE connection for deployment status");
        eventSource.close();
      };
    }
  );

  useEffect(() => {
    const updateMetaAndInfo = async () => {
      if (deploymentData?.deployStep) {
        await updateTaskInstanceMeta({
          ...taskInstanceMeta,
          deployStep: deploymentData.deployStep,
        });
        setDeploymentInfo((prev: ClientDeployment) => ({
          ...prev,
          ...deploymentData.clientDeployment,
        }));
      }
    };
    updateMetaAndInfo();
  }, [deploymentData]);

  return {
    isLoading: !deploymentData && !sseError && !deploymentData?.shouldBreak,
    isValidating: false,
    deployStep: deploymentData?.deployStep || taskInstanceMeta?.deployStep,
    clientRequest,
    finalData: deploymentData || initialData,
    sseError,
  };
};
