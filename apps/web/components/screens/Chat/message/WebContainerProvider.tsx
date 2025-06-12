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
import { FileTreeNode } from "../code/FileTree";

type FileContent = {
    content: string;
    sha: string;
    path: string;
};

type WebContainerContextType = ReturnType<typeof useWebContainerContext>;

const WebContainerContext = createContext<WebContainerContextType | undefined>(
    undefined
);

export interface WebContainerProviderProps {
    children: React.ReactNode;
    initializeWebContainer?: boolean;
}

export const useWebContainerContext = (initializeWebContainer?: boolean) => {
    const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
    const [files, setFiles] = useState<Record<string, FileContent>>({});
    const [previewCommit, setPreviewCommit] = useState<string | null>(null);
    const [previewRequest, setPreviewRequest] = useState<ClientRequest | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const bootWebContainer = async () => {
            const webcontainerInstance = await WebContainer.boot();
            setWebContainer(webcontainerInstance);
        }
        if (initializeWebContainer) {
            bootWebContainer();
        }
    }, [initializeWebContainer]);

    const fetchFileContent = async (requestId: string, filePath: string): Promise<FileContent> => {
        const response = await fetch(`/api/client-requests/code-files?requestId=${requestId}&filePath=${encodeURIComponent(filePath)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${filePath}`);
        }
        return response.json();
    };

    const loadFromGithub = async (clientRequest: ClientRequest, files: FileTreeNode[]) => {
        if (!webContainer) {
            throw new Error("WebContainer not initialized");
        }

        setIsLoading(true);
        try {
            const processFile = async (file: FileTreeNode) => {
                if (file.isFolder && file.children) {
                    // Recursively process all children in the folder
                    for (const child of file.children) {
                        await processFile(child);
                    }
                } else if (!file.isFolder && file.originalFilePath) {
                    const fileContent = await fetchFileContent(clientRequest.id, clientRequest.requestDir + "/" + file.path);
                    const filePath = file.originalFilePath as string;
                    setFiles(prev => ({
                        ...prev,
                        [filePath]: fileContent
                    }));

                    // Mount the file in WebContainer using the local path
                    await webContainer.fs.writeFile(file.path, fileContent.content);

                    setPreviewCommit(fileContent.sha);
                }
            };

            // Process each file/folder in the root level
            for (const file of files) {
                await processFile(file);
            }
        } catch (error) {
            console.error("Error loading files from GitHub:", error);
            throw error;
        } finally {
            setPreviewRequest(clientRequest);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        //console.log(files)
        //console.log(webContainer?.fs.readdir(webContainer?.workdir))
    }, [files])

    const startLocalServer = async () => {
        if (!webContainer) {
            throw new Error("WebContainer not initialized");
        }
        // Start the server logic here
    };

    return {
        webContainer,
        files,
        isLoading,
        loadFromGithub,
        startLocalServer,
        previewCommit
    };
};

export const WebContainerProvider: React.FC<WebContainerProviderProps> = ({
    children,
    initializeWebContainer,
}) => {
    const value = useWebContainerContext(initializeWebContainer);
    return (
        <WebContainerContext.Provider value={value}>
            {children}
        </WebContainerContext.Provider>
    );
};

// Custom hook to use the WebContainer context
export const useWebContainer = () => {
    const context = useContext(WebContainerContext);
    if (context === undefined) {
        throw new Error("useWebContainer must be used within a WebContainerProvider");
    }
    return context;
};
