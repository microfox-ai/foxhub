"use client";
import { Button } from "@/components/ui/button";
import { CommandEmpty } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prettySinceTime } from "@/utils/helpers/prettyprint";
import { useUser } from "@/utils/hooks/useUser";
import { Skeleton } from "@mui/material";
import { BotProject, ClientRequest } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { CirclePlusIcon } from "lucide-react";
import { createEmptyClientRequest } from "@/utils/services/db_functions/createEmptyClientRequest";
import { analytics } from "@/utils/services/analytics/client";

export const ProjectPage = () => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const { user } = useUser();
  const router = useRouter();

  const [tab, setTab] = useState("requests");
  const params = useParams<{
    project_id?: string;
  }>();
  const projectParamId = params?.project_id;

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    user?.id ? `/api/bot-project?userId=${user?.id}` : null,
    async (url) => await fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (projectParamId) {
      const project = projects?.find((p: any) => p.id === projectParamId);
      setSelectedProject(project);
    }
  }, [projectParamId, projects]);

  if (isLoading || !projects || !user) {
    return (
      <div className="flex flex-col h-screen justify-center items-center p-8">
        <Skeleton
          variant="rectangular"
          className="w-[200px] rounded-full"
          height={20}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-8 w-full justify-center items-center mt-14">
      <div className="container w-[600px]">
        <Tabs defaultValue="requests" className="w-full">
          <div className="col-span-2 flex jsutify-between items-end w-full pb-4">
            {selectedProject ? (
              <div>
                <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
                <p className="text-xs">
                  {(selectedProject as BotProject).githubRepoName}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96"></div>
            )}
            <TabsList className="ml-auto">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="bots">Bots</TabsTrigger>
            </TabsList>
            <Button
              onClick={async () => {
                const newRequest = await createEmptyClientRequest({
                  userId: user.id,
                  botProjectId: selectedProject.id,
                });
                // track client request creation
                analytics.track("Client Request Created From Project Page", {
                  userId: user.id,
                  requestId: newRequest.id,
                  botProjectId: selectedProject.id,
                  title: newRequest.title,
                  timestamp: new Date().toISOString(),
                });
                setSelectedProject((prev: any) => ({
                  ...prev,
                  clientRequests: [...prev.clientRequests, newRequest],
                }));
              }}
              className="flex items-center gap-2 text-sm p-2"
            >
              <CirclePlusIcon size={24} />
              New Request
            </Button>
          </div>
          <TabsContent value="requests">
            <div className="flex flex-col p-2 gap-2 bg-neutral-50  rounded-xl min-h-[70vh] shadow-md">
              {(selectedProject?.clientRequests as ClientRequest[])?.map(
                (request) => (
                  <div
                    key={request.id}
                    onClick={() => {
                      router.push(
                        `/project/${selectedProject.id}/request/${request.id}`
                      );
                    }}
                    className="flex hover:shadow-md items-center cursor-pointer hover:bg-white rounded-xl p-4"
                  >
                    <div>
                      <h4 className="text-md font-bold text-neutral-700">
                        {request.title}
                      </h4>
                      <p className="text-xs text-neutral-400">
                        {request.requestDir}
                      </p>
                    </div>
                  </div>
                )
              )}
              {selectedProject?.clientRequests?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full">
                  <h4 className="text-lg text-neutral-900">
                    No requests found.
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Click new request to get started.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="bots">
            <div className="flex flex-col p-2 gap-2 bg-neutral-100  rounded-xl h-screen"></div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
