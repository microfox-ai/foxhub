import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { createContext, useContext } from "react";
import useSWR from "swr";

interface UseTaskInstanceMetaProps {
  clientRequestId: string;
}

export const useTaskInstanceMeta = ({
  clientRequestId,
}: UseTaskInstanceMetaProps) => {
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
  };
};

interface TaskInstanceMetaContextValue {
  taskInstanceMeta: TaskInstanceMetaType | undefined;
  isLoading: boolean;
  isError: Error | null;
  mutate: () => Promise<any>;
}

const TaskInstanceMetaContext = createContext<
  TaskInstanceMetaContextValue | undefined
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
