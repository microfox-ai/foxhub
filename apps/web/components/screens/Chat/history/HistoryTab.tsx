import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Loader2 } from "lucide-react";

dayjs.extend(relativeTime);

interface LambdaInvocation {
    requestId: string;
    timestamp: number;
    duration: number;
    billedDuration: number;
    memorySize: number;
    maxMemoryUsed: number;
    initDuration: number;
    endTimestamp?: number;
    additionalLogs: string[];
    functionName: string;
    endpointPath?: string;
    httpMethod?: string;
}

interface HistoryResponse {
    invocations: LambdaInvocation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const HistoryTab = () => {
    const { selectedRequest } = useClientProject();
    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async (page: number = 1) => {
        if (!selectedRequest?.id) return;

        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/client-functions/history", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clientRequestId: selectedRequest.id,
                    page,
                    pageSize: 30,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch history");
            }

            const data = await response.json();
            setHistory(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedRequest?.id) {
            fetchHistory();
        }
    }, [selectedRequest?.id]);

    if (!selectedRequest) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a request to view history</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!history?.invocations.length) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No invocation history found</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Lambda Invocation History</h2>
                <div className="text-sm text-muted-foreground">
                    Total Invocations: {history.total}
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Function</TableHead>
                            <TableHead>Endpoint</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Memory Used</TableHead>
                            <TableHead>Memory Size</TableHead>
                            <TableHead>Init Duration</TableHead>
                            <TableHead>Request ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.invocations.map((invocation) => (
                            <TableRow key={invocation.requestId}>
                                <TableCell>
                                    {dayjs(invocation.timestamp).fromNow()}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                    {invocation.functionName}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                    {invocation.httpMethod && invocation.endpointPath ? (
                                        <span className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                {invocation.httpMethod}
                                            </span>
                                            {invocation.endpointPath}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>{invocation.duration.toFixed(2)} ms</TableCell>
                                <TableCell>{invocation.maxMemoryUsed} MB</TableCell>
                                <TableCell>{invocation.memorySize} MB</TableCell>
                                <TableCell>{invocation.initDuration.toFixed(2)} ms</TableCell>
                                <TableCell className="font-mono text-xs">
                                    {invocation.requestId}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-center gap-2">
                <Button
                    variant="outline"
                    onClick={() => fetchHistory(history.page - 1)}
                    disabled={history.page === 1 || loading}
                >
                    Previous
                </Button>
                <span className="flex items-center px-4">
                    Page {history.page} of {history.totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => fetchHistory(history.page + 1)}
                    disabled={history.page === history.totalPages || loading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};