"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import ChatWindow from "./ChatWindow";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";

export const PlaygroundPage = () => {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <ClientSecretProvider botProjectId={""}>
      <ChatWindow userId={user.id} isLoading={false} />
    </ClientSecretProvider>
  );
};
