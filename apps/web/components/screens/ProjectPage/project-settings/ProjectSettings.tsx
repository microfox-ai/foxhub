/* eslint-disable @next/next/no-img-element */
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Settings, Users, CreditCard, ChartBar, Bell, Shield } from "lucide-react";
import GeneralSettings from "./GeneralSettings";
import TeamMembers from "./TeamMembers";
import { SecuritySettings } from "./SecuritySettings";

const settingsTabs = [
  {
    label: "General Settings",
    value: "general",
    icon: <Settings className="h-4 w-4 mr-2" />,
  },
  {
    label: "Members & Roles",
    value: "team",
    icon: <Users className="h-4 w-4 mr-2" />,
  },
  {
    label: "Billing",
    value: "billing",
    icon: <CreditCard className="h-4 w-4 mr-2" />,
  },
  {
    label: "Analytics",
    value: "analytics",
    icon: <ChartBar className="h-4 w-4 mr-2" />,
  },
  {
    label: "Notifications",
    value: "notifications",
    icon: <Bell className="h-4 w-4 mr-2" />,
  },
  {
    label: "Security",
    value: "security",
    icon: <Shield className="h-4 w-4 mr-2" />,
  },
];

const ProjectSettings = () => {
  const router = useRouter();
  const { selectedProject, projectId } = useClientProject();
  const [activeTab, setActiveTab] = useState("general");

  if (!selectedProject || !projectId) {
    return null;
  }

  return (
    <div className="container px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between h-12"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => router.push(`/project/${projectId}`)}
                className="cursor-pointer hover:text-primary"
              >
                {selectedProject.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{settingsTabs.find(tab => tab.value === activeTab)?.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>
      <div className="h-screen w-full overflow-y-auto thin-scrollbar">
        <Tabs onValueChange={(value) => {
          setActiveTab(value);
        }} orientation="vertical" defaultValue="general" className="grid grid-cols-12  max-w-6xl mx-auto h-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="col-span-2 h-full"
          >
            <TabsList className="flex flex-col items-start w-full gap-2 h-fit p-2 sticky top-4">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="transition-all duration-200 hover:scale-105 w-full justify-start "
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="col-span-10 mb-20 m-4"
          >
            <TabsContent value="general">
              <GeneralSettings selectedProject={selectedProject} projectId={projectId} />
            </TabsContent>

            <TabsContent value="team">
              <TeamMembers selectedProject={selectedProject} projectId={projectId} />
            </TabsContent>

            <TabsContent value="billing">
              <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Billing Settings</h2>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Analytics</h2>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Notification Settings</h2>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectSettings;
