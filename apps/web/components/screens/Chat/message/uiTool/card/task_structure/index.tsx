import { motion } from "framer-motion";
import { CheckCircle, Clock, FileText, GitFork, Info, PackageIcon, Target, ChevronDown, ChevronRight, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { codeTemplateType, TaskInstanceMetaType } from "@/server/convertfox/helpers/types";
import { ActionButtons } from "../../buttons_list/ActionButtons";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useTaskInstanceMetaContext } from "@/components/screens/providers/TaskInstanceMetaProvider";
import { EditTaskStructureDialog } from "./components/EditTaskStructureDialog";
import { Button } from "@/components/ui/button";
import { TaskStructureDev } from "./components/TaskStructureDev";
import { IN_STAGING } from "@/utils/constants/appInfo";
import { TaskStructureProd } from "./components/TaskStructureProd";
import { UiComponentProps } from "@/components/screens/Chat/message/uiTool/mappers/UiComponentProps";

type TaskStructureProps = Omit<UiComponentProps["card"], "uiType"> & {
    isLastInQueue?: boolean;
    lastMessage?: boolean;
}

export const TaskStructure = ({
    object: taskStructure,
    text,
    buttons,
    isLastInQueue = true,
    lastMessage,
}: TaskStructureProps) => {
    const { taskInstanceMeta, updateTaskInstanceMeta } = useTaskInstanceMetaContext();
    const object = taskStructure?.object as TaskInstanceMetaType["taskStructure"];
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSaveTaskStructure = async (updatedStructure: TaskInstanceMetaType["taskStructure"]) => {
        if (taskInstanceMeta) {
            await updateTaskInstanceMeta({
                ...taskInstanceMeta,
                taskStructure: updatedStructure
            });
        }
    };

    const { taskIntegrations } = taskInstanceMeta || {};

    if (!isLastInQueue && !isExpanded) {
        return (
            <motion.div
                className="flex flex-col gap-2 p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                <p className="text-sm text-gray-500">
                    This task structure is deprecated & modified. Please refer to the latest message to check or modify.
                </p>
                <Button
                    variant="link"
                    onClick={() => setIsExpanded(true)}
                    className="text-sm p-0 h-auto self-start"
                >
                    Show Previous
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="flex flex-col gap-4 p-3 py-4 bg-white shadow-lg my-4 rounded-xl border border-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex justify-between items-start p-3 border-b border-gray-100 ">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {text}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Review and manage your Task
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isLastInQueue && (
                        <Button variant="link" onClick={() => setIsExpanded(false)}>
                            Hide
                        </Button>
                    )}
                </div>
            </div>

            <TaskStructureProd object={object} taskIntegrations={taskIntegrations} />
            {/* {IN_STAGING ? <TaskStructureDev object={object} /> : <TaskStructureProd object={object} taskIntegrations={taskIntegrations} />} */}

            <EditTaskStructureDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                taskStructure={object}
                onSave={handleSaveTaskStructure}
            />
            <div className="flex justify-start items-center gap-2">

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="flex items-center gap-2"
                    disabled={!isLastInQueue}
                >
                    <Edit className="w-4 h-4" />
                    Edit Structure
                </Button>
                <ActionButtons className="mt-0" buttons={buttons ?? []} disabled={!isLastInQueue} lastMessage={lastMessage} />
            </div>
        </motion.div>
    );
}; 