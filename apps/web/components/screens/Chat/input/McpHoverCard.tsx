import { AgentInfo, AgentOpenApi } from "@microfox/types";
import { HoverCardContent } from "@/components/ui/hover-card";
import { Download, PencilIcon, TrashIcon, UploadIcon } from "lucide-react";
import { useMicrofoxChat } from "../MicrofoxChatProvider";

interface Operation {
    method: string;
    path: string;
    summary?: string;
    operationId?: string;
}

interface McpHoverCardContentProps {
    agentInfo: AgentInfo;
    paths?: AgentOpenApi["paths"];
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    className?: string;
}

const getOperations = (paths?: AgentOpenApi["paths"]): Operation[] => {
    if (!paths) return [];

    return Object.entries(paths).flatMap(([path, pathItem]) =>
        Object.entries(pathItem || {})
            .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase()))
            .map(([method, operation]) => ({
                method: method.toUpperCase(),
                path,
                summary: operation?.summary,
                operationId: operation?.operationId
            }))
    );
};

const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
        GET: 'bg-blue-100 text-blue-800',
        POST: 'bg-green-100 text-green-800',
        PUT: 'bg-yellow-100 text-yellow-800',
        DELETE: 'bg-red-100 text-red-800',
        PATCH: 'bg-purple-100 text-purple-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
};

export const McpHoverCardContent = ({
    agentInfo,
    paths,
    side = "right",
    align = "start",
    className = ""
}: McpHoverCardContentProps) => {
    const operations = getOperations(paths);
    const { setInput } = useMicrofoxChat();

    const handleOperationClick = (operationId: string) => {
        setInput(`use ${operationId} to `);
    };

    return (
        <HoverCardContent side={side} align={align} className={`w-96 ${className}`}>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    {agentInfo?.iconUrl && (
                        <img src={agentInfo.iconUrl} alt={agentInfo.title} className="w-8 h-8 rounded-full" />
                    )}
                    <div>
                        <h4 className="font-medium">{agentInfo?.title}</h4>
                        <p className="text-sm text-muted-foreground">{agentInfo?.status}</p>
                    </div>
                </div>
                {agentInfo?.description && (
                    <p className="text-sm text-muted-foreground">{agentInfo.description}</p>
                )}
                {agentInfo?.agentCard?.skills && agentInfo?.agentCard?.skills?.length > 0 && (
                    <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Capabilities:</p>
                        <div className="flex flex-wrap gap-1">
                            {agentInfo.agentCard.skills?.map((cap, idx: number) => (
                                <span key={idx} className="text-xs bg-secondary px-2 py-1 rounded-md">
                                    {cap.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {operations.length > 0 && (
                    <div className="mt-2">
                        <p className="text-sm font-medium mb-3">What can it do:</p>
                        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                            {operations.map((op, idx) => (
                                <button
                                    key={idx}
                                    className="flex items-center gap-1 text-xs text-left hover:bg-secondary/50 p-1 rounded transition-colors"
                                    onClick={() => op.operationId && handleOperationClick(op.operationId)}
                                >
                                    {/* <span className={`p-1 rounded font-medium`}>
                                        {op.method === "GET" ? <Download className="w-4 h-4" /> : op.method === "POST" ? <UploadIcon className="w-4 h-4" /> : op.method === "PUT" ? <PencilIcon className="w-4 h-4" /> : op.method === "DELETE" ? <TrashIcon className="w-4 h-4" /> : op.method === "PATCH" ? <PencilIcon className="w-4 h-4" /> : <span>{op.method}</span>}
                                    </span> */}
                                    <span className="font-mono bg-secondary px-2 py-0.5 rounded">
                                        {op.operationId}
                                    </span>
                                    {op.summary && (
                                        <span className="text-muted-foreground truncate" title={op.summary}>
                                            {op.summary}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </HoverCardContent>
    );
}; 