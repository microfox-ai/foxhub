"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { ArrowLeftIcon, AxeIcon, BotIcon, CornerDownRightIcon, ListIcon, PyramidIcon } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import Link from "next/link";

const Dashboard = () => {
  const { projects, selectedProject, isLoading, setSelectedProject, selectedProjectClientRequests, selectedProjectClientRequestsLoading } = useClientProject();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (selectedProject) {
      setActiveTab("home");
    }
  }, [selectedProject]);

  if (isLoading || !user) {
    return (
      <div className="container mx-auto w-full min-h-screen p-8 flex flex-col justify-center items-center">
        <div className="grid grid-cols-12 gap-4 w-full">
          <div className="col-span-12 bg-white p-4">
            <div className="h-12 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="col-span-12 grid grid-cols-12 gap-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="col-span-4">
                <div className="bg-white shadow-md flex cursor-pointer flex-row rounded-xl shadow-md">
                  <div className="w-32 h-32 rounded-lg bg-gray-200 animate-pulse"></div>
                  <div className="flex flex-col items-center p-4 items-start">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProject)
    return (
      <div className="container mx-auto w-full min-h-screen p-8 flex flex-col justify-center items-center">
        <div className="grid grid-cols-12 gap-4 w-full">
          <div className="col-span-12 bg-white p-4">
            <h2 className="text-4xl font-medium mb-2">
              Hello, {user?.name || <span className="inline-block h-8 w-32 bg-gray-200 rounded animate-pulse"></span>}
            </h2>
            <p className="text-lg text-gray-500">
              You have {projects.length} Workspaces. What are you looking for ?
            </p>
          </div>
          <div className="col-span-12 grid grid-cols-12 gap-4 p-4">
            {projects.map((project) => (
              <div key={project.id} className="col-span-4">
                <div
                  onClick={() => {
                    setSelectedProject(project);
                  }}
                  className="bg-white shadow-md flex cursor-pointer flex-row rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-4px] hover:bg-gray-100 transition-all duration-300">
                  <img
                    src={project.imageUrl ?? "/images/default-bot-avatar.png"}
                    alt={project.name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex flex-col items-center p-4 items-start">
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                    <p className="text-sm text-gray-400">{project.description || 'No description available'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )

  return (
    <div className="container mx-auto w-full min-h-screen p-8 flex flex-col justify-center items-center">
      <div className="grid grid-cols-12 gap-4 w-full px-8">
        <div className="col-span-12 bg-white">
          <h2 className="text-4xl font-medium mb-2">
            What can I do for you ?
          </h2>
          <p className="text-lg text-gray-500">
            I am currently running {selectedProject?.clientRequests?.length} Tasks, connected to {selectedProject?.clientRequests?.length} Platforms.
          </p>
        </div>
        <div className="col-span-6 gap-4">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="home" className="mt-0">
              <ul className="flex flex-col gap-4 justify-start items-start">
                <li
                  onClick={() => setActiveTab("tasks")}
                  className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "tasks" ? "bg-gray-100" : ""}`}>
                  <ListIcon className="w-4 h-4" />
                  <span> Show all running tasks </span>
                </li>
                <Link
                  href="/my-data"
                  onClick={() => setActiveTab("access")}
                  className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "access" ? "bg-gray-100" : ""}`}>
                  <PyramidIcon className="w-4 h-4" />
                  <span> Show all connected platforms </span>
                </Link>
                <Link
                  href="/my-bots"
                  onClick={() => setActiveTab("bots")}
                  className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "bots" ? "bg-gray-100" : ""}`}>
                  <BotIcon className="w-4 h-4" />
                  <span> Show all cutom bots </span>
                </Link>
                <li className="bg-black text-white flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2">
                  <CornerDownRightIcon className="w-4 h-4" />
                  <span> Start a New Task </span>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="tasks" className="mt-0">
              <div className="bg-white rounded-lg">
                {selectedProjectClientRequestsLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div>
                    {selectedProjectClientRequests?.length === 0 ? (
                      <p className="text-gray-500">No running tasks</p>
                    ) : (
                      <ul className="space-y-2 flex flex-col gap-2 items-start max-h-[500px] overflow-y-auto thin-scrollbar">
                        {selectedProjectClientRequests?.map((request) => (
                          <Link
                            href={`/project/${selectedProject?.id}/request/${request.id}`}
                            key={request.id} className="cursor-pointer px-4 flex items-center gap-2 border border-gray-200 p-2 rounded-lg">
                            <span>{request.title} - {request.description && request.description.length > 0 ? request.description.substring(0, 100) + "..." : "Yet to start."}</span>
                          </Link>
                        ))}
                        <li
                          onClick={() => setActiveTab("home")}
                          className="flex flex-row gap-2 items-center justify-start p-2 hover:text-gray-500 cursor-pointer">
                          <ArrowLeftIcon className="w-4 h-4" />
                          <span> Back Home </span>
                        </li>
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
};

export default Dashboard;
