import { TaskInfo } from "./TaskInfo";
import { TaskIntegrations } from "./TaskIntegrations";
import { TaskStructure } from "./TaskStructure";
import { EnvCollector } from "./EnvCollector";
import { DeploymentsInfo } from "./DeploymentsInfo";
import { ActionButtons } from "./ActionButtons";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

interface AnnotationUIListProps {
    uiAnnotations: UIAnnotation[];
    lastMessage: boolean;
}

export const AnnotationUIList = ({ uiAnnotations, lastMessage }: AnnotationUIListProps) => {
    return (
        <div className="space-y-4">
            {uiAnnotations.map((uiAnnotation, idx) => {
                switch (uiAnnotation.objectType) {
                    case "task":
                        return <TaskInfo key={idx} uiAnnotation={uiAnnotation} idx={idx} />;
                    case "taskIntegrations":
                        return <TaskIntegrations key={idx} uiAnnotation={uiAnnotation} idx={idx} />;
                    case "taskStructure":
                        return <TaskStructure key={idx} uiAnnotation={uiAnnotation} idx={idx} />;
                    case "envVariablesCollect":
                        return <EnvCollector key={idx} uiAnnotation={uiAnnotation} idx={idx} />;
                    case "buttons":
                        return lastMessage ? <ActionButtons key={idx}
                            buttons={uiAnnotation.buttons}
                            buttonHeaderText={(uiAnnotation as any).buttonHeaderText} /> : null;
                    case "deploymentsInfo":
                        return <DeploymentsInfo key={idx} uiAnnotation={uiAnnotation} idx={idx} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}; 