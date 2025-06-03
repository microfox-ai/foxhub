import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMethodColor } from "../../PreviewWindow/utils";
import { HttpMethod } from "@/utils/services/OpenAPIToolsClient";

interface EndpointCardProps {
    endpoint: {
        path: string;
        method: HttpMethod;
        title: string;
        operationId?: string;
        operation?: any;
    };
    onClick: () => void;
}

export const EndpointCard = ({
    endpoint,
    onClick,
}: EndpointCardProps) => {
    const method = endpoint.operation?.schedule?.includes("cron") ? "CRON" : endpoint.method;
    return (
        <div
            onClick={onClick}
            className="group w-full flex items-start p-2 gap-2 rounded-sm bg-white cursor-pointer"
        >
            <div
                className={cn(
                    "px-2 flex items-center justify-center rounded-sm text-center w-fit",
                    getMethodColor(method)
                )}
            >
                <span
                    className={cn(
                        "font-mono text-xs font-bold",
                        getMethodColor(method)
                    )}
                >
                    {method}
                </span>
            </div>
            <div className="col-span-2 flex items-center justify-between w-full">
                <h3 className="text-sm font-medium text-gray-500 group-hover:text-gray-900">
                    {endpoint.title || endpoint.operationId || endpoint?.operation?.title || "Untitled Endpoint"}
                </h3>
                <ArrowRight className="w-4 h-4 justify-self-end text-gray-400 group-hover:text-gray-600 transition-all group-hover:translate-x-1" />
            </div>
        </div>
    );
}; 