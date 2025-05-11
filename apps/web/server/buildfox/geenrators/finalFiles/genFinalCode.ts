import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import dedent from "dedent";
import { promises as fs } from "fs";
import path from "path";
import { TaskInstanceMetaType } from "../../../convertfox/types";
import {
  fetchTemplateDir,
  readAllGenFilesList,
  writeToFileSystemAndUpdateSteps,
} from "../../tool/writeToFile";
import { genServerlessIndex } from "./genServerlessIndex";
import { genServerlessYML } from "./genServerlessYML";
import { updateJsonFile } from "../../helper/updateJsonFile";

// IMPROTANT TODO: serverless.yml being written has no idea what env variables are needed..
export const genServerlessFinalCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  try {
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Writing final code pieces",
    });

    if (!taskInstanceMeta?.taskStructure?.templateType) {
      throw new Error("Template type is not set");
    }

    const allGenFilesList = await readAllGenFilesList(clientRequest, true);
    // Call the abstracted function to generate serverless.yml
    await genServerlessYML(
      props,
      taskInstanceMeta,
      clientRequest,
      allGenFilesList
    );

    // modify the package.json file to support all the functions & cron jobs
    await updateJsonFile(
      taskInstanceMeta?.taskStructure?.templateType,
      "package.json",
      (packageJsonContent) => {
        taskInstanceMeta.taskIntegrations?.platforms?.forEach((platform) => {
          if (platform.package && platform.package != "@microfox/null") {
            packageJsonContent.dependencies[platform.package] = "*";
          }
        });
        return packageJsonContent;
      },
      clientRequest
    );

    // Generate index.ts file
    await genServerlessIndex(
      props,
      taskInstanceMeta,
      clientRequest,
      allGenFilesList
    );
  } catch (error) {
    console.error("Error generating final code", error);
  }

  return taskInstanceMeta;
};
