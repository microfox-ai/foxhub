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
import { Usage } from "@microfox/usage-tracker";
import { Package } from "../message/types";
import { UsageWithPricing } from "@microfox/usage-pricing";

dayjs.extend(relativeTime);

interface ThirdPartyHistoryResponse {
    results: (UsageWithPricing & { packageInfo: Package })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const ThirdPartyHistoryTab = () => {
    const { selectedRequest } = useClientProject();
    const [page, setPage] = useState(1);

    const { data: history, error, isLoading, mutate } = useSWR<ThirdPartyHistoryResponse>(
        selectedRequest?.id ? `/api/client-functions/history/third-party?page=${page}&pageSize=30&clientRequestId=${selectedRequest?.id}` : null,
        (url) => fetch(url).then(res => res.json()) as Promise<ThirdPartyHistoryResponse>,
        {
            revalidateOnFocus: false,
        }
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        mutate();
    };

    if (!selectedRequest) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a request to view third-party API history</p>
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
                <h2 className="text-lg font-semibold">Third-Party API Usage History</h2>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Total API Calls: {history?.total || 0}
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
                            <TableHead>Package</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Basics</TableHead>
                            <TableHead>Usage 1</TableHead>
                            <TableHead>Usage 2</TableHead>
                            <TableHead>Cost (USD)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history?.results?.length ? (
                            history.results.map((usage, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">
                                        {dayjs(usage.timestamp).fromNow()}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {usage.packageInfo ? (
                                            <div className="flex items-center gap-2">
                                                <img src={usage.packageInfo?.icon} alt={usage.packageInfo?.name} width={16} height={16} />
                                                <span>{usage.packageInfo?.title}</span>
                                            </div>) : <span>{usage.package}</span>}
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                            {usage.type === 'llm' ? 'AI Model' : 'API Service'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-muted-foreground">
                                                {usage.type === 'llm' ? 'Model Name' : 'Request Key'}
                                            </div>
                                            <div>
                                                {usage.type === 'llm' ? (usage.model || 'N/A') : (usage.requestKey || 'N/A')}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-muted-foreground">
                                                {usage.type === 'llm' ? 'Token Counts' : 'Request Count'}
                                            </div>
                                            {usage.type === 'llm' ? (
                                                <div className="space-y-0.5 flex fl">
                                                    <div>Prompt: {usage.promptTokens}</div>
                                                </div>
                                            ) : (
                                                <div>{usage.requestCount}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-muted-foreground">
                                                {usage.type === 'llm' ? 'Total Tokens' : 'Request Data'}
                                            </div>
                                            {usage.type === 'llm' ? (
                                                <div> Completion: {usage.completionTokens}</div>
                                            ) : (
                                                <div>{usage.requestData || 'N/A'}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>${usage.priceUSD?.toFixed(8) || '0.00000000'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No third-party API usage history found
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
                    Page {page} of {history?.totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === (history?.totalPages || 1) || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}; 