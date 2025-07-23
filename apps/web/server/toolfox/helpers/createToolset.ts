import {
  createOpenApiToolset,
  OpenAPIToolsClientOptions,
  AuthOptions,
} from "@microfox/tool-kit";
import { ApiMcp } from "@/utils/services/embeddings/packageSearch";
import { ClientRequest } from "@prisma/client";
import { z } from "zod";
import {
  fetchAuthSecrets,
  getVariablesForAuthObject,
  cleanSecretsForAuthObject,
} from "./fetchVariables";
import { UIMessage } from "@ai-sdk/react";

export async function createToolsetForExecution(
  toolPopulatedMcps: ApiMcp[],
  clientRequest: ClientRequest,
  options: {
    originUserMessage?: UIMessage<any, any>;
    originAssistantMessage?: UIMessage<any, any>;
  }
) {
  const { originUserMessage, originAssistantMessage } = options;
  const client = await createOpenApiToolset(
    toolPopulatedMcps?.map((mcp: ApiMcp) => {
      return {
        schema: mcp.openApiSchema as any,
        baseUrl: mcp.base_url,
        name:
          mcp.api_type === "package-sls"
            ? "pkgAgent" + mcp.package_name
            : mcp.api_type === "micro-agent"
              ? "microAgent" + mcp.package_name
              : mcp.api_type,
        getAuth: async (options: AuthOptions) => {
          const output = await fetchAuthSecrets(options, {
            clientRequest,
            fillEncryptionKey: true,
            fillVariables: true,
          });
          const authFilledOutput = await getVariablesForAuthObject(output, {
            clientRequest,
            refetchFromDb: false,
            extraVariables: {
              MICROFOX_ASSISTANT_MESSAGE_ID: originAssistantMessage?.id || "",
              MICROFOX_USER_MESSAGE_ID: originUserMessage?.id || "",
            },
          });
          return authFilledOutput;
        },
        cleanAuth: cleanSecretsForAuthObject,
        getAdditionalArgs: async (args) => {
          return z.object({
            microfoxOutputType: z
              .enum(["text", "audio", "image", "video"])
              .optional()
              .describe(
                "The expected content type of the json output this tool call would return"
              ),
            microfoxReasoning: z
              .string()
              .optional()
              .describe("The reasoning for the tool call"),
            microfoxAnnotationAudio: z
              .string()
              .optional()
              .describe(
                "The text to be spoken to the user to explain whats happening"
              ),
            microfoxNextToolQuery: z
              .string()
              .optional()
              .describe("The query to find the next tool. ALWAYS add this."),
          });
        },
      } as OpenAPIToolsClientOptions;
    })
  );

  return client;
}
