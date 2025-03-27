import { INTERNAL_TEMPLATE_ROOT, writeToFileSystem } from "./writeToFile";
import dedent from "dedent";
import { TaskInstanceMetaType } from "../convertfox/types";
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { readFile } from "fs/promises";
import path from "path";
import { promises as fs } from "fs";

export const genInitialCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  // TODO: Instead of hardcoding, fetch from the template repo.
  const packageJson = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "package.json"),
    "utf8"
  );
  const packageJsonContent = JSON.parse(packageJson);
  packageJsonContent.name = clientRequest.title
    .replaceAll(" ", "-")
    .toLowerCase();
  packageJsonContent.description = taskInstanceMeta.taskInfo?.summary;
  packageJsonContent.version = "1.0." + clientRequest.prNumber;

  writeToFileSystem(
    {
      fileName: "package.json",
      filePath: "",
      fileType: "json",
      content: dedent`${JSON.stringify(packageJsonContent)}`,
    },
    clientRequest
  );

  const webpackConfig = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "webpack.config.js"),
    "utf8"
  );
  writeToFileSystem(
    {
      fileName: "webpack.config.js",
      filePath: "",
      fileType: "js",
      content: webpackConfig,
    },
    clientRequest
  );

  const serverlessYml = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "serverless.yml"),
    "utf8"
  );
  writeToFileSystem(
    {
      fileName: "serverless.yml",
      filePath: "",
      fileType: "yml",
      content: serverlessYml,
    },
    clientRequest
  );

  return taskInstanceMeta;
};
