import { ClientDeployment, DEPLOY_STAGE } from "@prisma/client";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { useTaskInstanceMetaContext } from "./TaskInstanceMetaProvider";

interface DeploymentLogData {
  id: string;
  logType: string;
  fileName: string;
  filePath: string;
  rawContent: string;
  fileSize: number;
  createdAt: string;
  lastModified: string;
}

// Updated interface to match the new standardized backend format
interface DeploymentData {
  id: string;
  clientRequestId: string;
  sha: string;
  stage: string;
  status: string;
  statusDescription: string;
  startTime?: string;
  endTime?: string;
  branchName?: string;
  prUrl?: string;
  progress: {
    percentage: number;
    step: string;
    isComplete: boolean;
  };
  duration?: number;
  durationUnit?: string;
  resources?: {
    peakCpu?: number;
    peakMemory?: number;
    finalSize?: number;
  };
  error?: any;
  lastUpdated: string;
  pid?: string;
  pm2Id?: string;
  clientDeployment?: ClientDeployment;
  logs?: string;
}

interface DeploymentApiResponse {
  success: boolean;
  data: {
    deployment: DeploymentData;
    logs: DeploymentLogData[];
    sha: string;
    logCount: number;
  };
}

// SSE events now return the same standardized format
interface SSEStatusData {
  deployment: DeploymentData;
  stage: DEPLOY_STAGE;
}

interface SSEProgressData {
  deployment: DeploymentData;
  stage: DEPLOY_STAGE;
}

interface SSECompleteData {
  deployment: DeploymentData;
  stage: DEPLOY_STAGE;
}

export const useDeployStatus = ({
  runId,
  stage,
}: {
  runId: string;
  stage: DEPLOY_STAGE;
}) => {
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const requestParamId = params?.request_id;
  const { deploymentInfo, setDeploymentInfo } = useTaskInstanceMetaContext();

  const fallbackDeployment: DeploymentData = {
    id: new Date().getTime().toString(),
    clientRequestId: requestParamId || "",
    sha: runId,
    stage: stage,
    status: "connecting",
    statusDescription: "Connecting to deployment server",
    startTime: new Date().toISOString(),
    progress: {
      percentage: 80,
      step: "connecting",
      isComplete: false,
    },
    lastUpdated: new Date().toISOString(),
    resources: {
      peakCpu: 0,
      peakMemory: 0,
      finalSize: 0,
    },
    error: undefined,
    pid: "",
    pm2Id: "",
    clientDeployment: undefined,
    logs: "",
  }

  // STEP 1: First try to get deployment by SHA using simple API
  const { data: deploymentApiData, error: apiError } = useSWR(
    runId ? [`deployment-status`, runId] : null,
    async ([_, sha]) => {
      console.log(`🔍 Attempting to fetch deployment by SHA: ${sha}`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployment-status/${sha}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`❌ Deployment not found for SHA: ${sha}`);
          return null; // Deployment not found, will need SSE
        }
        throw new Error('Failed to fetch deployment status');
      }
      const data = await response.json() as DeploymentApiResponse;
      console.log(`✅ Found deployment via API:`, data.data.deployment);
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
    }
  );

  // STEP 2: Determine if deployment is finalized
  const isDeploymentFinalized = useMemo(() => {
    if (!deploymentApiData?.data?.deployment) return false;

    const deployment = deploymentApiData.data.deployment;
    const isStatusFinalized = deployment.status === 'deployed' || deployment.status === 'failed';
    const isProgressComplete = deployment.progress?.isComplete === true;

    console.log(`📊 Checking if deployment is finalized:`, {
      status: deployment.status,
      isStatusFinalized,
      isProgressComplete,
      shouldBreak: isStatusFinalized || isProgressComplete
    });

    return isStatusFinalized || isProgressComplete;
  }, [deploymentApiData]);

  // STEP 3: Determine if we should start SSE
  const shouldStartSSE = useMemo(() => {
    // Don't start SSE if API call failed
    if (apiError && apiError.message !== 'Failed to fetch deployment status') {
      console.log(`❌ API error, not starting SSE:`, apiError.message);
      return false;
    }

    // Start SSE if deployment not found (404)
    if (!deploymentApiData) {
      console.log(`🔌 Deployment not found, will start SSE`);
      return true;
    }

    // Start SSE if deployment found but not finalized
    if (!isDeploymentFinalized) {
      console.log(`🔌 Deployment found but not finalized, will start SSE`);
      return true;
    }

    // Don't start SSE if deployment is finalized
    console.log(`✅ Deployment is finalized, skipping SSE`);
    return false;
  }, [deploymentApiData, isDeploymentFinalized, apiError]);

  // STEP 4: Start SSE only if needed
  const { data: sseData, error: sseError } = useSWRSubscription(
    shouldStartSSE && requestParamId && runId ?
      ["deployment-status-sse", requestParamId, runId] :
      null,
    ([_, clientRequestId, runId], { next }) => {
      if (!clientRequestId) {
        return () => {
          console.log("🔌 Closing SSE connection: clientRequestId is not defined");
        };
      }

      if (!runId) {
        return () => {
          console.log("🔌 Closing SSE connection: runId is not defined");
        };
      }

      console.log("🔌 Starting SSE for ongoing deployment:", {
        clientRequestId,
        runId,
      });

      const sseUrl = `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployment-status/events/${clientRequestId}/${stage?.toLowerCase()}/${runId}`;
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

          // SSE now returns the same format as API, no conversion needed
          next(null, {
            deployment: statusData.deployment,
            shouldBreak: statusData.deployment.status === "deployed" || statusData.deployment.status === "failed",
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

          // SSE now returns the same format as API, no conversion needed
          next(null, {
            deployment: progressData.deployment,
            shouldBreak: progressData.deployment.progress?.isComplete || false,
          });
        } catch (error) {
          console.error("❌ Error parsing SSE progress data:", error);
        }
      });

      eventSource.addEventListener("complete", (event: MessageEvent) => {
        try {
          const completeData: SSECompleteData = JSON.parse(event.data);
          console.log("✅ Deployment completed:", completeData);

          // SSE now returns the same format as API, no conversion needed
          next(null, {
            deployment: completeData.deployment,
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

      return () => {
        console.log("🔌 Closing SSE connection for deployment status");
        eventSource.close();
      };
    }
  );

  // STEP 5: Determine final data to return
  const finalDeploymentData = useMemo(() => {
    // If we have API data and it's finalized, use API data (no SSE needed)
    if (deploymentApiData?.data?.deployment && isDeploymentFinalized) {
      console.log(`✅ Using API data (deployment finalized)`);

      // For API data, merge the separate logs array into the deployment object
      const deployment = {
        ...deploymentApiData.data.deployment,
        logs: deploymentApiData.data.logs, // Structured logs from API
      };

      return {
        deployment,
        shouldBreak: true,
        logCount: deploymentApiData.data.logCount,
      };
    }

    // If SSE is active and we have SSE data, use SSE data
    if (sseData?.deployment) {
      console.log(`🔌 Using SSE data (real-time updates)`);
      return {
        deployment: sseData.deployment, // Already includes logs as raw string
        shouldBreak: sseData.shouldBreak,
        logCount: 0, // SSE doesn't provide log count
      };
    }

    // If we have API data but it's not finalized, still return it while SSE connects
    if (deploymentApiData?.data?.deployment) {
      console.log(`📊 Using API data (not finalized, waiting for SSE)`);

      const deployment = {
        ...deploymentApiData.data.deployment,
        logs: deploymentApiData.data.logs, // Structured logs from API
      };

      return {
        deployment,
        shouldBreak: false,
        logCount: deploymentApiData.data.logCount,
      };
    }

    return null;
  }, [deploymentApiData, sseData, isDeploymentFinalized]);

  useEffect(() => {
    const updateMetaAndInfo = async () => {
      if (finalDeploymentData?.deployment?.clientDeployment) {
        setDeploymentInfo((prev: ClientDeployment | null) => ({
          ...prev,
          ...finalDeploymentData.deployment.clientDeployment,
        }));
      }
    };
    updateMetaAndInfo();
  }, [finalDeploymentData, setDeploymentInfo]);

  return {
    isLoading: (!deploymentApiData && !apiError) || (shouldStartSSE && !sseData && !sseError),
    isValidating: false,
    deployment: finalDeploymentData?.deployment || fallbackDeployment,
    clientDeployment: finalDeploymentData?.deployment?.clientDeployment || deploymentInfo,
    shouldBreak: finalDeploymentData?.shouldBreak,
    logs: finalDeploymentData?.deployment?.logs,
    logCount: finalDeploymentData?.logCount || 0,
    error: apiError || sseError,
    isFinalized: isDeploymentFinalized,
    usingSSE: shouldStartSSE,
  };
};
