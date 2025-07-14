import { MinionType } from "@/components/screens/hooks/convertors";
import { cleanUiMessageParts, findLastElementWith, trimMessagesForModel } from "@/utils/helpers/array";
import { AiRouter, findLastElement, getTextParts, getTextPartsContent } from "@microfox/ai-router";
import { AuthObject, AuthOptions, createOpenApiToolset, OpenAPIToolsClientOptions, OpenApiToolset } from "@microfox/tool-kit";
import { cleanSecretsForAuthObject, fetchAuthSecrets, getVariablesForAuthObject } from "./helpers/fetchVariables";
import { codeTemplateType } from "../convertfox/helpers/types";
import { ClientRequest } from "@prisma/client";
import { templateEnvsFromTaskIntegrations } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { convertToModelMessages, streamText } from "ai";
import { models } from "../models";
import { ApiMcp } from "@/utils/services/embeddings/packageSearch";
import { prisma } from "@/prisma/prisma";
import { getMicrofoxCharacter, getMicrofoxPersonality } from "../hellofox/_prompts";
import { insertUiHitlOutput } from "../ui/uiHitl";
import { z } from "zod";
import { restoreLastKnownState, savePassedInTools } from "./execution/loadValidateState";
import { loadClientRequest } from "./helpers/loadClientRequest";
import { createToolsetForExecution } from "./helpers/createToolset";

/**
 * Tool execution agent.
 * This agent is the key entry point for all ai calls.
 * 1. it can fetch selected apimcp toolcalls (preloaded on first attempt) 
 *    or search for the best tools for the given task (toolSelection sub-agent as toolpower)
 * 2. it can restore state & continue from where it was for hitl conditions.
 * 3. It also saves state before responding to the user in case of pausing temporarily (saveLastKnownState)
 * 4. It can contact other agents similar to toolSelection agent ( thinkerAgent, userKnowledgeAgent, etc )
 */
const toolExecutionAgent = new AiRouter<any, any, any, any>();

toolExecutionAgent.use("/", loadClientRequest);
toolExecutionAgent.use("/", restoreLastKnownState);
toolExecutionAgent.use("/", async (ctx, next) => {
    console.log(ctx.executionContext.currentPath, "currentPath");
    ctx.response.writeMessageMetadata({
        revalidatePath: ctx.executionContext.currentPath,
        revalidateType: "agent",
    });
    return next();
});

// 1. while reconstructing it needs to reconsstruct only the tool which was paused 
// 2. and then it should do tool selection intelligently on the fly. (both process processToolResult & toolSection can happen simultaneously)
toolExecutionAgent.agent("/", async (ctx) => {
    const { request, state, response } = ctx;

    try {
        const clientRequest = state.clientRequest as ClientRequest;

        if (!clientRequest) {
            throw new Error("Client request not found");
        }

        let toolPopulatedMcps = state.toolPopulatedMcps;
        if (!toolPopulatedMcps) {
            const response = await ctx.next.callAgent("@/chatFlow/toolSelection");
            console.log("toolSelection response", state.toolPopulatedMcps.length);
            toolPopulatedMcps = [...state.toolPopulatedMcps];
        }
        else {
            console.log("skipping toolSelection as exists or reloaded via state somehow.");
        }

        console.log("filtering toolPopulatedMcps", toolPopulatedMcps.length, Object.keys(toolPopulatedMcps));
        console.log("state.toolExecType", state.toolExecType);
        console.log("toolPopulatedMcps", toolPopulatedMcps.length);
        toolPopulatedMcps = toolPopulatedMcps.filter((mcp: ApiMcp) =>
            mcp?.openApiSchema != null && mcp?.openApiSchema != undefined &&
            mcp?.openApiSchema?.paths != null && mcp?.openApiSchema?.paths != undefined
            && Object.keys(mcp?.openApiSchema?.paths).length > 0
            && (state.toolExecType === "selected" ? true : mcp?.api_type === "package-sls"));
        console.log("toolPopulatedMcps-filtered", toolPopulatedMcps.length, state.toolExecType);

        response.writeMessageMetadata({
            loader: "booting the tools...",
        });
        //console.log("toolPopulatedMcps", toolPopulatedMcps);
        let client = await createToolsetForExecution(toolPopulatedMcps, clientRequest);

        const toolSet = await client.tools({
            disableAllExecutions: true,
        });

        console.log("toolSet", Object.keys(toolSet.tools));
        //return;

        response.writeMessageMetadata({
            loader: "Processing the tools...",
        });

        let processedMessages = trimMessagesForModel(ctx.request.messages);
        if (ctx.request.loadedRevalidatePath) {
            console.log("re-processing messages", ctx.request.loadedRevalidatePath);
            const processedMessagesPromise = client.parseHitl(
                cleanUiMessageParts(processedMessages),
                {
                    dataStream: ctx.response,
                    inserAuthVariables: async (_authObject: AuthObject) => {
                        const authFilledOutput = await getVariablesForAuthObject(_authObject, {
                            clientRequest,
                            refetchFromDb: true,
                        });
                        return authFilledOutput;
                    },
                    mutateOutput: async (output, { part }) => {
                        return await insertUiHitlOutput(output, part);
                    }
                }
            );
            let userMessage = ctx.request.params?.userRequest
            if (!userMessage) {
                const lastUserMessage = findLastElementWith(
                    request.messages,
                    (message: any) => message.role === "user"
                );

                if (!lastUserMessage) {
                    throw new Error("No user message found");
                }
                userMessage = getTextPartsContent(lastUserMessage);
            }
            const searchForToolsPromise = ctx.next.callAgent("@/chatFlow/toolSelection", {
                userRequest: `User Asked: ${userMessage}`,
                toolMode: "fast",
            });

            const [processedMessagesResponse, searchForToolsResponse] = await Promise.all([processedMessagesPromise, searchForToolsPromise]);
            //console.log("searchForToolsResponse", searchForToolsResponse);
            processedMessages = processedMessagesResponse;
            console.log("re-updating tools", ctx.state.toolPopulatedMcps.length, ctx.state.toolPopulatedMcps.map((mcp: ApiMcp) => mcp.package_name));
            client = await createToolsetForExecution(ctx.state.toolPopulatedMcps, clientRequest);
        }
        response.writeMessageMetadata({
            loader: "Processing the task...",
        });

        // ---
        // **Process Flow:**
        // -   You run in a loop of Thought, Action, PAUSE, Observation.
        // -   At the end of the loop you output an Answer.
        // -   Use Thought to describe your thoughts about the question you have been asked.
        // -   Use Action to run one of the actions available to you - then return PAUSE.
        // -   Observation will be the result of running those actions.
        // -   At the end of the loop you output an Answer.
        // ---

        //TODO: a sequential thinker toolcall, which would search tool calls and inserts them at the nest step.
        //that sequential thinker toolcall also should be able to select active tools for the given puprose.
        const stream = streamText({
            model: models.claude35Sonnet,
            messages: convertToModelMessages(cleanUiMessageParts(processedMessages, {
                removeAllToolCallsExceptLast: true,
            })),
            tools: {
                ...toolSet.tools,
                // toolSelection: ctx.next.agentAsTool("@/chatFlow/toolSelection", {
                //     description: "Select the next best tools for the user's request",
                //     inputSchema: z.object({
                //         userRequest: z.string().optional().describe("The actual user's request"),
                //         mcpIds: z.array(z.string()).describe("The ids of the agents to use"),
                //         toolMode: z.enum(["fast", "deep"]).optional().describe("The mode to use for tool selection"),
                //     }),
                // }),
            },
            toolChoice: "auto",
            experimental_repairToolCall: async ({ toolCall }) => {
                console.log("repairToolCall - trying to fix the tool call", toolCall);
                if (toolCall.toolName == "pkg") {
                    return toolCall;
                    // toolCall.
                }
                if (toolCall.input) {
                    const input = JSON.parse(toolCall.input);
                    if (!input.body) {
                        //const 
                        const newInput = {
                            body: { ...input },
                        }
                        toolCall.input = JSON.stringify(newInput);
                        console.log("repairToolCall - fixed the tool call", toolCall);
                    }
                }
                return toolCall;
            },
            system:
                `You are called Microfox, a helpful assistant that can user with his tasks.
            You are given the following tools which you can call as you see fit.
            ${getMicrofoxCharacter()}
            ${getMicrofoxPersonality()}

            Output:
            If its a small conversation, respond in small concise sentences.
            parse audio outputs wrapped with <audio> tags. & Audio is must for every text output.
            DO NOT WASTE WORDS, always be concise & get to the point.
            Make sure to put citations to sources when necessary.
            If its a task, respond in a detailed manner
             - output a markdown formatted response, 
             - include tables when necessary.

            Tools
            - if a toll call results in "User denied access", simply skip to an alternative tool or just continue.
            - You must never call a tool called "pkg" - there is no such tool.
            - Always start with a simple convesation of what you are about to do before calling a tool.

            microfoxAnnotationAudio - a short audio annotation that is lively & engaging that speaks to the user in short & compact scenetences.

            `,
            //${Object.entries(toolSet.tools).map(([toolName, tool]) => toolName).join(", \n")}
            stopWhen: (s) => {
                if (s.steps.length > 0) {
                    console.log("stopWhen", s.steps[s.steps.length - 1]?.toolResults, s.steps[s.steps.length - 1]?.finishReason);
                }
                return client.isHitlStep()(s);
            },
            prepareStep: async (step) => {
                console.log("prepareStep", step);
                //if (step.steps)
                return step;
            },
            onStepFinish: async (step) => {
                console.log("step", step.usage, step.finishReason);
                //console.log("Step - request", JSON.stringify(step.request, null, 2));
                //console.log("Step - response", JSON.stringify(step.response, null, 2));
            },
            onError: (error) => {
                console.log("error", error);
            }
        });
        ctx.response.merge(stream.toUIMessageStream({ sendFinish: false, sendStart: false }));
        const text = await stream.text;
        response.writeMessageMetadata({
            loader: "Done! wrapping up.",
        });
        await savePassedInTools(ctx);
    } catch (error) {
        console.log("error", error);
        ctx.response.writeMessageMetadata({
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
});


export { toolExecutionAgent };
// 2. enable revalidation for tool processing
// 3. streamText.

