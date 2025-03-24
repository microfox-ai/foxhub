"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { REQUESTSTATUS } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import ChatWindow from "../Chat/ChatWindow";
import Sidebar from "../global/Sidebar";
import PreviewWindow from "../PreviewWindow/PreviewWindow";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";
import NewRequestCreation from "./NewRequestCreation";

export const RequestPage = () => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const { user } = useUser();
  const router = useRouter();

  const [tab, setTab] = useState("requests");
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    `/api/bot-project?userId=${user?.id}`,
    async (url) => await fetch(url).then((res) => res.json()),
  );

  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
      const request = project?.clientRequests.find(
        (r: any) => r.id === requestParamId,
      );
      setSelectedRequest(request);
    }
  }, [projectParamId, requestParamId, projects]);

  const [openNewRequestDialog, setOpenNewRequestDialog] = useState(false);

  if (!user || !selectedProject || !selectedRequest || isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8">
        <Skeleton
          variant="rectangular"
          className="w-[200px] rounded-full"
          height={20}
        />
      </div>
    );
  }

  return (
    <ClientSecretProvider botProjectId={selectedProject?.id} userId={user?.id}>
      <div className="relative grid h-[90vh] w-full grid-cols-6">
        <div className="col-span-1">
          <Sidebar
            selectedProject={selectedProject}
            onSelectRequest={(request) => {
              setSelectedRequest(request);
              router.push(
                `/project/${selectedProject?.id}/request/${request?.id}`,
              );
            }}
            onNewRequest={(project) => {
              const openRequests = project?.clientRequests?.filter(
                (request) =>
                  request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
                  request?.requestStatus !== REQUESTSTATUS.CLOSED,
              );
              if (openRequests?.length < 3) {
                setOpenNewRequestDialog(true);
              } else {
                toast.warning(
                  "At the moment we only support 3 concurrent requests. You can create new requests once your open requests are resolved.",
                );
              }
            }}
            onOpenConfig={(project: any) => {
              //setSelectedProject(project);
              // updateSearchParams({ project: project?.id, view: 'project' });
              // setIsConfigModalOpen(true);
            }}
          />
        </div>
        <div className="col-span-3 h-full p-4">
          <ChatWindow userId={user.id} clientRequest={selectedRequest} />
        </div>
        <div className="col-span-2">
          <PreviewWindow />
        </div>
      </div>
      <Dialog
        onOpenChange={setOpenNewRequestDialog}
        open={openNewRequestDialog}
      >
        <DialogContent>
          <NewRequestCreation
            userId={user.id}
            project={selectedProject}
            onRequestCreated={(newRequest) => {
              router.push(
                `/project/${selectedProject.id}/request/${newRequest.id}`,
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </ClientSecretProvider>
  );
};
