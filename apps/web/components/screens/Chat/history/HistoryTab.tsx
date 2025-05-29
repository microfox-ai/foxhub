import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LambdaHistoryTab } from "./LambdaHistoryTab";
import { ThirdPartyHistoryTab } from "./ThirdPartyHistoryTab";
import { AudioWaveformIcon, Cpu, ExternalLink, Server, Split } from "lucide-react";
import UsageReportbar from "./UsageReportbar";

export const HistoryTab = () => {
    const { selectedRequest } = useClientProject();

    if (!selectedRequest) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a request to view history</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center">
            <Tabs defaultValue="lambda" className="h-full w-full max-w-[1000px]">
                <UsageReportbar requestId={selectedRequest.id} />
                <TabsList className="h-fit p-1 bg-transparent mt-4">
                    <TabsTrigger value="lambda" className="flex flex-row items-center gap-1 py-3 px-3 ">
                        <Cpu className="h-24 w-24 text-green-500" />
                        <div className="flex flex-col items-start">
                            <span className="text-md font-medium">Compute Usage</span>
                            {/* <span className="text-[10px] text-muted-foreground">Serverless Functions, Database, etc.</span> */}
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="third-party" className="flex flex-row items-center gap-1 py-3">
                        <AudioWaveformIcon className="h-10 w-10 text-blue-500" />
                        <div className="flex flex-col items-start">
                            <span className="text- font-medium">Third-Party Usage</span>
                            {/* <span className="text-[10px] text-muted-foreground">AI Models, API Services, etc.</span> */}
                        </div>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="lambda" className="h-[calc(100%-80px)]">
                    <LambdaHistoryTab />
                </TabsContent>
                <TabsContent value="third-party" className="h-[calc(100%-80px)]">
                    <ThirdPartyHistoryTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};