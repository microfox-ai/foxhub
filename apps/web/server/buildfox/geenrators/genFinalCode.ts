import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import dedent from "dedent";
import { promises as fs } from "fs";
import path from "path";
import { TaskInstanceMetaType } from "../../convertfox/types";
import {
  fetchTemplateRoot,
  readAllGenFilesList,
  writeToFileSystemAndUpdateSteps,
} from "../tool/writeToFile";
import { genServerlessIndex } from "./genServerlessIndex";
import { genServerlessYML } from "./genServerlessYML";

// IMPROTANT TODO: serverless.yml being written has no idea what env variables are needed..
export const genFinalCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  try {
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Writing final code pieces",
    });

    const allGenFilesList = await readAllGenFilesList(clientRequest, true);

    // modify the serverless.yml file to support all the functions & cron jobs

    // Call the abstracted function to generate serverless.yml
    await genServerlessYML(
      props,
      taskInstanceMeta,
      clientRequest,
      allGenFilesList
    );

    // modify the package.json file to support all the functions & cron jobs
    const packageJsonPath = path.join(
      process.cwd(),
      fetchTemplateRoot(taskInstanceMeta?.taskStructure?.templateType),
      "package.json"
    );
    const packageJson = await fs.readFile(packageJsonPath, "utf8");
    const packageJsonContent = JSON.parse(packageJson);
    taskInstanceMeta.taskIntegrations?.platforms?.forEach((platform) => {
      if (platform.package && platform.package != "@microfox/null") {
        packageJsonContent.dependencies[platform.package] = "*";
      }
    });
    writeToFileSystemAndUpdateSteps(
      {
        fileName: "package.json",
        filePath: "",
        fileType: "json",
        content: dedent`${JSON.stringify(packageJsonContent)}`,
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
