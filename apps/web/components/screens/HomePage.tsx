"use client";

import { useUser } from "@/utils/hooks/useUser";
import NewProjectCreation from "./global/NewProjectCreation";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useEffect } from "react";

export const CustomBotsHomePage = () => {
  const { user } = useUser();
  const router = useRouter();

  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(
    `/api/bot-project?userId=${user?.id}`,
    async (url) => await fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (projects && projects.length > 0) {
      const lastProject = projects[0];
      if (lastProject && lastProject.clientRequests.length > 0) {
        router.push(
          `/project/${lastProject.id}/request/${lastProject.clientRequests[0].id}`
        );
      } else if (lastProject) {
        router.push(`/project/${projects[0].id}`);
      }
    }
  }, [projects]);

  if (!user || isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* <h1 className="text-4xl font-bold text-neutral-900">Welcome to Custom Bots</h1>
            <p className="text-lg text-neutral-600">Enter the new age of Ai-first, custom made, branded bots</p> */}
      <NewProjectCreation
        userId={user?.id}
        onProjectCreated={(newProject) => {
          router.push(`/project/${newProject.id}`);
        }}
      />
    </div>
  );
};
