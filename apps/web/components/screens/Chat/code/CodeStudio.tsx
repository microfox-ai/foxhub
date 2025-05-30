'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useTaskInstanceMetaContext } from '../../providers/TaskInstanceMetaProvider';
import { cn } from '@/lib/utils';
import {
    ChevronDown,
    FolderIcon,
    FileText,
    FileCode,
    FileJson,
    FileImage,
    FileIcon,
    Save,
    Check,
    Code,
    CopyIcon,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useClientProject } from '../../providers/ClientProjectProvider';
import { PROJECT_REPO_OWNER } from '@/utils/constants/githubInfo';
import useSWR from 'swr';
import { ClientSecretVariable } from '@/server/types';
import { ClientSecret } from '@prisma/client';
import { useParams } from 'next/navigation';
import { IN_DEV } from '@/utils/constants/appInfo';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateDefaultEnvFile, generateDefaultReadmeFile } from './defaultFiles';

// Define a simple type for file entries from taskInstanceMeta
interface BuildFile {
    filePath: string;
    content?: string;
    fileType?: string;
}

// Type for the hierarchical file structure used by the FileTree
interface FileTreeNode {
    id: string;
    name: string;
    path: string;
    children?: FileTreeNode[];
    content?: string;
    isFolder: boolean;
    fileType: string;
}

interface CodeStudioProps {
    // Potentially a function to fetch file content if not readily available
    // onFileContentFetch?: (filePath: string) => Promise<string>; 
}

// Helper function to get file icon based on type
const getFileIconCmp = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('json')) return <FileJson className="w-4 h-4 text-yellow-500" />;
    if (type.includes('ts') || type.includes('tsx')) return <FileCode className="w-4 h-4 text-blue-500" />;
    if (type.includes('js') || type.includes('jsx')) return <FileCode className="w-4 h-4 text-yellow-400" />;
    if (type.includes('css')) return <FileCode className="w-4 h-4 text-pink-500" />;
    if (type.includes('html')) return <FileCode className="w-4 h-4 text-orange-500" />;
    if (type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('gif') || type.includes('svg')) return <FileImage className="w-4 h-4 text-green-500" />;
    if (type.includes('md') || type.includes('txt')) return <FileText className="w-4 h-4 text-gray-500" />;
    return <FileIcon className="w-4 h-4 text-gray-500" />;
};

const buildFileTree = (files: BuildFile[]): FileTreeNode[] => {
    // Find the root directory based on package.json
    const rootDir: string = files.find((file) => file.filePath.includes('package.json'))?.filePath.replaceAll("\\", "/").split('/').slice(0, -1).join('/') || '';

    // Rewrite file paths relative to the root directory
    const rewrittenFiles = files
        .filter((file) => file.filePath.replaceAll("\\", "/").includes(rootDir))
        .map((file) => ({
            ...file,
            filePath: file.filePath.replaceAll("\\", "/").replace(rootDir, '')
        }));

    const root: FileTreeNode = { id: 'root', name: 'root', path: '', isFolder: true, children: [], fileType: 'folder' };

    rewrittenFiles.forEach(file => {
        if (!file.filePath) return;
        const parts = file.filePath.replaceAll("\\", "/").split('/').filter(p => p);
        let currentNode = root;

        parts.forEach((part, index) => {
            const existingNode = currentNode.children?.find(child => child.name === part);
            const currentPath = parts.slice(0, index + 1).join('/');
            const isLastPart = index === parts.length - 1;
            const nodeFileType = isLastPart
                ? (file.fileType || file.filePath.split('.').pop() || 'file')
                : 'folder';

            if (existingNode) {
                currentNode = existingNode;
            } else {
                const newNode: FileTreeNode = {
                    id: currentPath,
                    name: part,
                    path: currentPath,
                    isFolder: !isLastPart,
                    children: !isLastPart ? [] : undefined,
                    content: isLastPart ? file.content : undefined,
                    fileType: nodeFileType,
                };
                currentNode.children = currentNode.children || [];
                currentNode.children.push(newNode);
                currentNode = newNode;
            }
        });
    });
    return root.children || [];
};

const FileTreeItem: React.FC<{ node: FileTreeNode; onFileSelect: (file: FileTreeNode) => void; level?: number }> = ({ node, onFileSelect, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.isFolder) {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(node);
        }
    };

    const handleFileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node.isFolder) {
            onFileSelect(node);
        }
    };

    const sortedChildren = useMemo(() => {
        if (!node.children) return [];
        return [...node.children].sort((a, b) => {
            if (a.isFolder !== b.isFolder) {
                return a.isFolder ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [node.children]);

    return (
        <div className="flex flex-col text-sm">
            <div
                onClick={handleToggle}
                className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-800 cursor-pointer select-none text-gray-300",
                    level > 0 && `pl-${2 + level * 3}`
                )}
            >
                {node.isFolder ? (
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 transition-transform duration-150 shrink-0 text-gray-400",
                            isOpen ? "transform rotate-0" : "transform -rotate-90"
                        )}
                    />
                ) : (
                    <span className="w-4 h-4 shrink-0" />
                )}
                {node.isFolder ? <FolderIcon className="w-4 h-4 text-blue-400 shrink-0" /> : getFileIconCmp(node.fileType)}
                <span className="truncate" onClick={handleFileClick}>{node.name}</span>
            </div>
            {node.isFolder && isOpen && sortedChildren.length > 0 && (
                <div className="flex flex-col pl-3 border-l border-gray-700 ml-[7px]">
                    {sortedChildren.map(child => (
                        <FileTreeItem key={child.id} node={child} onFileSelect={onFileSelect} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const CodeStudio: React.FC<CodeStudioProps> = ({ }) => {
    const [activeFile, setActiveFile] = useState<FileTreeNode | null>(null);
    const [editorContent, setEditorContent] = useState<string>('');
    const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isModified, setIsModified] = useState(false);
    const { taskInstanceMeta } = useTaskInstanceMetaContext();
    const { selectedRequest } = useClientProject();
    const [codePopoverOpen, setCodePopoverOpen] = useState(false);

    const files = taskInstanceMeta?.buildingStep?.files || [];
    const fileTree = useMemo(() => buildFileTree(files as any as BuildFile[]), [files]);

    const gitUrl = useMemo(() => {
        if (!selectedRequest || !selectedRequest.repoName || !selectedRequest.prBranch) return null;
        return `https://github.com/${PROJECT_REPO_OWNER}/${selectedRequest.repoName}/tree/${selectedRequest.prBranch}`;
    }, [selectedRequest, activeFile]);

    // Sort root level items: folders first, then files alphabetically
    const sortedFileTree = useMemo(() => {
        return [...fileTree].sort((a, b) => {
            if (a.isFolder !== b.isFolder) {
                return a.isFolder ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [fileTree]);

    const fetchFileContent = async (filePath: string) => {
        if (!selectedRequest || !selectedRequest.repoName || !selectedRequest.prBranch) {
            toast.error('No project selected');
            return null;
        }

        try {
            setIsLoading(true);
            const response = await fetch(
                `/api/files?owner=${PROJECT_REPO_OWNER}&repo=${selectedRequest.repoName}&branch=${encodeURIComponent(selectedRequest.prBranch)}&filePath=${encodeURIComponent(filePath.replaceAll("\\", "/").replace(selectedRequest.repoName + "/", ''))}`
            );
            if (!response.ok) {
                throw new Error('Failed to fetch file content');
            }
            const data = await response.json();
            return data.content;
        } catch (error) {
            console.error('Error fetching file:', error);
            toast.error('Failed to fetch file content');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const saveFileContent = async () => {
        if (!activeFile || !selectedRequest || !selectedRequest.repoName || !selectedRequest.prBranch) return;

        const fullFilePath = files.find((file) => file.fileName === activeFile.name)?.filePath?.replaceAll("\\", "/").replace(selectedRequest.repoName + "/", '');
        try {
            setIsSaving(true);
            const response = await fetch('/api/files', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: editorContent,
                    owner: PROJECT_REPO_OWNER,
                    repo: selectedRequest.repoName,
                    branch: selectedRequest.prBranch,
                    filePath: fullFilePath,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save file');
            }

            setIsModified(false);
            toast.success('File saved successfully');
        } catch (error) {
            console.error('Error saving file:', error);
            toast.error('Failed to save file');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const loadFileContent = async () => {
            if (activeFile) {
                if (activeFile.id === ".env") {
                    setEditorContent(envFile.content);
                    setIsModified(false);
                } else if (activeFile.id === "README.md") {
                    setEditorContent(readmeFile.content);
                    setIsModified(false);
                } else {
                    const fullFilePath = files.find((file) => file.fileName === activeFile.name)?.filePath;
                    if (!fullFilePath) {
                        toast.error('File not found');
                        return;
                    }
                    const content = await fetchFileContent(fullFilePath);
                    if (content !== null) {
                        setEditorContent(content);
                        setIsModified(false);
                    }
                }
            }
        };

        loadFileContent();
    }, [activeFile]);

    // Add keyboard shortcut support for saving
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                if (activeFile && isModified) {
                    saveFileContent();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeFile, isModified, saveFileContent]);

    const handleFileSelect = (file: FileTreeNode) => {
        if (!file.isFolder) {
            setActiveFile(file);
            setIsModified(false);
        }
    };

    function handleEditorDidMount(editor: any, monaco: Monaco) {
        setMonacoInstance(monaco);
    }

    const getLanguage = (filePath?: string) => {
        if (!filePath) return 'plaintext';
        const extension = filePath.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'json':
                return 'json';
            case 'css':
                return 'css';
            case 'html':
                return 'html';
            case 'py':
                return 'python';
            case 'md':
                return 'markdown';
            default:
                return 'plaintext';
        }
    };
    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const requestParamId = params?.request_id;
    const { data: secretsData, mutate: mutateSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
    }>(
        requestParamId
            ? `/api/client-secrets?clientRequestId=${requestParamId}&status=FILLED`
            : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch secrets");
            return res.json();
        },
        {
            revalidateOnFocus: true,
        }
    );
    const secrets = secretsData?.clientSecrets?.filter((secret) => !secret.isHidden) || [];
    const envFile = useMemo(() => {
        let variables = secrets.flatMap((secret: any) => (secret.variables ?? [])?.concat(secret.botConfig ?? []))?.filter((variable: ClientSecretVariable) => !variable.key.includes("CLIENT_"));
        return {
            id: ".env",
            name: ".env",
            path: ".env",
            isFolder: false,
            children: [],
            content: generateDefaultEnvFile(variables),
            fileType: "env"
        }
    }, [secrets]);

    const readmeFile = useMemo(() => {
        return {
            id: "README.md",
            name: "README.md",
            path: "README.md",
            isFolder: false,
            children: [],
            content: selectedRequest ? generateDefaultReadmeFile(selectedRequest) : "",
            fileType: "md"
        }
    }, [selectedRequest]);

    const handleEnvSelect = () => {
        setActiveFile(envFile);
        setIsModified(false);
    }

    const handleReadmeSelect = () => {
        setActiveFile(readmeFile);
        setIsModified(false);
    }

    return (
        <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-lg border">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                <div className="p-4 h-full overflow-y-auto bg-black">
                    <h2 className="text-lg font-semibold mb-2 text-gray-200">Files</h2>
                    {sortedFileTree.length > 0 ? (
                        sortedFileTree.map(node => (
                            <FileTreeItem key={node.id} node={node} onFileSelect={handleFileSelect} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">No files available.</p>
                    )}
                    {IN_DEV && (
                        <FileTreeItem key={".env"} node={envFile} onFileSelect={handleEnvSelect} />
                    )}
                    {IN_DEV && (
                        <FileTreeItem key={"README.md"} node={readmeFile} onFileSelect={handleReadmeSelect} />
                    )}
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
                <div className="h-full flex flex-col bg-black">
                    <div className="p-2 border-b border-gray-800 text-sm bg-gray-900 text-gray-300 flex items-center justify-between">
                        <span>{activeFile ? activeFile.path : ""}</span>
                        <div className="flex items-center gap-2">
                            {isModified && activeFile && (
                                <Button
                                    onClick={saveFileContent}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Save
                                        </>
                                    )}
                                </Button>
                            )}
                            <Popover open={codePopoverOpen} onOpenChange={setCodePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-1"
                                        onClick={() => setCodePopoverOpen((open) => !open)}
                                    >
                                        <Code className="w-5 h-5 mr-1" />
                                        Code
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-96">
                                    {selectedRequest && selectedRequest.repoName && selectedRequest.prBranch ? (
                                        <div className="flex flex-col gap-4">

                                            <Tabs defaultValue="https" className="w-full">
                                                <TabsList className="flex flex-row items-center justify-between bg-transparent w-full">
                                                    <div className="flex flex-row items-center gap-2">
                                                        <TabsTrigger value="https">HTTPS</TabsTrigger>
                                                        <TabsTrigger value="cli">GitHub CLI</TabsTrigger>
                                                    </div>
                                                    <div className="flex justify-end ml-auto">
                                                        <a
                                                            href={`https://github.com/${PROJECT_REPO_OWNER}/${selectedRequest.repoName}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                                                        >
                                                            Open on GitHub
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </TabsList>
                                                <TabsContent value="https">
                                                    <div className="mb-2 text-xs text-gray-500">Clone using the web URL.</div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 select-all"
                                                            value={`https://github.com/${PROJECT_REPO_OWNER}/${selectedRequest.repoName}.git`}
                                                            readOnly
                                                            onFocus={e => e.target.select()}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            type="button"
                                                            onClick={() => navigator.clipboard.writeText(`https://github.com/${PROJECT_REPO_OWNER}/${selectedRequest.repoName}.git`)}
                                                        >
                                                            <CopyIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TabsContent>
                                                <TabsContent value="cli">
                                                    <div className="mb-2 text-xs text-gray-500">Work fast with our official CLI. <a href="https://cli.github.com/" target="_blank" rel="noopener noreferrer" className="underline">Learn more</a></div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 select-all"
                                                            value={`gh repo clone ${PROJECT_REPO_OWNER}/${selectedRequest.repoName}`}
                                                            readOnly
                                                            onFocus={e => e.target.select()}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            type="button"
                                                            onClick={() => navigator.clipboard.writeText(`gh repo clone ${PROJECT_REPO_OWNER}/${selectedRequest.repoName}`)}
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                            <div className="">
                                                <div className="font-semibold text-xs mb-1 text-gray-700 dark:text-gray-200">Checkout this PR branch:</div>
                                                <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 mb-2 select-all flex items-center gap-2">
                                                    <span className="flex-1">{`git checkout ${selectedRequest.prBranch}`}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        type="button"
                                                        onClick={() => navigator.clipboard.writeText(`git checkout ${selectedRequest.prBranch}`)}
                                                    >
                                                        <CopyIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center gap-2 my-2">
                                                    <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
                                                    <span className="font-semibold text-xs text-gray-700 dark:text-gray-200 px-2">or</span>
                                                    <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
                                                </div>
                                                <Button
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mt-2"
                                                    onClick={() => {
                                                        setCodePopoverOpen(false)
                                                        window.open(`x-github-client://openRepo/https://github.com/${PROJECT_REPO_OWNER}/${selectedRequest.repoName}?branch=${selectedRequest.prBranch}`)
                                                    }}
                                                >
                                                    Open PR with GitHub Desktop
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-800 dark:text-gray-200">No project selected.</div>
                                    )}
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="flex-grow">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <Editor
                                height="100%"
                                language={getLanguage(activeFile?.path)}
                                value={editorContent}
                                theme="vs-dark"
                                onMount={handleEditorDidMount}
                                onChange={(value) => {
                                    setEditorContent(value || '');
                                    setIsModified(true);
                                }}
                                options={{
                                    selectOnLineNumbers: true,
                                    automaticLayout: true,
                                    minimap: { enabled: true },
                                    wordWrap: 'on',
                                }}
                            />
                        )}
                    </div>
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

export default CodeStudio;
