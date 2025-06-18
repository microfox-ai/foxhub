import { Bot, Clock, Database, ChevronRight, Share2, Code, GitBranch, FileText, Repeat, FileJson, MessageCircleQuestionIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskInstanceMetaType, TaskLambdaFunction, TaskCronJob, TaskDBSchema } from "@/server/convertfox/types";
import DiscordIcon from "@/components/ui/icons/discord";
import GitHubIcon from "@/components/ui/icons/github";
import { Package } from "../types";
import { PackageStatus } from "@/server/types";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import cronstrue from "cronstrue";

interface TaskStructureProdProps {
    object: TaskInstanceMetaType["taskStructure"];
    taskIntegrations: TaskInstanceMetaType["taskIntegrations"];
}

const Section = ({ icon, title, children, count }: { icon: React.ReactNode, title: string, children: React.ReactNode, count: number }) => (
    <div className={cn("rounded-lg bg-white/50", { "opacity-50": count === 0 })}>
        <div className="flex items-center justify-between px-2 py-1 bg-white/80 rounded-t-lg">
            <div className="flex items-center gap-3">
                <h5 className="font-semibold text-gray-800 text-sm">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>{title}</h5>
            </div>
        </div>
        {count > 0 && (
            <div className="px-3">
                {children}
            </div>
        )}
    </div>
);

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-start gap-2 text-gray-600 text-sm">
        <div className="w-5 h-5 text-gray-400 mt-0.5">{icon}</div>
        <div className="flex flex-col">
            <span className="font-semibold text-gray-800">{label}</span>
            <span className="font-mono rounded px-1.5 py-0.5 text-xs">{value}</span>
        </div>
    </div>
);

const WebhookPopoverContent = ({ item }: { item: TaskLambdaFunction }) => (
    <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
        <DetailItem icon={<Code className="w-4 h-4" />} label={item.method} value={item.path} />
        <DetailItem icon={<MessageCircleQuestionIcon className="w-4 h-4" />} label="What it does" value={item.endResult} />
    </div>
);

const CronPopoverContent = ({ item }: { item: TaskCronJob }) => (
    <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
        <DetailItem icon={<Repeat className="w-4 h-4" />} label="Schedule" value={cronstrue.toString(item.cronExpression)} />
        <DetailItem icon={<FileText className="w-4 h-4" />} label="What it does" value={item.endResult} />
    </div>
);

const DbSchemaPopoverContent = ({ item }: { item: TaskDBSchema }) => (
    <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{item.modelName}</h3>
        <div className="flex items-start gap-2 text-gray-600 text-sm">
            <div className="w-5 h-5 text-gray-400 mt-0.5"><FileJson className="w-4 h-4" /></div>
            <div className="flex flex-col">
                <span className="font-semibold text-gray-800">Schema</span>
                <pre className="font-mono bg-gray-100 rounded px-1.5 py-0.5 text-xs max-h-40 overflow-auto">
                    {JSON.stringify(item.jsonSchema, null, 2)}
                </pre>
            </div>
        </div>
    </div>
);

const ListItem = ({ children, popoverContent }: { children: React.ReactNode, popoverContent: React.ReactNode }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center gap-2 text-gray-700 text-sm py-1 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors duration-150">
                <span className="truncate">{children}</span>
            </div>
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-80 bg-white rounded-lg shadow-2xl p-4 z-10 border border-gray-100"
                    >
                        {popoverContent}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const TaskStructureProd = ({ object, taskIntegrations }: TaskStructureProdProps) => {
    const { lambdaFunctions: webhooks = [], cronJobs: crons = [], dbSchemas: dbSchemas = [] } = object || {};
    const platforms = taskIntegrations?.platforms || [];

    const { data: packagesData, mutate: mutatePackages } = useSWR<Package[]>(
        `/api/packages/infos?packageNames=${platforms.map((platform) => platform.package).join(",")}`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        },
        {
            revalidateOnFocus: false,
        }
    );

    return (
        <div className="relative min-w-[400px]">
            <div className="space-y-1">
                <Section icon={<Bot className="w-5 h-5 text-blue-600" />} title="AI Tools" count={webhooks.length}>
                    <div className="flex flex-col">
                        {webhooks.map((webhook, index) => (
                            <ListItem key={`webhook-${index}`} popoverContent={<WebhookPopoverContent item={webhook} />}>
                                {webhook.name}
                            </ListItem>
                        ))}
                    </div>
                </Section>

                <Section icon={<Clock className="w-5 h-5 text-green-600" />} title="Background Tasks" count={crons.length}>
                    <div className="flex flex-col">
                        {crons.map((cron, index) => (
                            <ListItem key={`cron-${index}`} popoverContent={<CronPopoverContent item={cron} />}>
                                {cron.name}
                            </ListItem>
                        ))}
                    </div>
                </Section>

                <Section icon={<Database className="w-5 h-5 text-purple-600" />} title="Data" count={dbSchemas.length}>
                    <div className="flex flex-col">
                        {dbSchemas.map((dbSchema, index) => (
                            <ListItem key={`dbSchema-${index}`} popoverContent={<DbSchemaPopoverContent item={dbSchema} />}>
                                {dbSchema.modelName}
                            </ListItem>
                        ))}
                    </div>
                </Section>
            </div>
            {platforms.length > 0 && (
                <div className="absolute top-0 right-0 mr-4 space-y-2">
                    {packagesData?.map((platform: Package, index) => (
                        <div className="bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow duration-200">
                            <img src={platform?.icon} alt={platform.name} className="w-5 h-5" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
