"use client";

import { CLIENTSECRETSTATUS } from "@prisma/client";
import { useEffect } from "react";
import { toast } from "sonner";

interface OAuthConnectCallbackProps {
  docId: string;
  keys: Array<{
    key: string;
    value: string;
    isOptional: boolean;
  }>;
  tokenResponse: any;
}

const OAuthConnectCallback = ({ docId, keys, tokenResponse }: OAuthConnectCallbackProps) => {

  useEffect(() => {
    const updateClientSecret = async () => {
      try {
        const response = await fetch("/api/client-secrets", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: docId,
            variables: keys,
            status: CLIENTSECRETSTATUS.FILLED,
            tokenResponse: tokenResponse,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update client secret");
        }

        toast.success("Successfully connected Google account!");

        // Close the popup window after successful connection
        if (window.opener) {
          window.opener.postMessage("oauth-success", "*");
          window.close();
        }
      } catch (error) {
        console.error("Error updating client secret:", error);
        toast.error("Failed to connect Google account");
      }
    };
    updateClientSecret();
  }, [docId, keys, tokenResponse]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Connecting...</h1>
        <p className="text-gray-600">
          Please wait while we complete the setup.
        </p>
      </div>
    </div>
  );
};

export default OAuthConnectCallback;
