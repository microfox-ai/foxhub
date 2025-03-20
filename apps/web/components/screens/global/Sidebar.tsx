"use client";

import { ButtonSCN } from "@/components/elements/Button";
import { BotProject, ClientRequest } from "@prisma/client";
import {
  ChevronRight,
  MessageSquare,
  PlusCircle,
  Settings,
  Menu,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  useSidebar,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}

export default function Sidebar({
  selectedProject,
  onSelectRequest,
  onNewRequest,
  onOpenConfig,
}: {
  selectedProject: BotProjectWithRequests;
  onSelectRequest: (request: ClientRequest) => void;
  onNewRequest: (project: BotProjectWithRequests) => void;
  onOpenConfig: (project: BotProject) => void;
}) {
  const router = useRouter();
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;
  const searchParams: any = useSearchParams();
  const { state, toggleSidebar } = useSidebar();

  return (
    <>
      <SidebarPrimitive
        variant="inset"
        collapsible="icon"
        className="border-r !mt-15 !bg-white"
      >
        <SidebarContent className="!bg-white">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="truncate font-medium">
                    {selectedProject.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ButtonSCN
                    variant="ghost"
                    size="icon"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      onNewRequest(selectedProject);
                    }}
                    title="New Request"
                    style={{ padding: "0.25rem", marginRight: "0.25rem" }}
                  >
                    <PlusCircle style={{ height: "1rem", width: "1rem" }} />
                  </ButtonSCN>
                  <ButtonSCN
                    variant="ghost"
                    size="icon"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      onOpenConfig(selectedProject);
                    }}
                    title="Project Configurations"
                    style={{ padding: "0.25rem" }}
                  >
                    <Settings style={{ height: "1rem", width: "1rem" }} />
                  </ButtonSCN>

                  {state === "expanded" && (
                    <SidebarTrigger>
                      <Menu style={{ height: "1rem", width: "1rem" }} />
                    </SidebarTrigger>
                  )}
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {selectedProject?.clientRequests?.length > 0 ? (
                  selectedProject?.clientRequests?.map(
                    (request: ClientRequest) => (
                      <button
                        key={request?.id}
                        className={`flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                          request?.id === requestParamId
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => onSelectRequest(request)}
                      >
                        {request.id === requestParamId ? (
                          <ChevronRight className="mr-2 h-4 w-4" />
                        ) : (
                          <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={`truncate ${
                            request.id === requestParamId ? "font-medium" : ""
                          }`}
                        >
                          {request.title}
                        </span>
                      </button>
                    )
                  )
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No requests
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SidebarContent>
      </SidebarPrimitive>
    </>
  );
}
