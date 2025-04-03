"use client";

import { createContext, useContext, ReactNode } from "react";
import { useParams } from "next/navigation";

interface ClientProjectContextType {
  clientRequestId: string | null;
  projectId: string | null;
}

const ClientProjectContext = createContext<
  ClientProjectContextType | undefined
>(undefined);

export function useClientProject() {
  const context = useContext(ClientProjectContext);
  if (context === undefined) {
    throw new Error(
      "useClientProject must be used within a ClientProjectProvider"
    );
  }
  return context;
}

interface ClientProjectProviderProps {
  children: ReactNode;
}

export function ClientProjectProvider({
  children,
}: ClientProjectProviderProps) {
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;

  const value = {
    clientRequestId: requestParamId ?? null,
    projectId: projectParamId ?? null,
  };

  return (
    <ClientProjectContext.Provider value={value}>
      {children}
    </ClientProjectContext.Provider>
  );
}
