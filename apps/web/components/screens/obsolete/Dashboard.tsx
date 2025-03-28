"use client";

import { ButtonSCN } from "@/components/elements/Button";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { REQUESTSTATUS } from "@prisma/client";
import { PanelRight, PanelRightClose, PlusCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import ChatWindow from "../Chat/ChatWindow";
import NewRequestCreation from "./NewRequestCreation";
import NewProjectCreation from "../global/NewProjectCreation";
import ProjectConfigModal from "../global/ProjectConfigModal";
import Sidebar from "../global/Sidebar";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";

/** DEPRECATED - copied all functionality except config modal */
export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams: any = useSearchParams();
  const requestParam = searchParams.get("request");
  const projectParam = searchParams.get("project");
  const viewParam = searchParams.get("view"); // expected values: "request", "newRequest", "newProject", "project"
  const showPreviewParam = searchParams.get("showPreview") === "true";

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Helper function to update search params using URLSearchParams API.
  const updateSearchParams = (params: Record<string, string | null>) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });
    router.replace(`?${currentParams.toString()}`);
  };

  // SWR to fetch the latest updated request if none is specified.
  const { data: latestRequest } = useSWR(
    user && !requestParam
      ? `/api/client-requests/latest-request?userId=${user.id}`
      : null,
    async (url) => {
      const res = await fetch(url, {});
      if (!res.ok) throw new Error("Failed to fetch latest request");
      return res.json();
    }
  );

  useEffect(() => {
    if (requestParam && requestParam !== "new") {
      (async () => {
        try {
          const res = await fetch(`/api/client-requests/${requestParam}`, {});
          const data = await res.json();
          setSelectedRequest(data);
        } catch (err) {
          toast.error("Failed to load selected request.");
          console.error(err);
        }
      })();
    } else if (requestParam === "new") {
      setSelectedRequest(null);
    } else if (!requestParam && latestRequest) {
      setSelectedRequest(latestRequest);
      updateSearchParams({
        request: latestRequest.id,
        view: "request",
        project: latestRequest.botProjectId,
      });
    }
  }, [requestParam, latestRequest]);

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    user?.id ? `/api/bot-project?userId=${user?.id}` : null,
    async (url) => await fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (projectParam) {
      const project = projects?.find((p: any) => p.id === projectParam);
      setSelectedProject(project);
    }
  }, [projectParam, projects]);

  if (error) {
    toast.error("Failed to load projects.");
    console.error(error);
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <ClientSecretProvider botProjectId={selectedProject?.id} userId={user?.id}>
      <div className="flex h-full bg-background">
        {showPreviewParam && (
          <div className="fixed right-10 top-10">
            <ButtonSCN
              onClick={() =>
                updateSearchParams({ showPreview: `${!showPreviewParam}` })
              }
            >
              {showPreviewParam ? <PanelRightClose /> : <PanelRight />}
            </ButtonSCN>
          </div>
        )}
        {/* Sidebar with increased width */}
        <div
          className={`flex ${showPreviewParam ? "w-[15vw]" : "w-80"} flex-col border-r border-border`}
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Bot Projects</h2>
            <div className="flex gap-2">
              <ButtonSCN
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateSearchParams({
                    project: "new",
                    view: "newProject",
                    request: "null",
                  })
                }
                title="New Project"
              >
                <PlusCircle style={{ height: "1.25rem", width: "1.25rem" }} />
              </ButtonSCN>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <Sidebar
              selectedProject={selectedProject}
              onSelectRequest={(request) => {
                setSelectedRequest(request);
                updateSearchParams({
                  request: request.id,
                  view: "request",
                  project: request.botProjectId,
                });
              }}
              onNewRequest={(project) => {
                setSelectedProject(project);
                const openRequests = project?.clientRequests?.filter(
                  (request) =>
                    request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
                    request?.requestStatus !== REQUESTSTATUS.CLOSED
                );
                if (openRequests?.length < 3) {
                  updateSearchParams({
                    request: "new",
                    view: "newRequest",
                    project: project?.id,
                  });
                } else {
                  toast.warning(
                    "At the moment we only support 3 concurrent requests. You can create new requests once your open requests are resolved."
                  );
                }
              }}
              onOpenConfig={(project) => {
                setSelectedProject(project);
                updateSearchParams({ project: project?.id, view: "project" });
                setIsConfigModalOpen(true);
              }}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {viewParam === "newRequest" ? (
            <NewRequestCreation
              userId={user.id}
              project={selectedProject}
              onRequestCreated={(newRequest) => {
                setSelectedRequest(newRequest);
                updateSearchParams({ request: newRequest.id, view: "request" });
              }}
            />
          ) : viewParam === "newProject" ? (
            <NewProjectCreation
              userId={user.id}
              onProjectCreated={(newProject) => {
                setSelectedProject(newProject);
                updateSearchParams({
                  project: newProject?.id,
                  view: "newRequest",
                  request: "new",
                });
              }}
            />
          ) : selectedRequest ? (
            <ChatWindow userId={user.id} clientRequest={selectedRequest} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>
                {latestRequest
                  ? "Loading latest request..."
                  : "No requests available. Create a new request or project."}
              </p>
            </div>
          )}
        </div>
        {showPreviewParam && (
          <div className="h-screen w-[50vw] overflow-y-auto border-l border-border p-4">
            {JSON.stringify(selectedProject)}
          </div>
        )}

        <ProjectConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          projectId={selectedProject?.id || ""}
        />
      </div>
    </ClientSecretProvider>
  );
}
