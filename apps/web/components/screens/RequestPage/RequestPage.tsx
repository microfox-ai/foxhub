"use client";
import { Button } from "@/components/ui/button";
import { CommandEmpty } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prettySinceTime } from "@/utils/helpers/prettyprint";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { BotProject, ClientRequest, REQUESTSTATUS } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";
import Sidebar from "../global/Sidebar";
import { toast } from "sonner";
import ChatWindow from "../Chat/ChatWindow";
import PreviewWindow from "../PreviewWindow/PreviewWindow";
import NewRequestCreation from "./NewRequestCreation";
import { FileUploadProvider } from "../providers/FileUploadProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
    async (url) => await fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
      const request = project?.clientRequests.find(
        (r: any) => r.id === requestParamId
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
      <FileUploadProvider>
        <div className="relative  w-full ">
          <SidebarProvider className="!bg-white">
            {/* <div className="col-span-1"> */}
            <Sidebar
              selectedProject={selectedProject}
              onSelectRequest={(request) => {
                setSelectedRequest(request);
                router.push(
                  `/project/${selectedProject?.id}/request/${request?.id}`
                );
              }}
              onNewRequest={(project) => {
                const openRequests = project?.clientRequests?.filter(
                  (request) =>
                    request?.requestStatus !== REQUESTSTATUS.COMPLETED &&
                    request?.requestStatus !== REQUESTSTATUS.CLOSED
                );
                if (openRequests?.length < 3) {
                  setOpenNewRequestDialog(true);
                } else {
                  toast.warning(
                    "At the moment we only support 3 concurrent requests. You can create new requests once your open requests are resolved."
                  );
                }
              }}
              onOpenConfig={(project: any) => {
                //setSelectedProject(project);
                // updateSearchParams({ project: project?.id, view: 'project' });
                // setIsConfigModalOpen(true);
              }}
            />
            <SidebarInset className="flex flex-row !mt-16 pt-4 !shadow-none">
              {/* </div> */}
              {/* <div className="col-span-3 h-full p-4"> */}
              <ChatWindow userId={user.id} clientRequest={selectedRequest} />
              {/* </div> */}
              {/* <div className="col-span-2"> */}
              {/* <PreviewWindow /> */}
              {/* </div> */}
            </SidebarInset>
          </SidebarProvider>
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
                  `/project/${selectedProject.id}/request/${newRequest.id}`
                );
              }}
            />
          </DialogContent>
        </Dialog>
      </FileUploadProvider>
    </ClientSecretProvider>
  );
};
