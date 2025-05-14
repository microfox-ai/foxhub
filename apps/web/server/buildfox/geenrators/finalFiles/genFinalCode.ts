import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import dedent from "dedent";
import { promises as fs } from "fs";
import path from "path";
import {
  codeTemplateAddon,
  TaskInstanceMetaType,
} from "../../../convertfox/types";
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

    const packageJsonPath =
      allGenFilesList?.find((file) => file.fileName === "package.json")
        ?.filePath ?? "";
    // modify the package.json file to support all the functions & cron jobs
    await updateJsonFile(
      packageJsonPath?.replace("/package.json", ""),
      "package.json",
      (packageJsonContent) => {
        let newPackageJsonContent = { ...packageJsonContent };
        taskInstanceMeta.taskIntegrations?.platforms?.forEach((platform) => {
          if (platform.package && platform.package != "@microfox/null") {
            newPackageJsonContent.dependencies[platform.package] = "*";
          }
        });
        taskInstanceMeta.taskStructure?.templateAddons?.forEach((addon) => {
          if (addon === codeTemplateAddon.enum.sls_upstash_redis) {
            newPackageJsonContent.dependencies["@upstash/redis"] = "*";
          } else if (addon === codeTemplateAddon.enum.sls_puppeteer_chrome) {
            //newPackageJsonContent.dependencies["puppeteer"] = "*";
            delete newPackageJsonContent.dependencies["puppeteer"];
            newPackageJsonContent.dependencies["puppeteer-core"] = "*";
            //newPackageJsonContent.dependencies["@sparticuz/chromium-min"] = "*";
            newPackageJsonContent.dependencies["@sparticuz/chromium"] = "*";
          }
        });
        allGenFilesList.forEach((file) => {
          const packagesUsed = (file.meta as any)?.packagesUsed;
          if (packagesUsed && packagesUsed?.length > 0) {
            packagesUsed.forEach((pkg: any) => {
              if (
                pkg != "@microfox/null" &&
                !newPackageJsonContent.dependencies[pkg]
              ) {
                newPackageJsonContent.dependencies[pkg] = "*";
              }
            });
          }
        });
        return newPackageJsonContent;
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
