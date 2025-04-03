import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { createContext, useContext, useState } from "react";
import useSWR from "swr";

interface UseTaskInstanceMetaProps {
  clientRequestId: string;
}

export const useTaskInstanceMeta = ({
  clientRequestId,
}: UseTaskInstanceMetaProps) => {
  const [deploymentInfo, setDeploymentInfo] = useState<any | null>(null);
  const { data, error, mutate, isLoading, isValidating } =
    useSWR<TaskInstanceMetaType>(
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

  return {
    taskInstanceMeta: data,
    isLoading: isLoading || isValidating,
    isError: error,
    mutate,
    deploymentInfo,
    setDeploymentInfo,
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
