import {
  codeTemplateAddon,
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { genDbRedisHelper } from "./genDbRedisHelper";
import { ClientRequest } from "@prisma/client";

export const genHelperFiles = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  let _taskInstanceMeta = { ...taskInstanceMeta };
  if (
    taskInstanceMeta.taskStructure?.templateAddons?.includes(
      codeTemplateAddon.enum.sls_upstash_redis
    )
  ) {
    _taskInstanceMeta = await genDbRedisHelper(
      props,
      taskInstanceMeta,
      clientRequest
    );
  }

  if (
    taskInstanceMeta.taskStructure?.templateAddons?.includes(
      codeTemplateAddon.enum.sls_puppeteer_chrome
    )
  ) {
    // TODO: Add related helper code files for this
  }
  return _taskInstanceMeta;
};
