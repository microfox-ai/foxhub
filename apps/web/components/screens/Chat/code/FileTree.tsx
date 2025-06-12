import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    ChevronDown,
    FolderIcon,
    FileText,
    FileCode,
    FileJson,
    FileImage,
    FileIcon,
} from 'lucide-react';

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
    originalFilePath?: string;
}

interface FileTreeProps {
    files: BuildFile[];
    onFileSelect: (file: FileTreeNode) => void;
    additionalFiles?: FileTreeNode[];
    showTitle?: boolean;
    allChildrenCollapsed?: boolean;
    className?: string;
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

export const buildFileTree = (files: BuildFile[]): FileTreeNode[] => {
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
                    originalFilePath: file.filePath,
                };
                currentNode.children = currentNode.children || [];
                currentNode.children.push(newNode);
                currentNode = newNode;
            }
        });
    });
    return root.children || [];
};

const FileTreeItem: React.FC<{
    node: FileTreeNode;
    onFileSelect: (file: FileTreeNode) => void;
    level?: number;
    allChildrenCollapsed?: boolean;
}> = ({ node, onFileSelect, level = 0, allChildrenCollapsed = false }) => {
    const [isOpen, setIsOpen] = useState(!allChildrenCollapsed);

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
                        <FileTreeItem key={child.id} node={child} onFileSelect={onFileSelect} level={level + 1} allChildrenCollapsed={allChildrenCollapsed} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({
    files,
    onFileSelect,
    additionalFiles = [],
    showTitle = true,
    allChildrenCollapsed = false,
    className = ''
}) => {
    const fileTree = useMemo(() => buildFileTree(files), [files]);

    // Sort root level items: folders first, then files alphabetically
    const sortedFileTree = useMemo(() => {
        return [...fileTree].sort((a, b) => {
            if (a.isFolder !== b.isFolder) {
                return a.isFolder ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [fileTree]);

    return (
        <div className={cn("h-full overflow-y-auto bg-black", className)}>
            {showTitle && <h2 className="text-lg font-semibold mb-2 text-gray-200">Files</h2>}
            {sortedFileTree.length > 0 ? (
                sortedFileTree.map(node => (
                    <FileTreeItem
                        key={node.id}
                        node={node}
                        onFileSelect={onFileSelect}
                        allChildrenCollapsed={allChildrenCollapsed}
                    />
                ))
            ) : (
                <p className="text-sm text-gray-500">No files available.</p>
            )}
            {additionalFiles.map(file => (
                <FileTreeItem
                    key={file.id}
                    node={file}
                    onFileSelect={onFileSelect}
                    allChildrenCollapsed={allChildrenCollapsed}
                />
            ))}
        </div>
    );
};

export type { FileTreeNode, BuildFile }; 