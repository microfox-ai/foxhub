import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FileText, Target, TextQuote, Edit } from "lucide-react";
import { useState } from "react";
import { ActionButtons } from "../../buttons_list/ActionButtons";
import { Markdown } from "../../../text/markdown";
import { useTaskInstanceMetaContext } from "@/components/screens/providers/TaskInstanceMetaProvider";
import { Button } from "@/components/ui/button";
import { EditTaskInfoDialog } from "./EditTaskInfoDialog";
import { TaskInstanceMetaType } from "@/server/convertfox/helpers/types";
import { UiComponentProps } from "@/server/ui/UiComponentProps";




type TaskInfoProps = Omit<UiComponentProps["card"], "uiType"> & {
    lastMessage?: boolean;
}

export const TaskInfo = ({
    text,
    buttons,
    object,
    lastMessage,
}: TaskInfoProps) => {
    const { taskInstanceMeta, updateTaskInstanceMeta } = useTaskInstanceMetaContext();
    const taskInfo = taskInstanceMeta?.taskInfo ?? object?.objectType === "task_info" ? object?.object as TaskInstanceMetaType["taskInfo"] : undefined;
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    //console.log("TaskInfo buttons", buttons);

    const handleSaveTaskInfo = async (updatedInfo: TaskInstanceMetaType["taskInfo"]) => {
        if (taskInstanceMeta) {
            await updateTaskInstanceMeta({
                ...taskInstanceMeta,
                taskInfo: updatedInfo
            });
        }
    };

    const getIconForKey = (key: string) => {
        switch (key.toLowerCase()) {
            case "goal":
                return <Target className="w-5 h-5 opacity-50 mt-1 text-blue-500" />;
            case "name":
                return (
                    <TextQuote className="w-5 h-5 opacity-50 mt-1 text-purple-500" />
                );
            case "summary":
                return <FileText className="w-5 h-5 opacity-50 mt-1 text-green-500" />;
            default:
                return null;
        }
    };

    return (
        <motion.div
            className="flex flex-col gap-4 p-4 bg-white shadow-lg my-0 rounded-xl border border-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-bold text-gray-700">
                    {taskInfo?.name}
                </h3>
            </div>
            <div className="space-y-4">
                {taskInfo && Object.keys(taskInfo).map((key: string) => {
                    const icon = getIconForKey(key);
                    if (key === "name") {
                        return null;
                    }
                    return (
                        <div key={key} className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                                {icon}
                                <span className="font-semibold text-base tracking-wide text-gray-700 capitalize">
                                    {key}
                                </span>
                            </div>
                            {key === "summary" ? (
                                <div className="flex flex-col gap-1" style={{
                                    fontFamily: "inherit",
                                    fontSize: "14px"
                                }}>
                                    {isExpanded ? (
                                        <div className="pl-7 text-sm text-gray-600">
                                            <Markdown>
                                                {taskInfo?.[key] || ""}
                                            </Markdown>
                                        </div>
                                    ) : (
                                        <span className="tracking-base pl-7 text-sm text-gray-600 line-clamp-2">
                                            {taskInfo?.[key]}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="pl-7 text-left text-sm text-blue-500 hover:text-blue-700 font-medium"
                                    >
                                        {isExpanded ? "Show less" : "Show more"}
                                    </button>
                                </div>
                            ) : (
                                <span className="tracking-base pl-7 text-sm text-gray-600">
                                    {taskInfo?.[key as keyof TaskInstanceMetaType["taskInfo"]] || ""}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-start gap-2 items-center">
                <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="flex items-center gap-2 mb-0"
                >
                    Edit Info
                </Button>
                <ActionButtons
                    className="my-0"
                    buttons={buttons ?? []}
                    lastMessage={lastMessage}
                />
            </div>
            <EditTaskInfoDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                taskInfo={taskInfo}
                onSave={handleSaveTaskInfo}
            />
        </motion.div>
    );
}; 