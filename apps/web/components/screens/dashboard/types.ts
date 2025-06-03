import { ShardPage } from "@prisma/client";
import { MinionFlowType } from "../hooks/convertors";

export interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  createNewEmptyRequest: (
    flow?: MinionFlowType,
    annotations?: Array<{ type: string; key: string; value: string }>,
    title?: string
  ) => void;
}

export interface TasksTabProps extends TabProps {
  selectedProjectClientRequests: any[];
  selectedProjectClientRequestsLoading: boolean;
  selectedProjectId?: string;
}

export interface ShardPagesTabProps extends TabProps {}
