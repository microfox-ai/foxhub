// /* eslint-disable @next/next/no-img-element */
// import dayjs from "dayjs";
// import duration from "dayjs/plugin/duration";
// import { ActionButtons } from "./ui_Tool/ActionButtons";
// import { DeploymentsInfo } from "./ui_Tool/DeploymentsInfo";
// import { EnvCollector } from "./ui_Tool/EnvCollector";
// import { TaskInfo } from "./ui_Tool/TaskInfo";
// import { TaskIntegrations } from "./ui_Tool/TaskIntegrations";
// import { TaskStructure } from "./ui_Tool/TaskStructure";
// import { HotFixes } from "./ui_Tool/HotFix";
// import { InstallSetup } from "./ui_Tool/InstallSetup";
// import PublicationInfo from "./ui_Tool/PublicationInfo";
// dayjs.extend(duration);

// interface UIAnnotation {
//   objectType: string;
//   object: Record<string, any>;
//   text?: string;
//   persona?: string;
//   buttons?: any[];
// }

// export const AnnotationUIList = ({
//   uiAnnotations,
//   lastMessage,
//   lastAnnotationIndices,
//   messageIndex,
// }: {
//   uiAnnotations: UIAnnotation[];
//   lastMessage: boolean;
//   lastAnnotationIndices: Map<string, number>;
//   messageIndex: number;
// }) => {
//   return uiAnnotations.map((uiAnnotation: UIAnnotation, idx: number) => {
//     const isLastInQueue = lastAnnotationIndices.get(uiAnnotation.objectType) === messageIndex;

//     if (uiAnnotation.objectType === "taskInfo") {
//       return (
//         <TaskInfo
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation as any}
//           idx={idx}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "taskIntegrations") {
//       return (
//         <TaskIntegrations
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//           isLastInQueue={isLastInQueue}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "taskStructure") {
//       return (
//         <TaskStructure
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//           isLastInQueue={isLastInQueue}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "envCollector") {
//       return (
//         <EnvCollector
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "deploymentsInfo") {
//       return (
//         <DeploymentsInfo
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "hotFixes") {
//       return (
//         <HotFixes
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "installSetup") {
//       return (
//         <InstallSetup
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//         />
//       );
//     }
//     if (uiAnnotation.objectType === "publicationInfo") {
//       return (
//         <PublicationInfo
//           key={uiAnnotation.objectType + idx}
//           uiAnnotation={uiAnnotation}
//           idx={idx}
//         />
//       );
//     }
//   });
// };
