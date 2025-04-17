import { TaskIntegrations } from "@/server/convertfox/types";
import { fetchTemplateRoot } from "../tool/writeToFile";
import path from "path";
import { readFile } from "fs/promises";
import { CLIENTSECRETSTATUS } from "@prisma/client";

export interface InternalTemplateEnv {
  key: string;
  package: string;
  value: string;
  description: string;
  constructorFunction: string;
}

export const templateEnvsFromTaskIntegrations = async (
  template_type: "plain" | "upstash" | "mongodb"
) => {
  const envsJSON = await readFile(
    path.join(process.cwd(), fetchTemplateRoot(template_type), "envs.json"),
    "utf8"
  );
  const templatedEnvs = JSON.parse(envsJSON);
  return templatedEnvs;
};

export const getClientSecretsFromTemplateEnvs = async (
  template_type: "plain" | "upstash" | "mongodb"
) => {
  const templatedEnvs = await templateEnvsFromTaskIntegrations(template_type);
  const packageBasedEnvs: Record<
    string,
    { variables: any[]; constructorFunction: string }
  > = {};

  // 2. filter templatedEnvs based on the package.
  templatedEnvs.forEach((_env: InternalTemplateEnv) => {
    if (packageBasedEnvs[_env.package]) {
      packageBasedEnvs[_env.package]?.variables?.push(_env);
    } else {
      packageBasedEnvs[_env.package] = {
        variables: [_env],
        constructorFunction: _env.constructorFunction,
      };
    }
  });

  const templateSecrets = [];

  // add respective clientSecrets for each templateEnv
  for (const [packageName, packageEnvs] of Object.entries(packageBasedEnvs)) {
    templateSecrets.push({
      packageType: "template",
      packageName: packageName,
      packageConstructor: packageEnvs.constructorFunction,
      type: `${packageName}/${packageEnvs.constructorFunction}`,
      variables: packageEnvs.variables.map((env) => ({
        key: env.key,
        value: env.value,
        //mode: ["DEV", "PROD", "STAGING"],
        isOptional: false,
      })),
      status: CLIENTSECRETSTATUS.FILLED,
      name: `${packageName}/${packageEnvs.constructorFunction}`,
      botConfig: [],
    });
  }
  return templateSecrets;
};
