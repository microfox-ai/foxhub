import { UsageReportMetadata } from "@/utils/services/billing/third-party-usage";
import { UsageAnalytics, UsageReport } from "@prisma/client";
import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { convertBytes, convertSecondsToMinutes, formatNumberToCurrency, formatNumberToShort } from "@/utils/helpers/prettyprint";
import { TimerIcon } from "lucide-react";
import { UsageWithPricing } from "@microfox/usage-pricing";
import { usageAnalyticsWithPrice } from "@/utils/services/billing/ai-usage";
import { LambdaInvocation } from "@/utils/services/aws/process-lambda-logs";

interface UsageBarProps {
    title: string;
    value: number | string;
    limit: number | string;
    barPercent: number; // 0 to 1
    barColors?: { fill?: string; background?: string };
    labels: { color: string; label: string; value: number | string }[];
    action?: React.ReactNode;
}

export const UsageBar: React.FC<UsageBarProps> = ({
    title,
    value,
    limit,
    barPercent,
    barColors,
    labels,
    action,
}) => (
    <div className="flex flex-col col-span-1 p-4 border border-gray-200 rounded-xl bg-white">
        <div className="text-muted-foreground text-xs font-semibold">{title}</div>
        <div className="flex items-end gap-1 mt-1">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-muted-foreground text-sm"> {limit}</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded mt-2 mb-2 overflow-hidden" style={{ background: barColors?.background ?? "#e5e7eb" }}>
            <div
                className="h-full rounded transition-all duration-300"
                style={{
                    width: `${Math.min(barPercent * 100, 100)}%`,
                    background: barColors?.fill ?? "linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)",
                }}
            />
        </div>
        <div className="flex flex-col justify-start text-xs mb-2 overflow-hidden group-hover:h-[50px] transition-all duration-300 h-0">
            {labels.map((l) => (
                <div key={l.label} className="flex items-center justify-start gap-1">
                    <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: l.color }}
                    />
                    <span className="text-muted-foreground transition-colors">{l.label}</span>
                    <span className="ml-auto font-semibold transition-transform">{l.value}</span>
                </div>
            ))}
        </div>
        {action && <div className="mt-auto">{action}</div>}
    </div>
);

export default function UsageReportbar({ requestId }: { requestId: string }) {
    const [dateKey, setDateKey] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: usageReport, error, isLoading, mutate } = useSWR<UsageReport>(
        `/api/billing/usage/request?requestId=${requestId}&date=${dateKey}`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch usage report');
            return res.json();
        },
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
        }
    );

    useEffect(() => {
        if (usageReport?.updatedAt) {
            const reportAge = dayjs().diff(dayjs(usageReport.updatedAt), 'hour');
            if (reportAge >= 1) {
                handleGenerateReport();
            }
        }
    }, [usageReport?.updatedAt]);

    const handleGenerateReport = async () => {
        try {
            setIsGenerating(true);
            const response = await fetch(`/api/billing/usage/request`, {
                method: 'POST',
                body: JSON.stringify({ requestId, dateKey }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            await mutate();
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const usageReportMetadata = usageReport?.metadata as unknown as UsageReportMetadata;

    const usageLogs = usageReport?.usageLogs as unknown as {
        lambda: LambdaInvocation[];
        thirdParty: UsageWithPricing[];
        ai: usageAnalyticsWithPrice[];
    };

    // Generate last 7 days for the dropdown
    const dateOptions = Array.from({ length: 7 }, (_, i) => {
        const date = dayjs().subtract(i, 'day');
        return {
            value: date.format('YYYY-MM-DD'),
            label: date.format('MMM DD, YYYY')
        };
    });

    return (
        <div className="flex flex-col gap-4 bg-gray-50 rounded-xl px-4 py-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold pl-2 ">
                    <TimerIcon className="w-4 h-4 inline-block mr-2" />
                    Usage Statistics for {dayjs(dateKey).format("MMM DD, YYYY")}</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select value={dateKey} onValueChange={setDateKey}>
                            <SelectTrigger id="date-select" className="w-[180px]">
                                <SelectValue placeholder="Select date" />
                            </SelectTrigger>
                            <SelectContent>
                                {dateOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        variant="default"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Report'}
                    </Button>
                </div>
            </div>
            {isLoading ? (
                <div className="grid grid-cols-3 gap-4 py-2">
                    <Skeleton className="h-[200px] w-64" />
                    <Skeleton className="h-[200px] w-64" />
                    <Skeleton className="h-[200px] w-64" />
                </div>
            ) : (usageReportMetadata && usageReport) ? (
                <div className="grid grid-cols-3 gap-4 group">
                    <UsageBar
                        title="Total Cost"
                        value={"$" + usageReport?.priceUSD?.toFixed(6)}
                        limit={""}
                        barPercent={usageReportMetadata.lambda.totalPrice / usageReport.priceUSD}
                        barColors={{ fill: "#22c55e", background: "#3b82f6" }}
                        labels={[
                            { color: "#22c55e", label: "Compute Cost", value: formatNumberToCurrency(usageReportMetadata.lambda.totalPrice) },
                            { color: "#3b82f6", label: "Services Cost", value: formatNumberToCurrency(usageReportMetadata.thirdParty.totalPrice) },
                            { color: "#fbbf24", label: "AI Cost", value: formatNumberToCurrency(usageReportMetadata.ai.totalPrice) }
                        ]}
                    />
                    <UsageBar
                        title="Compute Time"
                        value={convertSecondsToMinutes(usageReportMetadata.lambda.totalComputeTime / 1000)?.toFixed(2)}
                        limit={"/ 100 Minutes"}
                        barPercent={usageReportMetadata.lambda.totalComputeTime / (100 * 60 * 1000)}
                        labels={[
                            { color: "#22c55e", label: "Cost", value: usageReportMetadata.lambda.totalPrice.toFixed(6) + " USD" },
                            { color: "#3b82f6", label: "Memory Used", value: convertBytes(usageReportMetadata.lambda.totalMemoryUsed, "MB", "GB").toFixed(2) + " GB" },
                            { color: "#3b82f6", label: "Invocations", value: usageReportMetadata.lambda.totalInvocations + " times" },
                        ]}
                    />
                    <UsageBar
                        title="Third-Party & AI"
                        value={`${formatNumberToShort(usageReportMetadata.thirdParty.totalInvocations + usageReportMetadata.ai.totalInvocations)}`}
                        limit={` / ${formatNumberToShort(1000)} Requests`}
                        barPercent={usageReportMetadata.thirdParty.totalInvocations / 1000}
                        labels={[
                            { color: "#fbbf24", label: "Internal AI Cost", value: usageReportMetadata.ai.totalPrice.toFixed(6) + " USD" },
                            { color: "#22c55e", label: "3rd Party Cost", value: usageReportMetadata.thirdParty.totalPrice.toFixed(6) + " USD" },
                            ...Object.entries(usageReportMetadata.thirdParty.typeBasedPricing).map(([key, value]) => ({
                                color: key === "llm" ? "#22c55e" : "#3b82f6",
                                label: key === "llm" ? "Ai Models" : "APIs",
                                value: formatNumberToCurrency(value as number),
                            }))
                        ]}
                    />
                </div>
            ) : <div className="h-[200px] w-full flex items-center justify-center">
                <p className="text-muted-foreground">No usage report found</p>
            </div>}
        </div>
    );
}


