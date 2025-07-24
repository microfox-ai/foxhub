import { ClientRequest } from "@prisma/client";
import { UIMessage } from "ai";
import {
  MessageSquare,
  History,
  Settings,
  LogOut,
  LayoutDashboard,
  Code,
  RocketIcon,
  ChevronDown,
} from "lucide-react";
import { useMicrofoxChat } from "./MicrofoxChatProvider";
import { IN_DEV } from "@/utils/constants/appInfo";
import { TabsTrigger } from "@/components/ui/tabs";
import { TabsList } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import LogoutConfirmationDialog from "@/components/auth/LogoutConfirmationDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import LogoutElement from "@/components/auth/LogoutElement";
import { ButtonSCN } from "@/components/elements/Button";
import DeployTrigger from "./DeployTrigger";
import { useClientProject } from "../providers/ClientProjectProvider";
import { MinionFlow } from "../hooks/convertors";

interface IChatHeaderProps {
  clientRequest?: ClientRequest;
  isLoading: boolean;
  isValidating: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projectTitle?: string;
  messages: UIMessage[];
  isChatLoading: boolean;
}

const tabList = [
  {
    label: "Chat",
    value: "chat",
    icon: <MessageSquare />,
    flows: [MinionFlow.ChatFlow, MinionFlow.BuildFlow],
  },
  {
    label: "Dashboard ",
    value: "dashboard",
    icon: <LayoutDashboard />,
    flows: [MinionFlow.BuildFlow],
  },
  {
    label: "Code",
    value: "code",
    icon: <Code />,
    flows: [MinionFlow.BuildFlow],
  },
  {
    label: "History",
    value: "history",
    icon: <History />,
    flows: [MinionFlow.BuildFlow],
  },
  {
    label: "Publish",
    value: "publish",
    icon: <RocketIcon />,
    flows: [MinionFlow.BuildFlow],
  },
];

const ChatHeader = ({
  messages,
  clientRequest,
  isChatLoading,
  activeTab,
  projectTitle,
}: IChatHeaderProps) => {
  const { lastKnownMinionType, lastKnownMinionFlow } = useMicrofoxChat();
  const { selectedRequest } = useClientProject();
  const currentFlow = selectedRequest?.minionFlow ?? MinionFlow.BuildFlow;
  const flowTabs = tabList.filter((tab) => tab.flows.includes(currentFlow));

  return (
    <div className="grid grid-cols-12 w-full items-start justify-between gap-2 px-4 pt-4 ml-4">
      <div className="col-span-4">
        {isChatLoading ? (
          <Skeleton className="w-full h-6" />
        ) : (
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink className="hover:text-gray-500">
                  {projectTitle}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="truncate">
                <BreadcrumbPage className="truncate">
                  {clientRequest?.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
        {/* {IN_DEV && (
          <>
            <p className="text-xs text-gray-500">
              Request ID: {clientRequest?.id}
            </p>
            <p className="text-xs text-gray-500">
              Minion: {lastKnownMinionType}; Flow: {lastKnownMinionFlow} Status:{" "}
              {clientRequest?.archiveStatus} Region: {clientRequest?.awsRegion}
            </p>
          </>
        )} */}
      </div>

      <div className="col-span-4 flex justify-start ">
        {messages.length > 0 && flowTabs.length > 1 && (
          <TabsList className="relative  flex bg-gray-100 p-[3px] h-11 rounded-lg">
            {flowTabs.map((tab) => (
              <TabsTrigger
                key={`tab-${tab.value}`}
                value={tab.value}
                className="relative duration-300 !shadow-none h-9 data-[state=active]:bg-transparent data-[state=active]:shadow-none z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg transition-all"
              >
                <motion.div
                  animate={{
                    x: activeTab === tab.value ? -4 : 0,
                  }}
                  className="flex items-center gap-2"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {tab.icon}
                  {activeTab === tab.value && (
                    <motion.span
                      key={`label-${tab.value}`}
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </motion.div>
                {activeTab === tab.value && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -z-[1] inset-0 bg-white rounded-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            ))}
            {currentFlow === MinionFlow.BuildFlow && <DeployTrigger />}
          </TabsList>
        )}
      </div>
      <div className="col-span-4 flex justify-end">
        <LogoutElement />
      </div>
    </div>
  );
};

export default ChatHeader;
