import { motion } from "framer-motion";
import { CheckCircle, Clock, FileText, GitFork, Info, PackageIcon, Target, ChevronDown, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { codeTemplateType, TaskInstanceMetaType } from "@/server/convertfox/types";
import { ActionButtons } from "./ActionButtons";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

interface TaskStructureProps {
    uiAnnotation: UIAnnotation;
    idx: number;
}

export const TaskStructure = ({
    uiAnnotation,
    idx,
}: TaskStructureProps) => {
    const object = uiAnnotation.object as TaskInstanceMetaType["taskStructure"];
    const [selectedBrief, setSelectedBrief] = useState<{ title: string; content: string } | null>(null);
    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

    const toggleSchema = (modelName: string) => {
        setExpandedSchemas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(modelName)) {
                newSet.delete(modelName);
            } else {
                newSet.add(modelName);
            }
            return newSet;
        });
    };

    return (
        <motion.div
            key={uiAnnotation.objectType + idx}
            className="flex flex-col gap-4 p-3 py-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="">
                <h3 className="text-lg font-semibold text-gray-900">
                    {uiAnnotation.text}
                </h3>
                <p className="text-sm text-gray-500">
                    Review and manage your task&apos;s components
                </p>
            </div>

            {object && (
                <Tabs
                    defaultValue={
                        object.lambdaFunctions && object.lambdaFunctions.length > 0
                            ? "lambdaFunctions"
                            : object.cronJobs && object.cronJobs.length > 0
                                ? "cronJobs"
                                : object.dbSchemas && object.dbSchemas.length > 0
                                    ? "schemas"
                                    : undefined
                    }
                    className="w-full"
                >
                    <TabsList
                        className="grid gap-2 justify-start items-center bg-gray-50/50 p-1 rounded-lg"
                        style={{
                            gridTemplateColumns: `repeat(${(object.lambdaFunctions && object.lambdaFunctions.length > 0
                                ? 1
                                : 0) +
                                (object.cronJobs && object.cronJobs.length > 0 ? 1 : 0) +
                                (object.dbSchemas && object.dbSchemas.length > 0 ? 1 : 0)
                                }, minmax(0, 1fr))`,
                        }}
                    >
                        {object.lambdaFunctions && object.lambdaFunctions.length > 0 && (
                            <TabsTrigger
                                value="lambdaFunctions"
                                className="data-[state=active]:bg-white !px-2"
                            >
                                <PackageIcon className="w-4 h-4" />
                                Webhooks
                            </TabsTrigger>
                        )}
                        {object.cronJobs && object.cronJobs.length > 0 && (
                            <TabsTrigger
                                value="cronJobs"
                                className="data-[state=active]:bg-white !px-2"
                            >
                                <GitFork className="w-4 h-4" />
                                Scheduled-Jobs
                            </TabsTrigger>
                        )}
                        {object.dbSchemas && object.dbSchemas.length > 0 && (
                            <TabsTrigger
                                value="schemas"
                                className="data-[state=active]:bg-white !px-2"
                            >
                                <FileText className="w-4 h-4" />
                                Datatstore
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {object.dbSchemas && object.dbSchemas.length > 0 && (
                        <TabsContent value="schemas" className="mt-4">
                            <div className="grid gap-4">
                                {object.dbSchemas.map((schema) => (
                                    <div
                                        key={schema.modelName}
                                        className="bg-gray-50 rounded-lg p-4 space-y-2 w-full"
                                    >
                                        <div
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => toggleSchema(schema.modelName)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {expandedSchemas.has(schema.modelName) ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                                )}
                                                <span className="font-medium text-sm text-gray-900">
                                                    {schema.modelName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <button
                                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedBrief({
                                                                    title: schema.modelName,
                                                                    content: `Database schema for ${schema.modelName}`
                                                                });
                                                            }}
                                                        >
                                                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                                        </button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle>{selectedBrief?.title}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="mt-4">
                                                            <p className="text-sm text-gray-600">{selectedBrief?.content}</p>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                    Schema
                                                </span>
                                            </div>
                                        </div>
                                        {expandedSchemas.has(schema.modelName) && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <pre className="text-xs bg-white p-3 rounded-md border overflow-x-auto w-full max-w-[350px]">
                                                    {JSON.stringify(schema.jsonSchema, null, 2)}
                                                </pre>
                                            </motion.div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    )}

                    {object.lambdaFunctions && object.lambdaFunctions.length > 0 && (
                        <TabsContent value="lambdaFunctions" className="mt-4">
                            <div className="grid gap-4">
                                {object.lambdaFunctions.map((fn) => (
                                    <div
                                        key={fn.name}
                                        className="bg-gray-50 rounded-lg p-4 space-y-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">
                                                    {fn.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button
                                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                                                onClick={() => setSelectedBrief({
                                                                    title: fn.name,
                                                                    content: fn.brief || fn.description
                                                                })}
                                                            >
                                                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>{selectedBrief?.title}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="mt-4">
                                                                <p className="text-sm text-gray-600">{selectedBrief?.content}</p>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <span
                                                        className={cn(
                                                            "text-xs px-2 py-1 rounded-full font-bold font-mono",
                                                            fn.method === "GET" && "bg-blue-100 text-blue-700",
                                                            fn.method === "POST" &&
                                                            "bg-green-100 text-green-700",
                                                            fn.method === "PUT" &&
                                                            "bg-amber-100 text-amber-700",
                                                            fn.method === "DELETE" && "bg-red-100 text-red-700"
                                                        )}
                                                    >
                                                        {fn.method}
                                                    </span>
                                                </div>
                                            </div>
                                            <pre className="text-xs flex items-center text-gray-600 bg-gray-100 px-1 rounded-md border w-fit">
                                                {fn.path}
                                            </pre>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="space-y-2">
                                            <div className="flex gap-2 items-start">
                                                <Target className="w-4 h-4 mt-1 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {fn.description}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 items-start">
                                                <CheckCircle className="w-4 h-4 mt-1 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {fn.endResult}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    )}

                    {object.cronJobs && object.cronJobs.length > 0 && (
                        <TabsContent value="cronJobs" className="mt-4">
                            <div className="grid gap-4">
                                {object.cronJobs.map((job) => (
                                    <div
                                        key={job.name}
                                        className="bg-gray-50 rounded-lg p-4 space-y-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">
                                                    {job.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button
                                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                                                onClick={() => setSelectedBrief({
                                                                    title: job.name,
                                                                    content: job.brief || job.description
                                                                })}
                                                            >
                                                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>{selectedBrief?.title}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="mt-4">
                                                                <p className="text-sm text-gray-600">{selectedBrief?.content}</p>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                                        Scheduled
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Clock className="w-4 h-4 mr-2 opacity-50" />
                                                {job.cronExpression}
                                            </div>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="space-y-2">
                                            <div className="flex gap-2 items-start">
                                                <div className="">
                                                    <Target className="w-4 h-4 mt-1 text-gray-400" />
                                                </div>
                                                <span className="text-sm text-gray-600">
                                                    {job.description}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 items-start">
                                                <CheckCircle className="w-4 h-4 mt-1 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {job.endResult}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            )}
            <ActionButtons buttons={uiAnnotation.buttons} />
        </motion.div>
    );
}; 