import { MinionType } from "@/components/screens/hooks/convertors";
import { cleanUiMessageParts, findLastElementWith } from "@/utils/helpers/array";
import { AiRouter, findLastElement, getTextParts, getTextPartsContent } from "@microfox/ai-router";
import { AuthObject, AuthOptions, createOpenApiToolset } from "@microfox/tool-kit";
import docData from "../slsfox/test_openapi.json";
import { cleanSecretsForAuthObject, fetchAuthSecrets, getVariablesForAuthObject } from "./helpers/fetchVariables";
import { codeTemplateType } from "../convertfox/helpers/types";
import { ClientRequest } from "@prisma/client";
import { templateEnvsFromTaskIntegrations } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { convertToModelMessages, streamText } from "ai";
import { models } from "../models";
import { ApiMcp } from "@/utils/services/embeddings/packageSearch";
import { prisma } from "@/prisma/prisma";

const toolExecutionAgent = new AiRouter<any, any, any, any>();

toolExecutionAgent.use("/", async (ctx, next) => {
    const { request, state, response } = ctx;
    console.log(ctx.executionContext.currentPath, "currentPath");
    // if tool continuation is requested, we need to reconstruct the toolPopulatedMcps from the last known state.
    if (request.loadedRevalidatePath) {
        const lastKnownState = await prisma.chatAgenticState.findUnique({
            where: {
                originClientRequestId: request.clientRequestId,
            },
        });
        ctx.state.toolPopulatedMcps = (lastKnownState?.state as any).toolPopulatedMcps;
    }
    // else if forced tool is set, we need to reconstruc the toolPopulatedMCPS.
    if (!ctx.state.clientRequest) {
        ctx.state.clientRequest = await prisma.clientRequest.findUnique({
            where: {
                id: request.clientRequestId,
            },
        });
    }
    response.writeMessageMetadata({
        revalidatePath: ctx.executionContext.currentPath,
        revalidateType: "agent",
    });
    return next();
});

// 1. while reconstructing it needs to reconsstruct only the tool which was paused 
// 2. and then it should do tool selection intelligently on the fly. (both process processToolResult & toolSection can happen simultaneously)
toolExecutionAgent.agent("/", async (ctx) => {
    const { request, state, response } = ctx;

    const clientRequest = state.clientRequest as ClientRequest;

    if (!clientRequest) {
        throw new Error("Client request not found");
    }

    let toolPopulatedMcps = state.toolPopulatedMcps;
    if (ctx.request.params?.toolPopulatedMcps) {
        toolPopulatedMcps = ctx.request.params?.toolPopulatedMcps as ApiMcp[];
        await prisma.chatAgenticState.upsert({
            where: {
                originClientRequestId: clientRequest.id,
            },
            update: {
                state: {
                    toolPopulatedMcps: toolPopulatedMcps,
                }
            },
            create: {
                originClientRequestId: clientRequest.id,
                state: {
                    toolPopulatedMcps: toolPopulatedMcps,
                }
            }
        });
    }

    const client = await createOpenApiToolset(toolPopulatedMcps?.map((mcp: ApiMcp) => {
        return {
            schema: mcp.openApiSchema as any,
            baseUrl: mcp.base_url,
            name: mcp.package_name,
            getAuth: async (options: AuthOptions) => {
                const output = await fetchAuthSecrets(
                    options, {
                    clientRequest,
                    fillEncryptionKey: true,
                    fillVariables: true
                });
                const authFilledOutput = await getVariablesForAuthObject(output, {
                    clientRequest,
                    refetchFromDb: false,
                });
                return authFilledOutput;
            },
            cleanAuth: cleanSecretsForAuthObject,
        }
    }));

    const toolSet = await client.tools({
        disableAllExecutions: true,
    });

    console.log("toolSet", Object.keys(toolSet.tools));
    //return;

    const processedMessages = await client.parseHitl(
        cleanUiMessageParts(ctx.request.messages),
        ctx.response,
        async (_authObject) => {
            const authFilledOutput = await getVariablesForAuthObject(_authObject, {
                clientRequest,
                refetchFromDb: true,
            });
            return authFilledOutput;
        }
    );

    const stream = streamText({
        model: models.claude35Sonnet,
        messages: convertToModelMessages(cleanUiMessageParts(processedMessages)),
        tools: toolSet.tools,
        toolChoice: "auto",
        system:
            `You are called Microfox, a helpful assistant that can user with his tasks.
            You are given the following tools which you can call as you see fit.
            
            ${Object.entries(toolSet.tools).map(([toolName, tool]) => toolName).join(", \n")}
            `,
        stopWhen: client.isHitlStep(),
        onStepFinish: async (step) => {
            console.log("step", step.usage);
        }
    });

    ctx.response.merge(stream.toUIMessageStream());

});


export { toolExecutionAgent };
// 2. enable revalidation for tool processing
// 3. streamText.

