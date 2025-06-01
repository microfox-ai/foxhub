import {
  codeTemplateAddon,
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { ClientRequest } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

export const helperFilesContext = async (
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType,
  files: any[]
) => {
  // TODO: for redis, create a standard pattern just like prisma
  let writtenHelperFilesContent: string | null = null;
  if (clientRequest) {
    const allHelperFiles = files.filter((file) =>
      file.filePath.includes("/helpers/")
    );
    if (allHelperFiles.length > 0) {
      const allHelperFilesContent = allHelperFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(process.cwd(), file.filePath),
          "utf8"
        );
        return `FileName: ${file.fileName}\n Content: ${content}\n`;
      });
      writtenHelperFilesContent = (
        await Promise.all(allHelperFilesContent)
      ).join("\n");
    }
  }

  return `
    ${
      writtenHelperFilesContent &&
      `The following helper functions are exported from helpers/ folder, make use of them if needed:
      ${writtenHelperFilesContent}
      `
    }${
      taskInstanceMeta?.taskStructure?.templateAddons?.includes(
        codeTemplateAddon.enum.sls_upstash_redis
      ) &&
      `
    - If any extra redis saving is needed, make sure you null check the variables first, before saving them to redis.
    - Always use the getters & setters exported from the helper file, do not create new redis clients unless absolutely needed.`
    }
    make sure the imports follow the '.js' extension like this for imports from other folders:
    import { exampleHelper } from '../helpers/fileName.js'
    Its always in the helpers folders, so make sure to import from there.`;
};
