import { constructAppendBody } from "../messageHelpers";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";
import { constructMessageFromButton } from "../messageHelpers";
import { EnvCollector } from "./EnvCollector";
import { TaskIntegrations } from "./TaskIntegrations";
import { DEPLOY_STAGE } from "@prisma/client";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                ]
            ),
            constructAppendBody("deployfox", {
                stage: DEPLOY_STAGE.PROD,
            })
        );
    };

    return (
        <>
            {uiAnnotation.object?.platforms &&
                <TaskIntegrations
                    uiAnnotation={uiAnnotation}
                    idx={idx}
                />}
            {uiAnnotation?.envVariablesCollect && uiAnnotation?.envVariablesCollect?.length > 0 &&
                (<EnvCollector
                    uiAnnotation={uiAnnotation}
                    idx={idx}
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
        </>
    )
}