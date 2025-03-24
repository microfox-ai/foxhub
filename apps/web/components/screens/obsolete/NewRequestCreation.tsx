"use client";

import { useState } from "react";
import { ButtonSCN } from "@/components/elements/Button";
import { Send, Loader2 } from "lucide-react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BotProject, ClientRequest } from "@prisma/client";

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}

export default function NewRequestCreation({
  userId,
  project,
  onRequestCreated,
}: {
  userId: string;
  project: BotProjectWithRequests;
  onRequestCreated: (newRequest: ClientRequest) => void;
}) {
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleCreateRequest = async () => {
    if (!description.trim()) {
      toast.error("Please explain your request in detail.");
      return;
    }
    setSending(true);
    try {
      const newRequest = await PortalSdk.postData(
        "/api/client-requests/create",
        {
          userId,
          requestDescription: description.trim(),
          botProjectId: project?.id,
        },
      );
      toast.success("Request created successfully!");
      setDescription("");
      onRequestCreated(newRequest?.clientRequest);
      router.replace(`?request=${newRequest?.clientRequest?.id}&view=request`);
    } catch (error) {
      toast.error("Failed to create request.");
      console.error("Error creating request:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="w-full max-w-lg">
        <h2 className="text-2xl font-semibold">New Request</h2>
        <p className="mt-2 text-sm text-gray-500">
          Please explain your request in detail so we can help you effectively.
        </p>
        <textarea
          className="mt-4 h-32 w-full resize-none rounded-lg border p-3 text-lg outline-none"
          placeholder="Describe your request..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCreateRequest();
            }
          }}
          disabled={sending}
        />
        <ButtonSCN
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={handleCreateRequest}
          disabled={sending || !description.trim()}
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Create Request
        </ButtonSCN>
      </div>
    </div>
  );
}
