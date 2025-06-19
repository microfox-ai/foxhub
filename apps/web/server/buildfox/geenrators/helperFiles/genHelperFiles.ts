import {
  codeTemplateAddon,
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { genDbRedisHelper } from "./genDbRedisHelper";
import { ClientRequest } from "@prisma/client";
import {
  fetchAddonDir,
  fetchTemplateDir,
  writeToFileSystemAndUpdateSteps,
} from "../../tool/writeToFile";
import path from "path";
import fs from "fs/promises";

export const genHelperFiles = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  let _taskInstanceMeta = { ...taskInstanceMeta };
  for (const addon of taskInstanceMeta.taskStructure?.templateAddons ?? []) {
    if (addon === codeTemplateAddon.enum.sls_upstash_redis) {
      _taskInstanceMeta = await genDbRedisHelper(
        props,
        taskInstanceMeta,
        clientRequest
      );
    } else if (addon === codeTemplateAddon.enum.sls_puppeteer_chrome) {
      // TODO: Add related helper code files for this
      // const chromeHelper = await fs.readFile(
      //   path.join(process.cwd(), fetchAddonDir(addon), "chromeBigScript.txt"),
      //   "utf8"
      // );
      // writeToFileSystemAndUpdateSteps(
      //   {
      //     fileName: "chromeScript.ts",
      //     filePath: "src/helpers",
      //     fileType: "ts",
      //     content: chromeHelper,
      //   },
      //   clientRequest
      // );
    }
  }
  return _taskInstanceMeta;
};
