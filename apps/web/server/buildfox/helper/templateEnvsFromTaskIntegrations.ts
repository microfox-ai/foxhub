import { TaskIntegrations } from "@/server/convertfox/types";
import { fetchTemplateRoot } from "../tool/writeToFile";
import path from "path";
import { readFile } from "fs/promises";

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
