import { MinionType } from "@/components/screens/hooks/convertors";
import { cleanUiMessageParts, findLastElementWith } from "@/utils/helpers/array";
import { AiRouter, findLastElement, getTextParts, getTextPartsContent } from "@microfox/ai-router";
import { createOpenApiToolset } from "@microfox/tool-kit";
import docData from "../slsfox/test_openapi.json";
import { fetchAuthSecrets } from "../slsfox/fetchVariables";
import { codeTemplateType } from "../convertfox/helpers/types";
import { ClientRequest } from "@prisma/client";
import { templateEnvsFromTaskIntegrations } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { convertToModelMessages, streamText } from "ai";
import { models } from "../models";

const toolExecutionAgent = new AiRouter<any>();

toolExecutionAgent.use("/", async (ctx, next) => {
    const { request, state, response } = ctx;
    console.log(ctx.executionContext.currentPath, "currentPath");
    response.writeMessageMetadata({
        revalidatePath: ctx.executionContext.currentPath,
        revalidateType: "agent",
    });
    return next();
});

toolExecutionAgent.agent("/", async (ctx) => {
    const { request, state, response } = ctx;

    const clientRequest = state.clientRequest as ClientRequest;
    console.log("clientRequest", clientRequest);

    const client = await createOpenApiToolset({
        schema: docData as any,
        baseUrl: "http://localhost:4000",
        name: "slack-web-tiny",
        getAuth: async (options) => {
            const output = await fetchAuthSecrets(
                options,
                clientRequest,
                undefined,
                true
            );
            if (clientRequest) {
                const envs = await templateEnvsFromTaskIntegrations(
                    codeTemplateType.enum.upstash_sls,
                    clientRequest
                );
                output.variables = output.variables?.concat(envs) ?? envs;
            }
            return output;
        },
    });

    const toolSet = await client.tools({
        disableAllExecutions: true,
    });

    console.log("toolSet", Object.keys(toolSet.tools));
    //return;

    const processedMessages = await client.processToolResult(
        cleanUiMessageParts(ctx.request.messages)
    );

    const stream = streamText({
        model: models.claudeHaiku,
        messages: convertToModelMessages(cleanUiMessageParts(processedMessages)),
        tools: toolSet.tools,
        toolChoice: "auto",
        system:
            "You are called Microfox, a helpful assistant that can user with his tasks.",
        stopWhen: client.createHitlStopStep(),
        onStepFinish: async (step) => {
            console.log("step", step.usage);
        }
    });

    ctx.response.merge(stream.toUIMessageStream());

});

// 1. feed the tools into the agent
// 2. enable revalidation for tool processing
// 3. streamText.