import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { useEffect, useState } from "react";
import useSWR from "swr";
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
import { Loader2, RefreshCw } from "lucide-react";
import { LambdaInvocation } from "@/utils/helpers/tracking/lambda";

dayjs.extend(relativeTime);



interface HistoryResponse {
    invocations: LambdaInvocation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const HistoryTab = () => {
    const { selectedRequest } = useClientProject();
    const [page, setPage] = useState(1);


    const { data: history, error, isLoading, mutate } = useSWR<HistoryResponse>(
        selectedRequest?.id ? `/api/client-functions/history?page=${page}&pageSize=30&clientRequestId=${selectedRequest?.id}` : null,
        (url) => fetch(url).then(res => res.json()) as Promise<HistoryResponse>,
        {
            revalidateOnFocus: true,
        }
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        mutate();
    };

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
                <p className="text-destructive">{error.message}</p>
            </div>
        );
    }

    if (isLoading) {
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
                <h2 className="text-lg font-semibold">Raw Serverless History</h2>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Total Invocations: {history.total}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            await mutate();
                            setPage(1);
                        }}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
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
                            <TableHead>Cost (USD)</TableHead>
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
                                <TableCell>{invocation.billedDuration.toFixed(2)} ms</TableCell>
                                <TableCell>{invocation.maxMemoryUsed} MB</TableCell>
                                <TableCell>{invocation.memorySize} MB</TableCell>
                                <TableCell>${invocation.costUSD.toFixed(6)}</TableCell>
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
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || isLoading}
                >
                    Previous
                </Button>
                <span className="flex items-center px-4">
                    Page {page} of {history.totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === history.totalPages || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};