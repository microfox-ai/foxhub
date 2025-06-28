import { codeTemplateType } from "@/server/convertfox/helpers/types";

export const promptMap = {
  // [codeTemplateType.enum.plain_sls]: {
  //   lambda: {
  //     requiresHelperFiles: false,
  //     requiresEnvVariables: true,
  //   },
  //   cron: {
  //     requiresHelperFiles: false,
  //     requiresEnvVariables: true,
  //   },
  // },
  [codeTemplateType.enum.upstash_sls]: {
    lambda: {
      requiresHelperFiles: true,
      requiresEnvVariables: true,
    },
    cron: {
      requiresHelperFiles: true,
      requiresEnvVariables: true,
    },
  },
};
