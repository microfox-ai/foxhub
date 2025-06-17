import { constructAppendBody } from "../messageHelpers";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";
import { constructMessageFromButton } from "../messageHelpers";
import { EnvCollector } from "./EnvCollector";
import { TaskIntegrations } from "./TaskIntegrations";
import { DEPLOY_STAGE } from "@prisma/client";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
    envVariablesCollect?: any[];
}

interface TaskIntegrationsProps {
    uiAnnotation: UIAnnotation;
    idx: number;
}

export const InstallSetup = ({
    uiAnnotation,
    idx,
}: TaskIntegrationsProps) => {

    const { append } = useMicrofoxChat();
    const deployToProduction = () => {
        console.log("deployToProduction");
        append(
            constructMessageFromButton(
                {
                    text: "Deploy to Production !",
                    minionType: "deployfox",
                },
                [
                    {
                        type: "attachment",
                        key: "stage",
                        value: DEPLOY_STAGE.PROD,
                    },
                    {
                        type: "attachment",
                        key: "is_local",
                        value: false,
                    },
                ]
            ),
            constructAppendBody("deployfox", {
                stage: DEPLOY_STAGE.PROD,
                is_local: false,
            })
        );
    };

    return (
        <motion.div
            key={uiAnnotation.objectType + idx}
            className={`flex flex-col gap-6 bg-white rounded-xl p-4 my-4 border border-gray-100 shadow-lg`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="">
                <h3 className="text-lg font-semibold text-gray-900">
                    Configure & Connect your Apps
                </h3>
                <p className="text-sm text-gray-500">
                    {uiAnnotation.text}
                </p>
            </div>

            {uiAnnotation.object?.platforms &&
                <TaskIntegrations
                    uiAnnotation={uiAnnotation}
                    idx={idx}
                    hideMetaInfo={true}
                />}
            {uiAnnotation?.envVariablesCollect && uiAnnotation?.envVariablesCollect?.length > 0 &&
                (<EnvCollector
                    uiAnnotation={uiAnnotation}
                    idx={idx}
                    hideMetaInfo={true}
                />
                )}
            <div className="flex justify-start items-center gap-2">
                <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-white hover:text-blue-700 hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
                    onClick={deployToProduction}
                >
                    <Rocket className="w-4 h-4" />
                    Deploy to Production
                </Button>
            </div>
        </motion.div>
    )
}