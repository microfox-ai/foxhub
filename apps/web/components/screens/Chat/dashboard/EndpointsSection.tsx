import { Loader2, XCircle, Package, Split } from "lucide-react";
import { HttpMethod } from "../../PreviewWindow/types";
import { EndpointList } from "./EndpointList";

interface EndpointsSectionProps {
    endpoints: Array<{
        path: string;
        method: HttpMethod;
        title: string;
        operationId?: string;
    }>;
    isLoading: boolean;
    error: Error | null;
    onEndpointClick: (endpoint: { path: string; method: HttpMethod }) => void;
}

export const EndpointsSection = ({
    endpoints,
    isLoading,
    error,
    onEndpointClick,
}: EndpointsSectionProps) => {
    return (
        <div className=" ">
            <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        API Endpoints
                    </h3>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <span className="text-sm text-gray-500">
                    {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}{" "}
                    available
                </span>
            </div>

            {isLoading ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                        <p className="text-sm text-gray-500">Loading endpoints...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex flex-col items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-red-800">
                                Failed to load endpoints
                            </h4>
                            <p className="text-xs text-red-600">{error.message}</p>
                        </div>
                    </div>
                </div>
            ) : endpoints.length > 0 ? (
                <EndpointList
                    endpoints={endpoints}
                    onEndpointClick={onEndpointClick}
                />
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-gray-100 rounded-full">
                            <Package className="w-6 h-6 text-gray-500" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-800">
                            No Endpoints Available
                        </h4>
                        <p className="text-gray-500 max-w-md">
                            This API doesn&apos;t have any endpoints configured yet.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}; 