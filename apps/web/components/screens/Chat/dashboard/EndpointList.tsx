import { HttpMethod } from "@/utils/services/OpenAPIToolsClient";
import { EndpointCard } from "./EndpointCard";

interface EndpointListProps {
    endpoints: Array<{
        path: string;
        method: HttpMethod;
        title: string;
        operationId?: string;
    }>;
    onEndpointClick: (endpoint: { path: string; method: HttpMethod }) => void;
}

export const EndpointList = ({
    endpoints,
    onEndpointClick,
}: EndpointListProps) => {
    // Group endpoints by their exact path pattern
    const groupedEndpoints = endpoints.reduce(
        (acc, endpoint) => {
            // Use the path as is for grouping, this will keep parameterized paths separate
            const pathPattern = endpoint.path;
            if (!acc[pathPattern]) {
                acc[pathPattern] = [];
            }
            acc[pathPattern].push(endpoint);
            return acc;
        },
        {} as Record<string, typeof endpoints>
    );

    // Sort paths so that base paths come before parameterized paths
    const sortedPaths = Object.keys(groupedEndpoints).sort((a, b) => {
        // Count segments and parameters as a sorting criteria
        const aSegments = a.split("/").length;
        const bSegments = b.split("/").length;
        const aParams = (a.match(/{[^}]+}/g) || []).length;
        const bParams = (b.match(/{[^}]+}/g) || []).length;

        if (aSegments !== bSegments) return aSegments - bSegments;
        if (aParams !== bParams) return aParams - bParams;
        return a.localeCompare(b);
    });


    return (
        <div className="space-y-2  ">
            {sortedPaths.map((path) => {
                const pathEndpoints = groupedEndpoints[path] || [];
                return (
                    <div key={path} className="space-y-3">
                        {/* <div className="flex items-center gap-2">
                            <h3 className="text-sm text-gray-400 font-mono">{path}</h3>
                            <div className="h-4 w-px bg-gray-200" />
                        </div> */}
                        <div className="grid gap-2 rounded-sm border border-gray-200 px-2 overflow-hidden py-2">
                            {pathEndpoints.map((endpoint) => (
                                <EndpointCard
                                    key={`${endpoint.path}-${endpoint.method}`}
                                    endpoint={endpoint}
                                    onClick={() => onEndpointClick(endpoint)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}; 