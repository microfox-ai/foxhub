"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import ChatWindow from "./ChatWindow";

export const PlaygroundPage = () => {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return <ChatWindow userId={user.id} isLoading={false} />;
};
