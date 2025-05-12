import { CodeTemplateType } from "@/server/convertfox/types";
import { writeToFileSystemAndUpdateSteps } from "../tool/writeToFile";
import { fetchTemplateDir } from "../tool/writeToFile";
import path from "path";
import dedent from "dedent";
import fs from "fs/promises";
import { ClientRequest } from "@prisma/client";

export const updateJsonFile = async (
  rootDir: string,
  filePath: string,
  mutate: (jsonContent: any) => any,
  clientRequest: ClientRequest
) => {
  const packageJsonPath = path.join(process.cwd(), rootDir, filePath);
  const packageJson = await fs.readFile(packageJsonPath, "utf8");
  const packageJsonContent = JSON.parse(packageJson);
  await writeToFileSystemAndUpdateSteps(
    {
      fileName: filePath,
      filePath: "",
      fileType: "json",
      content: dedent`${JSON.stringify(mutate(packageJsonContent))}`,
    },
    clientRequest
  );
};
