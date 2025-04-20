import { ClientRequest } from "@prisma/client";
import { UIMessage } from "ai";
import {
  MessageSquare,
  History,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useMicrofox } from "../providers/MicrofoxProvider";
import { IN_DEV } from "@/utils/constants/appInfo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
interface IChatHeaderProps {
  clientRequest?: ClientRequest;
  mutate: () => void;
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
  },
  {
    label: "History",
    value: "history",
    icon: <History />,
  },
  {
    label: "Dashboard ",
    value: "dashboard",
    icon: <LayoutDashboard />,
  },
];
const ChatHeader = ({
  messages,
  clientRequest,
  isChatLoading,
  activeTab,
  projectTitle,
}: IChatHeaderProps) => {
  const { minionType } = useMicrofox();
  const { user, handleLogout, logoutStatus } = useAuth();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await handleLogout();
      setShowLogoutDialog(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="grid grid-cols-12 w-full items-start justify-between gap-2 px-4 pt-6 py-2">
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
        {IN_DEV && (
          <>
            <p className="text-xs text-gray-500">
              Request ID: {clientRequest?.id}
            </p>
            <p className="text-xs text-gray-500">Minion: {minionType}</p>
          </>
        )}
      </div>

      <div className="col-span-4 flex justify-center">
        {messages.length > 0 && (
          <TabsList className="relative flex bg-gray-100 p-[3px] h-11 rounded-lg">
            {tabList.map((tab) => (
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
          </TabsList>
        )}
      </div>

      <div className="col-span-4 flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex cursor-pointer items-center gap-2">
              {/*  eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.avatar || "/images/default-avatar.png"}
                alt=""
                width={40}
                height={40}
                className="rounded-full hover:ring-2 hover:ring-gray-200 transition-all"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className=" p-2" align="end">
            <div className="flex items-center gap-2 p-2">
              {/*  eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.avatar || "/images/default-avatar.png"}
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
            </div>
            <Separator className="my-1" />
            <div className="px-1 py-2 flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sm border-none focus:!ring-0"
                onClick={() => {
                  // TODO: Implement settings
                }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogoutClick}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <LogoutConfirmationDialog
        loggingOut={logoutStatus.isLoggingOut}
        showLogoutDialog={showLogoutDialog}
        setShowLogoutDialog={setShowLogoutDialog}
        handleConfirmLogout={handleConfirmLogout}
      />
      {/* <ButtonSCN
        variant="outline"
        size="sm"
        onClick={() => mutate()}
        disabled={isLoading}
      >
        <RefreshCw
          className={`my-auto h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
        />
      </ButtonSCN> */}
    </div>
  );

  {
    /* Button to open Add ClientSecret modal manually (if not using slash) */
  }
  {
    /* <div className="border-b px-4 py-2">
    <ButtonSCN onClick={() => setShowAddBotModal(true)}>
      + Add New ClientSecret
    </ButtonSCN>
  </div> */
  }
};

export default ChatHeader;
