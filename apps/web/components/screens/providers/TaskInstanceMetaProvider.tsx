import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { ClientDeployment } from "@prisma/client";
import { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";

interface UseTaskInstanceMetaProps {
  clientRequestId: string;
}

export const useTaskInstanceMeta = ({
  clientRequestId,
}: UseTaskInstanceMetaProps) => {
  const [deploymentInfo, setDeploymentInfo] = useState<
    ClientDeployment | null
  >(null);
  const { data, error, mutate, isLoading, isValidating } = useSWR<
    TaskInstanceMetaType & { id: string }
  >(
    clientRequestId
      ? `/api/task-instance-meta?clientRequestId=${clientRequestId}`
      : null,
    async (url: string) => {
      const response = await PortalSdk.getData(url, {});
      return response[0];
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    const updateClientDeployment = async (clientDeploymentId: string) => {
      const response = await PortalSdk.getData(
        `/api/client-functions?id=${clientDeploymentId}`,
        {}
      );
      if (
        response.clientFunctions?.length > 0 &&
        response.clientFunctions?.[0]
      ) {
        setDeploymentInfo(response.clientFunctions?.[0]);
      } else {
        setDeploymentInfo(null);
      }
    };
    if (clientRequestId) {
      updateClientDeployment(clientRequestId);
    }
  }, [clientRequestId]);

  const updateTaskInstanceMeta = async (
    _taskInstanceMeta: TaskInstanceMetaType
  ) => {
    const response = await PortalSdk.putData(
      `/api/task-instance-meta`,
      _taskInstanceMeta
    );
    mutate(response as TaskInstanceMetaType & { id: string });
    return response as TaskInstanceMetaType & { id: string };
  };
  return {
    taskInstanceMeta: (Array.isArray(data) ? data[0] : data) as TaskInstanceMetaType & { id: string },
    isLoading: isLoading || isValidating,
    isError: error,
    mutate,
    deploymentInfo,
    setDeploymentInfo,
    updateTaskInstanceMeta,
  };
};

const TaskInstanceMetaContext = createContext<
  ReturnType<typeof useTaskInstanceMeta> | undefined
>(undefined);

interface TaskInstanceMetaProviderProps {
  children: React.ReactNode;
  clientRequestId: string;
  refreshInterval?: number;
}

export const TaskInstanceMetaProvider = ({
  children,
  clientRequestId,
}: TaskInstanceMetaProviderProps) => {
  const hookResult = useTaskInstanceMeta({ clientRequestId });

  return (
    <TaskInstanceMetaContext.Provider value={hookResult}>
      {children}
    </TaskInstanceMetaContext.Provider>
  );
};

export const useTaskInstanceMetaContext = () => {
  const context = useContext(TaskInstanceMetaContext);
  if (context === undefined) {
    throw new Error(
      "useTaskInstanceMetaContext must be used within a TaskInstanceMetaProvider"
    );
  }
  return context;
};
