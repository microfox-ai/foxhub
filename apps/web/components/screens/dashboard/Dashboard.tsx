"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useClientProject } from "../providers/ClientProjectProvider";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { HomeTab } from "./HomeTab";
import { TasksTab } from "./TasksTab";
import { ShardPagesTab } from "./ShardPagesTab";

const Dashboard = ({ defaultTab = "home" }: { defaultTab?: string }) => {
  const { projects, selectedProject, isLoading, setSelectedProject, selectedProjectClientRequests, selectedProjectClientRequestsLoading, setSubmitAnnotations, createNewEmptyRequest } = useClientProject();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (selectedProject) {
      setActiveTab(defaultTab);
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
              <HomeTab
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                createNewEmptyRequest={createNewEmptyRequest}
              />
            </TabsContent>
            <TabsContent value="tasks" className="mt-0">
              <TasksTab
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedProjectClientRequests={selectedProjectClientRequests}
                selectedProjectClientRequestsLoading={selectedProjectClientRequestsLoading}
                selectedProjectId={selectedProject.id}
                createNewEmptyRequest={createNewEmptyRequest}
              />
            </TabsContent>
          </Tabs>
        </div>
        <div className="col-span-6 gap-4">
          <ShardPagesTab
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            createNewEmptyRequest={createNewEmptyRequest}
          />
        </div>
      </div>
    </div>
  )
};

export default Dashboard;
