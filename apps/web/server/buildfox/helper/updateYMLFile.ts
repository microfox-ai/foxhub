import { CodeTemplateType } from "@/server/convertfox/types";
import { writeToFileSystemAndUpdateSteps } from "../tool/writeToFile";
import { fetchTemplateDir } from "../tool/writeToFile";
import path from "path";
import dedent from "dedent";
import fs from "fs/promises";
import { ClientRequest } from "@prisma/client";
import YAML from "yaml";

export const updateYMLFile = async (
  rootDir: string,
  filePath: string,
  mutate: (ymlContent: string) => Promise<string>,
  clientRequest: ClientRequest
) => {
  const fileFullPath = path.join(process.cwd(), rootDir, filePath);
  const fileContent = await fs.readFile(fileFullPath, "utf8");
  //const fileContentParsed = YAML.parse(fileContent);
  const newContent = await mutate(fileContent);
  await writeToFileSystemAndUpdateSteps(
    {
      fileName: filePath,
      filePath: "",
      fileType: "yml",
      content: newContent,
    },
    clientRequest
  );
};
