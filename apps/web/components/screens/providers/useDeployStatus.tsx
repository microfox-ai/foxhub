import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useParams } from "next/navigation";
import { useClientProject } from "./ClientProjectProvider";

// Backend MongoDB models interfaces
interface IDeployment {
  _id: string;
  clientRequestId: string;
  sha: string;
  stage: "PROD" | "STAGING" | "DEV" | "PREVIEW";
  status:
    | "starting"
    | "downloading"
    | "installing"
    | "configuring"
    | "deploying"
    | "deployed"
    | "failed";
  statusDescription?: string;
  startTime: string;
  endTime?: string;
  sourceDirectory: string;
  deploymentFolderPath?: string;
  branchName?: string;
  prUrl?: string;
  pm2Id?: string;
  pid?: number;
  port?: number;
  version?: string;
  localState?:
    | "active"
    | "stopped"
    | "errored"
    | "starting"
    | "awsLambda";
  lastActive?: string;
  timeoutAt?: string;
  error?: {
    message?: string;
    stack?: string;
    code?: string;
    step?: string;
  };
  metrics?: {
    system?: {
      platform?: string;
      arch?: string;
      nodeVersion?: string;
      npmVersion?: string;
    };
    timing?: {
      startTime?: string;
      endTime?: string;
      totalDuration?: number;
      stepDurations?: {
        starting?: number;
        downloading?: number;
        installing?: number;
        configuring?: number;
        deploying?: number;
      };
      durationUnit?: string;
    };
    resources?: {
      cpu?: {
        peak?: number;
        average?: number;
        noSamples?: number;
        usageUnits?: string;
      };
      memory?: {
        peak?: number;
        average?: number;
        initial?: number;
        final?: number;
        noSamples?: number;
        usageUnits?: string;
      };
      diskSize?: {
        initial?: number;
        final?: number;
        source?: number;
        usageUnits?: string;
      };
    };
    network?: {
      speed?: {
        download?: number;
        upload?: number;
        speedUnits?: string;
      };
      totalSize?: {
        downloaded?: number;
        uploaded?: number;
        sizeUnits?: string;
      };
    };
  };
  lastUpdated: string;
  cleanupScheduled?: string;
  isCleanedUp: boolean;
}

// Backend API response structure
interface BackendDeploymentData {
  deployment: IDeployment;
  deploymentLogs: string;
  statusData?: any; // File system status if available
  fileLogData?: string; // File system logs if available
  sha: string;
}

interface DeploymentApiResponse {
  success: boolean;
  data: BackendDeploymentData;
}

export const useDeployStatus = ({
  clientRequestId,
  sha,
}: {
  clientRequestId: string;
  sha: string;
}): {
  deployment: IDeployment | null;
  deploymentLogs: string | null;
  statusData: any | null;
  fileLogData: string | null;
  logs: string | null;
  isLoading: boolean;
  shouldBreak: boolean;
  progress: number;
} => {
  const { updateClientDeploymentById } = useClientProject();

  // Get deployment data via REST API - only if we have a SHA
  const swrKey = sha ? [`deployment-status-api`, sha] : null;

  const { data: deploymentApiData, error: apiError } = useSWR(
    swrKey,
    async ([_, sha]) => {
      const url = `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployment-status/${sha}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("404: Deployment not found");
        }
        const errorMessage = `HTTP ${response.status}: Failed to fetch deployment`;
        console.error(`❌ API Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as DeploymentApiResponse;
      return data.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 3000,
    }
  );

  // Check if deployment is finalized
  const isDeploymentFinalized = useMemo(() => {
    if (!deploymentApiData?.deployment) return false;
    const status = deploymentApiData?.deployment?.status;
    const isFinalized = status === "deployed" || status === "failed";
    console.log(`📊 Deployment status: ${status}, finalized: ${isFinalized}`);
    return isFinalized;
  }, [deploymentApiData]);

  // Determine if we should start SSE
  const shouldStartSSE = useMemo(() => {
    // If we don't have a SHA, don't start SSE
    if (!sha) {
      console.log(`🔌 No SHA available, not starting SSE`);
      return false;
    }

    // If deployment not found (404), start SSE to wait for deployment creation
    if (apiError) {
      console.log(`🔌 API error:`, apiError);
      if (apiError.message.includes("404")) {
        console.log(
          `🔌 Deployment not found (404), starting SSE to wait for creation`
        );
        return true;
      } else {
        console.log(
          `❌ API error (non-404), not starting SSE:`,
          apiError.message
        );
        return false;
      }
    }

    // If deployment found but not finalized, start SSE for real-time updates
    if (deploymentApiData && !isDeploymentFinalized) {
      console.log(
        `🔌 Deployment found but not finalized, starting SSE for updates`
      );
      return true;
    }

    // If deployment is finalized, no need for SSE
    if (isDeploymentFinalized) {
      console.log(`✅ Deployment finalized, skipping SSE`);
      return false;
    }

    return false;
  }, [sha, deploymentApiData, isDeploymentFinalized, apiError]);

  // SSE connection for real-time updates
  const { data: sseData, error: sseError } = useSWRSubscription(
    shouldStartSSE && sha ? [`deployment-status-sse`, sha] : null,
    ([_, sha], { next }) => {
      console.log(`🔌 Starting SSE connection for SHA: ${sha}`);

      const sseUrl = `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployment-status/events/${sha}`;
      const eventSource = new EventSource(sseUrl);

      let hasReceivedData = false;

      // Handle connection open
      eventSource.onopen = () => {
        console.log(`✅ SSE connection opened for SHA: ${sha}`);
      };

      // Handle data events (deployment updates)
      eventSource.addEventListener("data", (event: MessageEvent) => {
        try {
          hasReceivedData = true;
          const backendData: BackendDeploymentData = JSON.parse(event.data);
          console.log(
            "📊 Received deployment data update:",
            backendData?.deployment?.status
          );

          const shouldBreak =
            backendData?.deployment?.status === "deployed" ||
            backendData?.deployment?.status === "failed";

          next(null, { data: backendData, shouldBreak });
        } catch (error) {
          console.error("❌ Error parsing SSE data:", error);
          next(error as Error);
        }
      });

      // Handle waiting events (deployment not yet created)
      eventSource.addEventListener("waiting", (event: MessageEvent) => {
        try {
          hasReceivedData = true;
          const waitingData = JSON.parse(event.data);
          console.log(
            "⏳ Waiting for deployment creation:",
            waitingData.message
          );

          // Don't call next() here - just log and continue waiting
          // The backend will send a 'data' event when deployment is created
        } catch (error) {
          console.log("⏳ Waiting for deployment creation");
        }
      });

      // Handle completion events
      eventSource.addEventListener("complete", (event: MessageEvent) => {
        try {
          hasReceivedData = true;
          const completeData = JSON.parse(event.data);
          if (completeData.status === "deployed" && clientRequestId) {
            updateClientDeploymentById(clientRequestId);
          }
          console.log("✅ Deployment completed:", completeData);
          next(null, { shouldBreak: true, finalStatus: completeData.status });
        } catch (error) {
          console.log("✅ Deployment completed");
          next(null, { shouldBreak: true });
        }
      });

      // Handle error events from server
      eventSource.addEventListener("error", (event: MessageEvent) => {
        try {
          const errorData = JSON.parse(event.data);
          console.error("❌ SSE deployment error:", errorData);
          next(
            new Error(`Deployment error: ${errorData.error || "Unknown error"}`)
          );
        } catch (parseError) {
          console.error("❌ SSE error event (unparseable):", event.data);
          next(new Error("SSE deployment error"));
        }
      });

      // Handle timeout events
      eventSource.addEventListener("timeout", (event: MessageEvent) => {
        try {
          const timeoutData = JSON.parse(event.data);
          console.log("⏰ SSE timeout:", timeoutData.message);
        } catch (error) {
          console.log("⏰ SSE connection timeout");
        }
        next(new Error("Connection timeout"));
      });

      // Handle heartbeat events (keep connection alive)
      eventSource.addEventListener("heartbeat", (event: MessageEvent) => {
        try {
          const heartbeatData = JSON.parse(event.data);
          console.log("💓 SSE heartbeat received:", heartbeatData.timestamp);
        } catch (error) {
          console.log("💓 SSE heartbeat received");
        }
      });

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error("❌ SSE connection error:", error);

        // Only treat as error if we haven't received any data yet
        // If we've received data, this might be a normal connection close
        if (!hasReceivedData) {
          next(new Error("SSE connection failed"));
        } else {
          console.log("🔌 SSE connection closed after receiving data");
        }
      };

      // Cleanup function
      return () => {
        console.log(`🔌 Closing SSE connection for SHA: ${sha}`);
        eventSource.close();
      };
    }
  );

  // Determine final data to return - use SSE data if available, otherwise API data
  const finalData = sseData?.data || deploymentApiData;
  const shouldBreak = sseData?.shouldBreak || isDeploymentFinalized;

  // Debug logging (uncomment for debugging)
  // console.log(`📊 Hook status summary:`, {
  //   sha,
  //   hasApiData: !!deploymentApiData,
  //   hasApiError: !!apiError,
  //   apiErrorMessage: apiError?.message,
  //   hasSseData: !!sseData,
  //   shouldStartSSE,
  //   isDeploymentFinalized,
  //   shouldBreak,
  // });

  return {
    deployment: finalData?.deployment || {
      _id: "",
      clientRequestId: "",
      status: "starting" as const,
      statusDescription: "Initializing deployment...",
      startTime: new Date().toISOString(),
      endTime: undefined,
      stage: "STAGING",
      sha: sha || "",
      sourceDirectory: "",
      lastUpdated: new Date().toISOString(),
      isCleanedUp: false,
    },
    deploymentLogs: finalData?.deploymentLogs || null,
    statusData: finalData?.statusData || null,
    fileLogData: finalData?.fileLogData || null,
    logs: finalData?.fileLogData || finalData?.deploymentLogs || null,
    isLoading: !finalData && !apiError && !sseError,
    shouldBreak,
    progress: getDeploymentProgress(finalData?.deployment || {}),
  };
};

export const getDeploymentProgress = (deployment: Partial<IDeployment>) => {
  if (!deployment || !deployment.status) return 0;

  const statusProgressMap: Record<string, number> = {
    starting: 10,
    downloading: 20,
    installing: 30,
    configuring: 55,
    deploying: 60,
    deployed: 100,
    failed: 100,
  };

  const status = deployment.status.toLowerCase();
  const progress = statusProgressMap[status] || 0;
  return progress;
};

