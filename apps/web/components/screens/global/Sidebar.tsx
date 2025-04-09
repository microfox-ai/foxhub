/* eslint-disable @next/next/no-img-element */
"use client";

import { ButtonSCN } from "@/components/elements/Button";
import { Button } from "@/components/ui/button";
import { BotProject, ClientRequest } from "@prisma/client";
import {
  Book,
  ChevronRight,
  CircleCheck,
  FileCheck,
  Flag,
  LogOut,
  MessageSquare,
  MessagesSquare,
  PanelLeftIcon,
  PanelRightIcon,
  Plus,
  PlusCircle,
  Settings,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ProjectDropdown } from "./ProjectDropdown";
import { useUser } from "@/utils/hooks/useUser";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayout } from "../providers/LayoutProvider";

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}

export default function Sidebar({
  selectedProject,
  onSelectRequest,
  onNewRequest,
  onOpenConfig,
  isCollapsed,
  onCollapse,
}: {
  selectedProject: BotProjectWithRequests;
  onSelectRequest: (request: ClientRequest) => void;
  onNewRequest: (project: BotProjectWithRequests) => void;
  onOpenConfig: (project: BotProject) => void;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}) {
  const router = useRouter();
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;
  const searchParams: any = useSearchParams();
  const { setIsFeedbackModalOpen } = useLayout();

  // const { user, handleLogout } = useUser();

  return (
    <div
      className={`h-full flex-1 overflow-y-auto overflow-x-hidden bg-neutral-50 transition-all duration-300`}
    >
      <TooltipProvider>
        <div
          className={`flex h-screen flex-col ${isCollapsed ? "px-2" : "px-4"}`}
        >
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                if (isCollapsed) {
                  onCollapse?.(false);
                } else {
                  router.push("/");
                }
              }}
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
                  <h1 className="font-medium text-xl text-gray-800">
                    Microfox
                  </h1>
                  <p className="text-xs font-medium text-gray-500 mt-1">
                    v1.0.1
                  </p>
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

          <div className="flex-1">
            {isCollapsed ? (
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
                  <p>New Request</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <ButtonSCN
                variant="outline"
                onClick={(e: any) => {
                  e.stopPropagation();
                  onNewRequest(selectedProject);
                }}
                className="w-full my-4 rounded-full shadow-md overflow-hidden"
                style={{ padding: "0.25rem", marginRight: "0.25rem" }}
              >
                New Request
              </ButtonSCN>
            )}

            <ul
              className={`${isCollapsed ? "flex flex-col items-center gap-2" : "flex flex-col"}`}
            >
              {/* Chat */}

              <li
                className={`hover:bg-gray-100 rounded-lg cursor-pointer ${isCollapsed ? "p-2 w-full flex justify-center" : "p-2 px-3"} group`}
                onClick={() => {
                  if (isCollapsed) {
                    onCollapse?.(false);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-500 group-hover:text-black transition-all duration-200">
                    {!isCollapsed ? (
                      <MessagesSquare
                        strokeWidth={2.2}
                        className={cn("h-[1.1rem] w-[1.1rem]")}
                      />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MessageSquare
                            strokeWidth={2.2}
                            className={cn("h-[20px] w-[20px]")}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-white !text-black border border-gray-300 text-xs rounded-full"
                          sideOffset={10}
                          showArrow={false}
                        >
                          Chat
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!isCollapsed && (
                      <span className="text-sm font-medium">Chat</span>
                    )}
                  </div>
                </div>
              </li>

              {/* Whitepaper */}
              <li
                className={`hover:bg-gray-100 rounded-lg cursor-pointer ${isCollapsed ? "p-2 w-full flex justify-center" : "p-2 px-3"} group`}
              >
                <Link
                  href="/whitepaper"
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-neutral-500 group-hover:text-black transition-all duration-200">
                    {!isCollapsed ? (
                      <FileCheck strokeWidth={2.5} className={cn("h-4 w-4")} />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FileCheck
                            strokeWidth={2.5}
                            className={cn("h-[18px] w-[18px]")}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-white !text-black border border-gray-300 text-xs rounded-full"
                          sideOffset={10}
                          showArrow={false}
                        >
                          Whitepaper
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!isCollapsed && (
                      <span className="text-sm font-medium">Whitepaper</span>
                    )}
                  </div>
                </Link>
              </li>

              <li
                className={`hover:bg-gray-100 rounded-lg cursor-pointer ${isCollapsed ? "p-2 w-full flex justify-center" : "p-2 px-3"} group`}
              >
                <Link
                  href="/status"
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-neutral-500 group-hover:text-black transition-all duration-200">
                    {!isCollapsed ? (
                      <CircleCheck
                        strokeWidth={2.5}
                        className={cn("h-4 w-4")}
                      />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CircleCheck
                            strokeWidth={2.5}
                            className={cn("h-[18px] w-[18px]")}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-white !text-black border border-gray-300 text-xs rounded-full"
                          sideOffset={10}
                          showArrow={false}
                        >
                          Status
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!isCollapsed && (
                      <span className="text-sm font-medium">Status</span>
                    )}
                  </div>
                </Link>
              </li>

              {/* Settings  */}
              {/* <li className="hover:bg-gray-100 rounded-lg p-2 px-3 group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-500 group-hover:text-black transition-all duration-200">
                  <Settings className="h-4" />
                  <span className="text-sm font-medium ">Settings</span>
                </div>
              </div>
            </li> */}

              {/* Feedback   */}
              <li
                className={`hover:bg-gray-100 rounded-lg cursor-pointer ${isCollapsed ? "p-2 w-full flex justify-center" : "p-2 px-3"} group`}
                onClick={() => {
                  setIsFeedbackModalOpen(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-500 group-hover:text-black transition-all duration-200">
                    {!isCollapsed ? (
                      <Flag strokeWidth={2.5} className={cn("h-4 w-4")} />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Flag
                            strokeWidth={2.5}
                            className={cn("h-[18px] w-[18px]")}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-white !text-black border border-gray-300 text-xs rounded-full"
                          sideOffset={10}
                          showArrow={false}
                        >
                          Feedback
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!isCollapsed && (
                      <span className="text-sm font-medium">Feedback</span>
                    )}
                  </div>
                </div>
              </li>
            </ul>

            {!isCollapsed && (
              <div className="my-4 mx-1 space-y-1">
                <div className="text-xs font-medium mb-2 px-2 text-gray-500">
                  Requests
                </div>
                {selectedProject?.clientRequests?.length > 0 ? (
                  selectedProject?.clientRequests?.map(
                    (request: ClientRequest) => (
                      <Link
                        key={request?.id}
                        href={`/project/${selectedProject?.id}/request/${request?.id}`}
                        className={`flex cursor-pointer w-full line-clamp-1 items-center rounded-sm px-2 py-2 text-sm ${request?.id === requestParamId ? "bg-gray-200 text-black" : "hover:bg-gray-100"}`}
                        // onClick={() => onSelectRequest(request)}
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
                          className={`flex-1 truncate text-left ${
                            request.id === requestParamId ? "font-semibold" : ""
                          }`}
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
            )}
          </div>

          <div className="space-y-4 mb-6">
            <ProjectDropdown className="w-full" isCollapsed={isCollapsed} />
            {/* Logout button */}

            {/* <Separator />
          <div className="flex items-center justify-center w-full ">
            <div className="flex items-center gap-2 w-full">
              <img
                src={user?.avatar || ""}
                alt="user avatar"
                className="w-8 h-8 rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs font-medium max-w-[120px] truncate text-gray-500">
                  {user?.email}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut />
            </Button>
          </div> */}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
