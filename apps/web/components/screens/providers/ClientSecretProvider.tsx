"use client";

import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";
import useSWR from "swr";
import { toast } from "sonner";

export type ClientSecret = {
  id: string;
  botProjectId: string;
  userId: string;
  name: string;
  type: string;
  variables: any[];
  clientRequestIds: string[];
};

type ClientSecretContextType = {
  clientSecrets: ClientSecret[];
  refreshClientSecrets: () => Promise<any>;
  isLoading: boolean;
  showSlashModal: boolean;
  setShowSlashModal: Dispatch<SetStateAction<boolean>>;
};

const ClientSecretContext = createContext<ClientSecretContextType | undefined>(
  undefined
);

export const ClientSecretProvider: React.FC<{
  botProjectId?: string;
  // clientRequestId?: string;
  children: React.ReactNode;
}> = ({ botProjectId, children }) => {
  const searchParams = new URLSearchParams();
  // searchParams.append('userId', userId);
  searchParams.append("botProjectId", botProjectId || "");
  // searchParams.append('clientRequestId', clientRequestId);

  const { data, error, mutate, isLoading } = useSWR(
    `/api/client-secrets?${searchParams.toString()}`,
    (url) => fetch(url).then((res) => res.json())
  );

  if (error) {
    //toast.error("Error fetching client bots.");
    console.error("ClientSecret fetch error:", error);
  }

  const clientSecrets: ClientSecret[] = data?.clientSecrets || [];

  // Enhanced refreshClientSecrets function that forces revalidation
  const refreshClientSecrets = async () => {
    try {
      // Clear cache and force revalidation
      const result = await mutate(undefined, { revalidate: true });
      return result;
    } catch (error) {
      console.error("Error refreshing client bots:", error);
      toast.error("Failed to refresh bots data");
      return null;
    }
  };

  const [showSlashModal, setShowSlashModal] = useState(false);

  return (
    <ClientSecretContext.Provider
      value={{
        clientSecrets,
        refreshClientSecrets,
        isLoading,
        showSlashModal,
        setShowSlashModal,
      }}
    >
      {children}
    </ClientSecretContext.Provider>
  );
};

export const useClientSecrets = () => {
  const context = useContext(ClientSecretContext);
  if (!context) {
    throw new Error(
      "useClientSecrets must be used within a ClientSecretProvider"
    );
  }
  return context;
};
