"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OAuthConnectCallbackProps {
  docId: string;
  keys: {
    GOOGLE_ACCESS_TOKEN: string;
    GOOGLE_REFRESH_TOKEN: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
    GOOGLE_SCOPES: string;
  };
}

const OAuthConnectCallback = ({ docId, keys }: OAuthConnectCallbackProps) => {
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
            variables: [
              {
                key: "GOOGLE_ACCESS_TOKEN",
                value: keys.GOOGLE_ACCESS_TOKEN,
                isOptional: false,
              },
              {
                key: "GOOGLE_REFRESH_TOKEN",
                value: keys.GOOGLE_REFRESH_TOKEN,
                isOptional: false,
              },
              {
                key: "GOOGLE_CLIENT_ID",
                value: keys.GOOGLE_CLIENT_ID,
                isOptional: false,
              },
              {
                key: "GOOGLE_CLIENT_SECRET",
                value: keys.GOOGLE_CLIENT_SECRET,
                isOptional: false,
              },
              {
                key: "GOOGLE_REDIRECT_URI",
                value: keys.GOOGLE_REDIRECT_URI,
                isOptional: false,
              },
              {
                key: "GOOGLE_SCOPES",
                value: keys.GOOGLE_SCOPES,
                isOptional: false,
              },
            ],
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
  }, [docId, keys]);

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

