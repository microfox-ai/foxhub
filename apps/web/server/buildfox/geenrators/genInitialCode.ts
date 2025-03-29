import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import dedent from "dedent";
import { promises as fs } from "fs";
import path from "path";
import { TaskInstanceMetaType } from "../../convertfox/types";
import {
  INTERNAL_TEMPLATE_ROOT,
  writeToFileSystemAndUpdateSteps,
} from "../tool/writeToFile";

export const genInitialCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  props.dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Generating initial code",
  });

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

  writeToFileSystemAndUpdateSteps(
    {
      fileName: "package.json",
      filePath: "",
      fileType: "json",
      content: dedent`${JSON.stringify(packageJsonContent)}`,
      meta: {
        packagesUsed: [],
        timestamp: new Date().toISOString(),
        contentSize: packageJsonContent.length,
      },
    },
    clientRequest
  );

  const webpackConfig = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "webpack.config.js"),
    "utf8"
  );
  writeToFileSystemAndUpdateSteps(
    {
      fileName: "webpack.config.js",
      filePath: "",
      fileType: "js",
      content: webpackConfig,
      meta: {
        packagesUsed: [],
        timestamp: new Date().toISOString(),
        contentSize: webpackConfig.length,
      },
    },
    clientRequest
  );

  const serverlessYml = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "serverless.yml"),
    "utf8"
  );
  writeToFileSystemAndUpdateSteps(
    {
      fileName: "serverless.yml",
      filePath: "",
      fileType: "yml",
      content: serverlessYml,
      meta: {
        packagesUsed: [],
        timestamp: new Date().toISOString(),
        contentSize: serverlessYml.length,
      },
    },
    clientRequest
  );

  return taskInstanceMeta;
};
