"use client"

import React, {
    createContext,
    useContext,
    useCallback,
    useMemo,
    useState,
    useEffect
} from "react";
import { WebContainer } from '@webcontainer/api';
import { ClientRequest } from "@prisma/client";
import { useWebContainer } from "../Chat/message/WebContainerProvider";
import { useTaskInstanceMetaContext } from "./TaskInstanceMetaProvider";
import { buildFileTree } from "../Chat/code/FileTree";
import { useClientProject } from "./ClientProjectProvider";
import useSWR from 'swr';

type FileContent = {
    content: string;
    sha: string;
    path: string;
};

type LocalDeployContextType = ReturnType<typeof useLocalDeployContext>;

const LocalDeployContext = createContext<LocalDeployContextType | undefined>(
    undefined
);

export interface LocalDeployProviderProps {
    children: React.ReactNode;
    initializeWebContainer?: boolean;
}

export const useLocalDeployContext = (initializeWebContainer?: boolean) => {
    const { webContainer, loadFromGithub, previewCommit, files: webContainerFiles } = useWebContainer();
    const { taskInstanceMeta } = useTaskInstanceMetaContext();
    const { selectedRequest } = useClientProject();
    const [latestCommit, setLatestCommit] = useState<string | null>(null);

    const files = taskInstanceMeta?.buildingStep?.files || [];

    // Fetch latest commit using SWR
    const { data: commitData } = useSWR(
        selectedRequest ? `/api/client-requests/code-files/latest-commit?requestId=${selectedRequest.id}` : null,
        async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch commit');
            return response.json();
        },
        {
            refreshInterval: 30000, // Poll every 30 seconds
            revalidateOnFocus: true,
        }
    );

    useEffect(() => {
        if (commitData?.commit) {
            setLatestCommit(commitData.commit);
        }
    }, [commitData]);

    useEffect(() => {
        if (files.length > 0) {
            const packageJsonFile = files.find(file => file.filePath.includes('package.json'));
            if (packageJsonFile) {
                const rootDir = packageJsonFile.filePath.replaceAll("\\", "/").split('/').slice(0, -1).join('/');
                console.log('Root directory containing package.json:', rootDir);

            }

            const fileTree = buildFileTree(files);
            loadFromGithub(selectedRequest!, fileTree);
        }
    }, [files]);

    useEffect(() => {
        console.log("Preview Commit", previewCommit, webContainerFiles);
    }, [previewCommit])

    return {
        files,
        latestCommit,
    };
};

export const LocalDeployProvider: React.FC<LocalDeployProviderProps> = ({
    children,
    initializeWebContainer,
}) => {
    const value = useLocalDeployContext(initializeWebContainer);
    return (
        <LocalDeployContext.Provider value={value}>
            {children}
        </LocalDeployContext.Provider>
    );
};

// Custom hook to use the LocalDeploy context
export const useLocalDeploy = () => {
    const context = useContext(LocalDeployContext);
    if (context === undefined) {
        throw new Error("useLocalDeploy must be used within a LocalDeployProvider");
    }
    return context;
};
