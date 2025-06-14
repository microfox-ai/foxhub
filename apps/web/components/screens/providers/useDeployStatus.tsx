import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { ClientDeployment } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useParams } from "next/navigation";

// Backend MongoDB models interfaces
interface IDeployment {
  _id: string;
  clientRequestId: string;
  sha: string;
  stage: "PROD" | "STAGING" | "DEV" | "PREVIEW";
  status:
    | "starting"
    | "validating"
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
  serverlessState?:
    | "active"
    | "stopped"
    | "errored"
    | "unknown"
    | "deploying"
    | "production";
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
        validating?: number;
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

export const useDeployStatus = (initialSha?: string): {
  clientDeployment: ClientDeployment | null;
  deployment: IDeployment | null;
  deploymentLogs: string | null;
  statusData: any | null;
  fileLogData: string | null;
  logs: string | null;
  isLoading: boolean;
  shouldBreak: boolean;
  progress: number;
} => {
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const requestParamId = params?.request_id;
  const [clientDeployment, setClientDeployment] =
    useState<ClientDeployment | null>(null);
  const [sha, setSha] = useState<string | undefined>(initialSha);

  // Fetch client deployment if we don't have SHA but have request ID
  useEffect(() => {
    if (!sha && requestParamId && !clientDeployment) {
      getClientDeploymentById(requestParamId)
        .then((deployment) => {
          if (deployment) {
            setClientDeployment(deployment);
            if (deployment.sha) {
              setSha(deployment.sha);
              console.log(`🔍 Found SHA: ${deployment.sha}`);
            }
          }
        })
        .catch((error) => {
          console.error(`❌ Error fetching client deployment:`, error);
        });
    }
  }, [sha, requestParamId, clientDeployment]);

  // Get deployment data via REST API - only if we have a SHA
  const swrKey = sha ? [`deployment-status-api`, sha] : null;

  const { data: deploymentApiData, error: apiError } = useSWR(
    swrKey,
    async ([_, sha]) => {
      const url = `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployment-status/${sha}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
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
      refreshInterval: 0,
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

    // If API had a non-404 error, don't start SSE
    if (apiError && !apiError.message.includes("404")) {
      console.log(
        `❌ API error (non-404), not starting SSE:`,
        apiError.message
      );
      return false;
    }

    // If deployment not found (404), start SSE to wait for deployment creation
    if (apiError && apiError.message.includes("404")) {
      console.log(
        `🔌 Deployment not found (404), starting SSE to wait for creation`
      );
      return true;
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

      eventSource.addEventListener("data", (event: MessageEvent) => {
        try {
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

      eventSource.addEventListener("complete", (event: MessageEvent) => {
        try {
          const completeData = JSON.parse(event.data);
          console.log("✅ Deployment completed:", completeData);
          next(null, { shouldBreak: true });
        } catch (error) {
          console.log("✅ Deployment completed");
          next(null, { shouldBreak: true });
        }
      });

      eventSource.addEventListener("error", (event: MessageEvent) => {
        try {
          const errorData = JSON.parse(event.data);
          console.error("❌ SSE deployment error:", errorData);
          next(
            new Error(`Deployment error: ${errorData.error || "Unknown error"}`)
          );
        } catch (parseError) {
          next(new Error("SSE connection failed"));
        }
      });

      eventSource.addEventListener("timeout", () => {
        next(new Error("Connection timeout"));
      });

      eventSource.addEventListener("heartbeat", () => {
        console.log("💓 SSE heartbeat received");
      });

      eventSource.onerror = () => {
        next(new Error("SSE connection failed"));
      };

      return () => {
        console.log("🔌 Closing SSE connection");
        eventSource.close();
      };
    }
  );

  // Determine final data to return - use SSE data if available, otherwise API data
  const finalData = sseData?.data || deploymentApiData;
  const shouldBreak = sseData?.shouldBreak || isDeploymentFinalized;

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
    clientDeployment,
    deployment: finalData?.deployment || {
      status: "...",
      statusDescription: "...",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      stage: "...",
      sha: sha || "",
      lastActive: new Date().toISOString(),
      timeoutAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
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

export const getDeploymentProgress = (deployment: IDeployment) => {
  if (!deployment) return 50;
  const statusProgressMap: Record<string, number> = {
    starting: 10,
    downloading: 20,
    installing: 30,
    configuring: 50,
    deploying: 80,
    deployed: 100,
    failed: 100,
  };
  const status = deployment?.status?.toLowerCase();
  const progress = statusProgressMap[status] || 0;
  return progress;
};

export const getClientDeploymentById = async (id: string) => {
  try {
    if (!id) {
      console.log("❌ No ID provided to getClientDeploymentById");
      return null;
    }

    console.log(`🔍 Fetching client deployment with ID: ${id}`);
    const response = await PortalSdk.getData(
      `/api/client-functions?id=${id}`,
      {}
    );
    console.log(`📊 Raw API response:`, response);

    // Handle different response structures
    if (response?.clientFunctions && Array.isArray(response.clientFunctions)) {
      const clientDeployment = response.clientFunctions[0];
      console.log(`✅ Found client deployment:`, clientDeployment);
      return clientDeployment;
    } else if (Array.isArray(response)) {
      const clientDeployment = response[0];
      console.log(
        `✅ Found client deployment (array response):`,
        clientDeployment
      );
      return clientDeployment;
    } else {
      console.log(`✅ Using direct response:`, response);
      return response;
    }
  } catch (error) {
    console.error("❌ Error fetching client deployment:", error);
    return null;
  }
};
