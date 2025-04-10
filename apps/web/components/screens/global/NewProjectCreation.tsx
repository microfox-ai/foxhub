"use client";

import { useState } from "react";
import { ButtonSCN } from "@/components/elements/Button";
import { Send, Loader2 } from "lucide-react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { analytics } from "@/utils/services/analytics/client";

export default function NewProjectCreation({
  userId,
  onProjectCreated,
}: {
  userId: string;
  onProjectCreated: (newProject: any) => void;
}) {
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleCreateProject = async () => {
    if (!projectTitle.trim() || !description.trim()) {
      toast.error("Please provide both a title and a detailed description.");
      return;
    }
    if (!userId) {
      toast.error("Please login to create a project.");
      return;
    }
    setSending(true);
    try {
      const newProject = await PortalSdk.postData("/api/bot-project/create", {
        userId,
        projectName: projectTitle.trim(),
        projectDescription: description.trim(),
      });
      // track project creation
      analytics.track("Project Created", {
        userId,
        projectId: newProject.id,
        projectName: newProject.name,
        timestamp: new Date().toISOString(),
      });
      toast.success("Project created successfully!");
      setProjectTitle("");
      setDescription("");
      onProjectCreated(newProject);
    } catch (error) {
      toast.error("Failed to create project.");
      console.error("Error creating project:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">

    </div>
  );
}
