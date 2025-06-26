import { ClientRequest } from "@prisma/client";
import { AiContext } from "@repo/ai-utils/router";
import dedent from "dedent";
import { promises as fs } from "fs";
import path from "path";
import { TaskInstanceMetaType } from "../../convertfox/helpers/types";
import {
  fetchTemplateDir,
  INTERNAL_TEMPLATE_PLAIN_ROOT,
  writeToFileSystemAndUpdateSteps,
} from "../tool/writeToFile";

export const genInitialServerlessCode = async (
  ctx: AiContext<any, any, any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  ctx.response.writeMessageMetadata({
    loader: "Generating initial code..",
  });

  // TODO: Instead of hardcoding, fetch from the template repo.
  const packageJson = await fs.readFile(
    path.join(
      process.cwd(),
      fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
      "package.json"
    ),
    "utf8"
  );
  const packageJsonContent = JSON.parse(packageJson);
  packageJsonContent.name = clientRequest.title
    .replaceAll(" ", "-")
    .toLowerCase();
  packageJsonContent.description = taskInstanceMeta.taskInfo?.goal;
  packageJsonContent.version = "1.0." + clientRequest.prNumber;

  writeToFileSystemAndUpdateSteps(
    {
      fileName: "package.json",
      filePath: "",
      fileType: "json",
      content: dedent`${JSON.stringify(packageJsonContent)}`,
    },
    clientRequest
  );

  const tsconfig = await fs.readFile(
    path.join(
      process.cwd(),
      fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
      "tsconfig.json"
    ),
    "utf8"
  );
  writeToFileSystemAndUpdateSteps(
    {
      fileName: "tsconfig.json",
      filePath: "",
      fileType: "json",
      content: tsconfig,
    },
    clientRequest
  );

  // writeToFileSystemAndUpdateSteps(
  //   {
  //     fileName: "webpack.config.js",
  //     filePath: "",
  //     fileType: "js",
  //     content: webpackConfig,
  //   },
  //   clientRequest
  // );

  const serverlessYml = await fs.readFile(
    path.join(
      process.cwd(),
      fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
      "serverless.yml"
    ),
    "utf8"
  );
  writeToFileSystemAndUpdateSteps(
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
