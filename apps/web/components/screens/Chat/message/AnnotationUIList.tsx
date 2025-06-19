/* eslint-disable @next/next/no-img-element */
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { ActionButtons } from "./annotations/ActionButtons";
import { DeploymentsInfo } from "./annotations/DeploymentsInfo";
import { EnvCollector } from "./annotations/EnvCollector";
import { TaskInfo } from "./annotations/TaskInfo";
import { TaskIntegrations } from "./annotations/TaskIntegrations";
import { TaskStructure } from "./annotations/TaskStructure";
import { HotFixes } from "./annotations/HotFix";
import { InstallSetup } from "./annotations/InstallSetup";
import PublicationInfo from "./annotations/PublicationInfo";
dayjs.extend(duration);

interface UIAnnotation {
  objectType: string;
  object: Record<string, any>;
  text?: string;
  persona?: string;
  buttons?: any[];
}

export const AnnotationUIList = ({
  uiAnnotations,
  lastMessage,
  lastAnnotationIndices,
  messageIndex,
}: {
  uiAnnotations: UIAnnotation[];
  lastMessage: boolean;
  lastAnnotationIndices: Map<string, number>;
  messageIndex: number;
}) => {
  return uiAnnotations.map((uiAnnotation: UIAnnotation, idx: number) => {
    const isLastInQueue = lastAnnotationIndices.get(uiAnnotation.objectType) === messageIndex;

    if (uiAnnotation.objectType === "taskInfo") {
      return (
        <TaskInfo
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation as any}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "taskIntegrations") {
      return (
        <TaskIntegrations
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
          isLastInQueue={isLastInQueue}
        />
      );
    }
    if (uiAnnotation.objectType === "taskStructure") {
      return (
        <TaskStructure
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
          isLastInQueue={isLastInQueue}
        />
      );
    }
    if (uiAnnotation.objectType === "buttons" && lastMessage) {
      return (
        <ActionButtons
          key={uiAnnotation.objectType + idx}
          buttons={uiAnnotation.buttons}
          buttonHeaderText={(uiAnnotation as any).buttonHeaderText}
        />
      );
    }
    if (uiAnnotation.objectType === "envCollector") {
      return (
        <EnvCollector
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "deploymentsInfo") {
      return (
        <DeploymentsInfo
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "hotFixes") {
      return (
        <HotFixes
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "installSetup") {
      return (
        <InstallSetup
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
    if (uiAnnotation.objectType === "publicationInfo") {
      return (
        <PublicationInfo
          key={uiAnnotation.objectType + idx}
          uiAnnotation={uiAnnotation}
          idx={idx}
        />
      );
    }
  });
};
