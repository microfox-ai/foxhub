import { UiComponentProps } from "@/server/ui/UiComponentProps"
import { MyUiTool } from "@/server/ui/uiTool"
import { ActionButtons } from "../uiTool/buttons_list/ActionButtons"
import { TaskInfo } from "../uiTool/card/info/TaskInfo"
import { TaskIntegrations } from "../uiTool/card/task_integrations/TaskIntegrations"
import { TaskStructure } from "../uiTool/card/task_structure"
import { EnvCollector } from "../uiTool/card/env_collector"
import { DeploymentsInfo } from "../uiTool/card/deployments_info"
import { HotFixes } from "../uiTool/card/hotfixes"
import { InstallSetup } from "../uiTool/card/install_setup"
import PublicationInfo from "../uiTool/card/publication_info"
import { AcceptHitl } from "../uiTool/hitl/Accept"
import { ToolResultPart, ToolUIPart } from "ai"


export const RenderUiTool = ({ tool, lastMessage, lastAnnotationIndices, messageIndex }: {
    tool: MyUiTool & {
        type: `tool-ui-${keyof UiComponentProps}` | `tool-${string}`
    },
    lastMessage: boolean
    lastAnnotationIndices: Map<string, number>,
    messageIndex: number
}) => {
    if (!tool.output) {
        return null;
    }
    const isLastInQueue = lastAnnotationIndices.get(tool.output.uiComponent) === messageIndex;
    if (tool.output?._humanIntervention) {
        return <AcceptHitl
            tool={tool as ToolUIPart}
            lastMessage={lastMessage}
        />
    }
    switch (tool.output?.props?.uiType) {
        case "buttons_list":
            return <ActionButtons
                {...tool.output.props}
                lastMessage={lastMessage}
            />
        case "card":
            if (tool.output.uiComponent.includes("task_info")) {
                return <TaskInfo
                    {...tool.output.props}
                    lastMessage={lastMessage}
                />
            }
            if (tool.output.uiComponent.includes("task_integrations")) {
                return <TaskIntegrations
                    {...tool.output.props}
                    lastMessage={lastMessage}
                    isLastInQueue={isLastInQueue}
                    hideMetaInfo={false}
                />
            }
            if (tool.output.uiComponent.includes("task_structure")) {
                return <TaskStructure
                    {...tool.output.props}
                    isLastInQueue={isLastInQueue}
                    lastMessage={lastMessage}
                />
            }
            if (tool.output.uiComponent.includes("env_collector")) {
                return <EnvCollector
                    {...tool.output.props}
                    isLastInQueue={isLastInQueue}
                    lastMessage={lastMessage}
                />
            }
            if (tool.output.uiComponent.includes("deployments_info")) {
                return <DeploymentsInfo
                    {...tool.output.props}
                    isLastInQueue={isLastInQueue}
                    lastMessage={lastMessage}
                />
            }
            if (tool.output.uiComponent.includes("hotfixes")) {
                return <HotFixes
                    {...tool.output.props}
                    isLastInQueue={isLastInQueue}
                    lastMessage={lastMessage}
                />
            }
            if (tool.output.uiComponent.includes("install_setup")) {
                return <InstallSetup
                    {...tool.output.props}
                    isLastInQueue={isLastInQueue}
                    lastMessage={lastMessage}
                />
            }
            if (tool.output.uiComponent.includes("publication_info")) {
                return <PublicationInfo
                    {...tool.output.props}
                    isLastInQueue={isLastInQueue}
                    lastMessage={lastMessage}
                />
            }
            return null;
        // case "taskIntegrations":
        //     return <TaskIntegrations
        //         {...tool.output.props}
        //     />
        // case "taskStructure":
        //     return <TaskStructure
        //         {...tool.output.props}
        default:
            return null;
    }
}