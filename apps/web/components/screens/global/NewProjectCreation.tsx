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
      <div className="w-full max-w-lg">
        <h2 className="text-2xl font-semibold">New Project</h2>
        <p className="mt-2 text-sm text-gray-500">
          Please provide a title and describe your project in detail.
        </p>
        <input
          type="text"
          placeholder="Project Title"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="mt-4 w-full rounded-lg border p-3 text-lg outline-none"
          disabled={sending}
        />
        <textarea
          className="mt-4 h-32 w-full resize-none rounded-lg border p-3 text-lg outline-none"
          placeholder="Describe your project..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreateProject();
            }
          }}
          disabled={sending}
        />
        <ButtonSCN
          className="mt-4 w-full"
          onClick={handleCreateProject}
          disabled={sending || !projectTitle.trim() || !description.trim()}
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Create Project
        </ButtonSCN>
      </div>
    </div>
  );
}
