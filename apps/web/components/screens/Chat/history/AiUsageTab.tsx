import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { useState } from "react";
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
import { usageAnalyticsWithPrice } from "@/utils/services/billing/ai-usage";

dayjs.extend(relativeTime);


interface AiUsageAnalyticsResponse {
    results: usageAnalyticsWithPrice[]; // usageAnalytics from prisma
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const AiUsageTab = () => {
    const { selectedRequest } = useClientProject();
    const [page, setPage] = useState(1);

    const { data: analytics, error, isLoading, mutate } = useSWR<AiUsageAnalyticsResponse>(
        selectedRequest?.id ? `/api/client-functions/history/ai?page=${page}&pageSize=30&clientRequestId=${selectedRequest?.id}&userId=${selectedRequest?.userId}` : null,
        (url) => fetch(url).then(res => res.json()) as Promise<AiUsageAnalyticsResponse>,
        {
            revalidateOnFocus: false,
        }
    );

    console.log("analytics", analytics);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        mutate();
    };

    if (!selectedRequest) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a request to view AI usage analytics</p>
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

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">AI Usage Analytics</h2>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Total AI Requests: {analytics?.total || 0}
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
                            <TableHead>Model</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Prompt Tokens</TableHead>
                            <TableHead>Completion Tokens</TableHead>
                            <TableHead>Total Tokens</TableHead>
                            <TableHead>Cost (USD)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics?.results?.length ? (
                            analytics.results.map((usage, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">
                                        {(() => {
                                            const now = dayjs();
                                            const diff = now.diff(usage.updatedAt, 'day');
                                            const hours = now.diff(usage.updatedAt, 'hour') % 24;
                                            return `${diff} days, ${hours} hrs ago`;
                                        })()}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={usage.logoUrl}
                                                alt={usage.matchId}
                                                width={16}
                                                height={16}
                                                className="rounded"
                                            />
                                            <span>{usage.model}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            AI Model
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {usage.promptTokens || 0}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {usage.completionTokens || 0}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {(usage.promptTokens || 0) + (usage.completionTokens || 0)}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        ${usage.priceUSD?.toFixed(8) || '0.00000000'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No AI usage analytics found
                                </TableCell>
                            </TableRow>
                        )}
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
                    Page {page} of {analytics?.totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === (analytics?.totalPages || 1) || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};
