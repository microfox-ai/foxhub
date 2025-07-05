/* eslint-disable @next/next/no-img-element */
"use client";

import { ButtonSCN } from "@/components/elements/Button";
import { Button } from "@/components/ui/button";
import { BotProject, ClientRequest } from "@prisma/client";
import {
  Bot,
  ChevronRight,
  CircleCheck,
  FileCheck,
  Flag,
  MessageSquare,
  MessagesSquare,
  PanelLeftIcon,
  Plus,
  LayoutDashboard,
  Store,
  KeyRound,
  Settings,
  ListIcon,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { ProjectDropdown } from "./ProjectDropdown";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayout } from "../providers/LayoutProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { FeatureBaseLinkAttributes } from "@/components/auth/FeatureBase";
import { IN_STAGING } from "@/utils/constants/appInfo";
import { MinionFlow } from "../hooks/convertors";

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

interface NavigationItemProps {
  icon: React.ReactNode;
  collapsedIcon?: React.ReactNode;
  label: string;
  href?: string;
  hrefCallback?: (selectedProject: any) => string;
  onClick?: () => void;
  isCollapsed: boolean;
}

interface NavigationConfig {
  icon: React.ReactNode;
  collapsedIcon?: React.ReactNode;
  label: string;
  href?: string;
  attributes?: any;
  hrefCallback?: (selectedProject: any) => string;
  requiresProject?: boolean;
  onClick?: (props: {
    isCollapsed: boolean;
    onCollapse?: (collapsed: boolean) => void;
    setIsFeedbackModalOpen: (open: boolean) => void;
  }) => void;
}

const navigationConfig: NavigationConfig[] = [
  {
    icon: <LayoutDashboard strokeWidth={2.5} className={cn("h-4 w-4")} />,
    collapsedIcon: (
      <LayoutDashboard strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
    ),
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    requiresProject: true,
    icon: <ListIcon strokeWidth={2.5} className={cn("h-4 w-4")} />,
    collapsedIcon: (
      <ListIcon strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
    ),
    label: "All Running Tasks",
    hrefCallback: (selectedProject: BotProject) => `/project/${selectedProject?.id}/tasks`,
  },
  // {
  //   icon: <Store strokeWidth={2.5} className={cn("h-4 w-4")} />,
  //   collapsedIcon: (
  //     <Store strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
  //   ),
  //   label: "Store",
  //   href: "/store",
  // },
  // {
  //   icon: <FileCheck strokeWidth={2.5} className={cn("h-4 w-4")} />,
  //   collapsedIcon: (
  //     <FileCheck strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
  //   ),
  //   label: "Whitepaper",
  //   href: "/whitepaper",
  // },
  {
    icon: <Bot strokeWidth={2.5} className={cn("h-4 w-4")} />,
    collapsedIcon: (
      <Bot strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
    ),
    label: "My Bots",
    href: "/my-bots",
    requiresProject: true,
  },
  {
    icon: <KeyRound strokeWidth={2.5} className={cn("h-4 w-4")} />,
    collapsedIcon: (
      <KeyRound strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
    ),
    label: "My Data",
    href: "/my-data",
    requiresProject: true,
  },
  {
    requiresProject: true,
    icon: <Settings strokeWidth={2.5} className={cn("h-4 w-4")} />,
    collapsedIcon: (
      <Settings strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
    ),
    label: "Settings",
    hrefCallback: (selectedProject: BotProject) => `/project/${selectedProject?.id}/settings`,
  },
  {
    requiresProject: true,
    icon: <Flag strokeWidth={2.5} className={cn("h-4 w-4")} />,
    collapsedIcon: (
      <Flag strokeWidth={2.5} className={cn("h-[18px] w-[18px]")} />
    ),
    label: "Beta-Feedback",
    href: "/feedback",
    //attributes: FeatureBaseLinkAttributes,
    //onClick: ({ setIsFeedbackModalOpen }) => setIsFeedbackModalOpen(true),
  },
  {
    requiresProject: true,
    icon: (
      <MessagesSquare
        strokeWidth={2.2}
        className={cn("h-[1.1rem] w-[1.1rem]")}
      />
    ),
    collapsedIcon: (
      <MessageSquare strokeWidth={2.2} className={cn("h-[20px] w-[20px]")} />
    ),
    label: "Chat",
    onClick: ({ isCollapsed, onCollapse }) => {
      if (isCollapsed) {
        onCollapse?.(false);
      }
    },
  },
];

export default function Sidebar({
  isCollapsed = false,
  onCollapse,
}: SidebarProps) {
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const requestParamId = params?.request_id;
  const { setIsFeedbackModalOpen } = useLayout();
  const { selectedProject, selectedProjectClientRequests,
    createNewEmptyRequest } = useClientProject();

  return (
    <div
      className={`h-full flex-1 overflow-y-auto overflow-x-hidden bg-neutral-50 transition-all duration-300`}
    >
      <TooltipProvider>
        <div
          className={`flex h-screen flex-col ${isCollapsed ? "px-2" : "px-4"}`}
        >
          <SidebarHeader isCollapsed={isCollapsed} onCollapse={onCollapse} />

          <div className="flex-1">

            {selectedProject && (
              <NewRequestButton
                isCollapsed={isCollapsed}
                onNewRequest={() => createNewEmptyRequest(MinionFlow.ChatFlow)}
                selectedProject={selectedProject}
                text="New Chat"
              />
            )}

            <ul
              className={`${isCollapsed ? "flex flex-col items-center gap-2" : "flex flex-col"}`}
            >
              {navigationConfig
                .filter((item) =>
                  item.requiresProject
                    ? selectedProject != null
                    : !isCollapsed
                      ? item.label !== "Chat"
                      : true
                )
                .map((item, index) => (
                  <NavigationItem
                    key={item.label}
                    icon={item.icon}
                    collapsedIcon={item.collapsedIcon}
                    label={item.label}
                    href={item.href}
                    hrefCallback={item.hrefCallback}
                    onClick={
                      item.onClick
                        ? () =>
                          item.onClick?.({
                            isCollapsed,
                            onCollapse,
                            setIsFeedbackModalOpen,
                          })
                        : undefined
                    }
                    isCollapsed={isCollapsed}
                    {...item.attributes}
                  />
                ))}
            </ul>

            {selectedProject && (
              <RequestsList
                selectedProject={selectedProject}
                clientRequests={selectedProjectClientRequests}
                requestParamId={requestParamId}
                isCollapsed={isCollapsed}
              />
            )}
          </div>

          <div className="space-y-4 mb-6">
            <ProjectDropdown className="w-full" isCollapsed={isCollapsed} />
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

const NavigationItem = ({
  icon,
  collapsedIcon,
  label,
  href,
  hrefCallback,
  onClick,
  isCollapsed,
}: NavigationItemProps) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;
  const { selectedProject } = useClientProject();

  const content = (
    <div className="flex items-center justify-between">
      <div
        className={`flex items-center gap-2 ${isActive ? "text-black" : "text-neutral-500"} group-hover:text-black transition-all duration-200`}
      >
        {!isCollapsed ? (
          icon
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{collapsedIcon || icon}</TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-white !text-black border border-gray-300 text-xs rounded-full"
              sideOffset={10}
              showArrow={false}
            >
              {label}
            </TooltipContent>
          </Tooltip>
        )}
        {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
      </div>
    </div>
  );

  return (
    <li
      className={`${isActive ? "bg-gray-200" : "hover:bg-gray-100"} rounded-lg cursor-pointer ${isCollapsed ? "p-2 w-full flex justify-center" : "p-2 px-3"} group`}
    >
      {href ? (
        <Link href={href} className="flex items-center justify-between">
          {content}
        </Link>
      ) : hrefCallback ? (
        <Link href={hrefCallback(selectedProject)} className="flex items-center justify-between">
          {content}
        </Link>
      ) : (
        <div onClick={onClick}>{content}</div>
      )}
    </li>
  );
};

const SidebarHeader = ({
  isCollapsed,
  onCollapse,
}: {
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}) => (
  <div className="flex items-center justify-between mb-4">
    <div
      onClick={() => onCollapse?.(!isCollapsed)}
      className={`flex mt-4 cursor-pointer items-center ${isCollapsed ? "justify-center" : "gap-2"} text-2xl`}
    >
      <img
        src="/logo-mini-color.png"
        alt=""
        width={32}
        height={32}
        className={`rounded-md w-10 min-w-10 h-10 min-h-10 ${isCollapsed && "ml-1"}`}
      />
      {!isCollapsed && (
        <div className="flex items-center gap-2">
          <h1 className="font-medium text-xl text-gray-800">Microfox</h1>
          <p className="text-xs font-medium text-gray-500 mt-1">v1.0.1</p>
        </div>
      )}
    </div>
    {!isCollapsed && (
      <Button
        variant="ghost"
        size="icon"
        onClick={(e: any) => {
          e.stopPropagation();
          onCollapse?.(!isCollapsed);
        }}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{ padding: "0.25rem" }}
        className="opacity-50 hover:opacity-100 -mb-5"
      >
        <PanelLeftIcon className="h-4" />
      </Button>
    )}
  </div>
);

const RequestsList = ({
  selectedProject,
  clientRequests,
  requestParamId,
  isCollapsed,
}: {
  selectedProject: BotProject;
  clientRequests: ClientRequest[];
  requestParamId?: string;
  isCollapsed: boolean;
}) => {
  if (isCollapsed) return null;

  return (
    <div className="my-4 mx-1 space-y-1">
      <div className="text-xs font-medium mb-2 px-2 text-gray-500">Tasks</div>
      {clientRequests?.length > 0 ? (
        clientRequests?.map(
          (request: ClientRequest) => (
            <Link
              key={request?.id}
              href={`/project/${selectedProject?.id}/request/${request?.id}`}
              className={`flex cursor-pointer w-full line-clamp-1 items-center rounded-sm px-2 py-2 text-sm ${request?.id === requestParamId
                ? "bg-gray-200 text-black"
                : "hover:bg-gray-100"
                }`}
            >
              {request.id === requestParamId ? (
                <ChevronRight
                  style={{
                    marginRight: "0.5rem",
                    height: "1rem",
                    width: "1rem",
                  }}
                />
              ) : (
                <MessageSquare
                  style={{
                    marginRight: "0.5rem",
                    height: "1rem",
                    width: "1rem",
                    color: "#4c4c4c",
                  }}
                />
              )}
              <span
                className={`flex-1 truncate text-left ${request.id === requestParamId ? "font-semibold" : ""}`}
              >
                {request.title}
              </span>
            </Link>
          )
        )
      ) : (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          No requests
        </div>
      )}
    </div>
  );
};

const NewRequestButton = ({
  isCollapsed,
  onNewRequest,
  selectedProject,
  text,
}: {
  isCollapsed: boolean;
  onNewRequest: (project: BotProject) => void;
  selectedProject: BotProject;
  text: string;
}) => {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={(e: any) => {
              e.stopPropagation();
              onNewRequest(selectedProject);
            }}
            className={cn(
              "cursor-pointer w-fit mx-auto my-4 rounded-full shadow-sm p-2 border border-gray-300 flex items-center justify-center",
              isCollapsed && "my-5"
            )}
          >
            <Plus className="h-5 w-5" />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-white !text-black border border-gray-300 text-xs rounded-full"
          sideOffset={10}
          showArrow={false}
        >
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <ButtonSCN
      variant="outline"
      onClick={(e: any) => {
        e.stopPropagation();
        onNewRequest(selectedProject);
      }}
      className="w-full my-4 rounded-full shadow-md overflow-hidden bg-black text-white hover:bg-black/80 hover:text-white"
      style={{ padding: "0.25rem", marginRight: "0.25rem" }}
    >
      {text}
    </ButtonSCN>
  );
};
