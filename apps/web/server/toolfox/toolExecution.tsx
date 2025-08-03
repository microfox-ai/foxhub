import { MinionType } from "@/components/screens/hooks/convertors";
import { cleanUiMessageParts, findLastElementWith, trimMessagesForModel } from "@/utils/helpers/array";
import { AiRouter, findLastElement, getTextParts, getTextPartsContent } from "@microfox/ai-router";
import { AuthObject, AuthOptions, createOpenApiToolset, OpenAPIToolsClientOptions, OpenApiToolset } from "@microfox/tool-kit";
import { cleanSecretsForAuthObject, fetchAuthSecrets, getVariablesForAuthObject } from "./helpers/fetchVariables";
import { codeTemplateType } from "../convertfox/helpers/types";
import { ClientRequest } from "@prisma/client";
import { templateEnvsFromTaskIntegrations } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { convertToModelMessages, streamText, generateObject } from "ai";
import { models } from "../models";
import { ApiMcp } from "@/utils/services/embeddings/types";
import { prisma } from "@/prisma/prisma";
import { getMicrofoxCharacter, getMicrofoxPersonality, essentialTools } from "../hellofox/_prompts";
import { insertUiHitlOutput } from "../../components/screens/Chat/message/uiTool/mappers/uiHitl";
import { z } from "zod";
import { restoreLastKnownState, savePassedInTools } from "./execution/loadValidateState";
import { loadClientRequest } from "./helpers/loadClientRequest";
import { createToolsetForExecution } from "./helpers/createToolset";
import { UIMessage } from "@ai-sdk/react";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { insertRedditSummaryTool } from "./summaryTools/redditSummary";

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
        //console.log("toolPopulatedMcps", toolPopulatedMcps.length);
        toolPopulatedMcps = toolPopulatedMcps.filter((mcp: ApiMcp) =>
            mcp?.openApiSchema != null && mcp?.openApiSchema != undefined &&
            mcp?.openApiSchema?.paths != null && mcp?.openApiSchema?.paths != undefined
            && Object.keys(mcp?.openApiSchema?.paths).length > 0
            && (state.toolExecType === "selected" ? true : mcp?.api_type === "package-sls"));
        console.log("toolPopulatedMcps-filtered", toolPopulatedMcps.length, state.toolExecType);

        response.writeMessageMetadata({
            loader: "booting the tools...",
        });
        let originUserMessage: UIMessage<any, any> | undefined;
        let originAssistantMessage: UIMessage<any, any> | undefined;
        const originMessage = request.messages[request.messages.length - 1]
        if (originMessage?.role === "assistant") {
            originUserMessage = request.messages[request.messages.length - 2];
            originAssistantMessage = originMessage;
        } else {
            originUserMessage = originMessage;
        }
        //console.log("toolPopulatedMcps", toolPopulatedMcps);
        let client = await createToolsetForExecution(toolPopulatedMcps, clientRequest, {
            originUserMessage,
            originAssistantMessage,
        });

        const toolSet = await client.tools({
            disableAllExecutions: true,
        });

        console.log("toolSet", Object.keys(toolSet.tools));
        //return;

        response.writeMessageMetadata({
            loader: "Processing the tools...",
        });
                
        let lastToolPart: any = null;
        let lastTextPart: any = null;
        let executionHistory = ``;

        let processedMessages = trimMessagesForModel(ctx.request.messages);
        let lastToolCallName: string | null = null;
        if (ctx.request.loadedRevalidatePath) {
            console.log("re-processing messages", ctx.request.loadedRevalidatePath);
            const processedMessagesPromise = client.processHitlToolResult(
                cleanUiMessageParts(processedMessages),
                {
                    dataStream: ctx.response,
                    inserAuthVariables: async (_authObject: AuthObject) => {
                        const authFilledOutput = await getVariablesForAuthObject(_authObject, {
                            clientRequest,
                            extraVariables: {
                                MICROFOX_ASSISTANT_MESSAGE_ID: originAssistantMessage?.id || "",
                                MICROFOX_USER_MESSAGE_ID: originUserMessage?.id || "",
                            },
                            refetchFromDb: true,
                        });
                        return authFilledOutput;
                    },
                    mutateOutput: async (output, { part, uiMapper }) => {
                        return await insertUiHitlOutput(output, { part, uiMapper });
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

            const lastMessage =
                processedMessages?.[processedMessages.length - 1];
            if (lastMessage) {
                const messageParts = lastMessage.parts
                    .map((p: any) => {
                        if (p.type === "text") {
                            return { type: "text", text: p.text };
                        } else if (p.type?.startsWith("tool-")) {
                            const toolName = p.type.substring("tool-".length);
                            const reasoning =
                                p.input?.body?.microfoxReasoning ||
                                p.input?.microfoxReasoning;
                            const toolSummary = p.output?.metadata?.summary;
                            return { type: "tool", toolName, reasoning, toolSummary };
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (messageParts.length > 0) {
                    let stepCounter = 1;
                    executionHistory = `--- Execution History ---\n`;
                    messageParts.forEach((part: any) => {
                        if (part.type === "text" && part.text?.trim()) {
                            executionHistory += `\nStep ${stepCounter++}: Assistant Message\n`;
                            executionHistory += `> ${part.text.trim()}\n`;
                        } else if (part.type === "tool") {
                            executionHistory += `\nStep ${stepCounter++}: Tool Call: ${part.toolName
                                }\n`;
                            executionHistory += `  - Summary: ${part.toolSummary || "No summary provided."
                                }\n`;
                            executionHistory += `  - Reasoning: ${part.reasoning || "No reasoning provided."
                                }\n`;
                        }
                    });
                }
            }
            console.log("executionHistory", executionHistory);

            if (lastMessage?.parts) {
                for (let i = lastMessage.parts.length - 1; i >= 0; i--) {
                    const part = lastMessage.parts[i];
                    if (part) {
                        if (!lastToolPart && part.type?.startsWith("tool-")) {
                            lastToolPart = part;
                        }
                        if (!lastTextPart && part.type === "text") {
                            lastTextPart = part;
                        }
                        if (lastToolPart && lastTextPart) {
                            break;
                        }
                    }
                }
            }

            lastToolCallName = lastToolPart
                ? lastToolPart.type.replace("tool-", "")
                : null;

            let microfoxNextToolQuery = lastToolPart
                ? lastToolPart.input?.body?.microfoxNextToolQuery ||
                lastToolPart.input?.microfoxNextToolQuery
                : null;
            console.log("microfoxNextToolQuery", microfoxNextToolQuery);

            const searchForToolsPromise = ctx.next.callAgent(
                "@/chatFlow/toolSelection",
                {
                    userRequest: `${userMessage}\n
                ${lastToolCallName ? `Last tool call: ${lastToolCallName}\n` : ""}
                ${lastTextPart ? `${lastTextPart?.text}\n` : ""}
                ${microfoxNextToolQuery ? `Find tool for: ${microfoxNextToolQuery}\n` : ""}`,
                    // userRequest: `${userMessage}\n\n${microfoxNextToolQuery ? `Current task: ${microfoxNextToolQuery}` : (executionHistory ?? "")}${lastToolCallName ? `\n\nLast tool call: ${lastToolCallName}` : ""}`,
                    toolMode: "fast",
                }
            );

            const [processedMessagesResponse, searchForToolsResponse] = await Promise.all([processedMessagesPromise, searchForToolsPromise]);
            //console.log("searchForToolsResponse", searchForToolsResponse);
            processedMessages = [...processedMessagesResponse];
            console.log("re-updating tools", ctx.state.toolPopulatedMcps.length, ctx.state.toolPopulatedMcps.map((mcp: ApiMcp) => mcp.package_name));
            client = await createToolsetForExecution(ctx.state.toolPopulatedMcps, clientRequest, {
                originUserMessage,
                originAssistantMessage,
            });
        }
        response.writeMessageMetadata({
            loader: "Processing the task...",
        });

        // if the last message last tool call has task_id, end the response by saying that.
        const lastMessage = processedMessages?.[processedMessages.length - 1];
        if (lastMessage?.parts) {
            const lastToolPart = findLastElementWith(lastMessage.parts, (part: any) => part.type?.startsWith("tool-"));
            if ((lastToolPart as any)?.output?.backgroundTask) {
                return;
                response.write({
                    type: "text",
                    text: "Task is running in the background. Will update you when done.",
                });
            }
        }

        const combinedToolsSystemPromtps = client.generateSystemPrompt();

        console.log("combinedToolsSystemPromtps", combinedToolsSystemPromtps);
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
        console.log("Inserted tool set", Object.keys(toolSet.tools));
        ctx.state.processedMessages = processedMessages;
        // response.writeMessageMetadata({
        //     availableTools: Object.keys(toolSet.tools),
        // });

        const persistedTools = {
            ...essentialTools,
            ...(insertRedditSummaryTool(toolSet, ctx))
        }
        let availableTools: Record<string, any> = {
            ...toolSet.tools,
            ...persistedTools,
        };
        const stream = streamText({
            model: models.claude35Sonnet,
            messages: convertToModelMessages(cleanUiMessageParts(processedMessages, {
                removeAllToolCallsExceptLast: true,
            })),
            tools: {
                ...availableTools,
                // toolSelection: ctx.next.agentAsTool("@/chatFlow/toolSelection", {
                //     description: "Select the next best tools for the user's request",
                //     inputSchema: z.object({
                //         userRequest: z.string().optional().describe("The actual user's request"),
                //         selectedMcps: z.array(z.string()).describe("The ids of the agents to use"),
                //         toolMode: z.enum(["fast", "deep"]).optional().describe("The mode to use for tool selection"),
                //     }),
                // }),
            },
            toolChoice: "auto",
            maxRetries: 3,
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
                    } else if (typeof input.body === "string") {
                        const newInput = {
                            body: JSON.parse(input.body),
                        }
                        toolCall.input = JSON.stringify(newInput);
                        console.log("repairToolCall - fixed the tool call", toolCall);
                    }
                }
                if (Object.keys(availableTools).length > 0 && !Object.keys(availableTools).includes(toolCall.toolName)) {
                    ctx.response.write({
                        type: "text",
                        text: `There was an error due to a modal limitation. Please refresh your message and try again.`,
                    });
                    return null;
                }
                return toolCall;
            },
            system:
                `You are Microfox, an expert AI assistant that executes tasks using available tools with precision and efficiency.

<core_identity>
${getMicrofoxCharacter()}
${getMicrofoxPersonality()}
</core_identity>

<general_guidelines>
- Answer questions directly without unnecessary preamble or postamble
- Skip phrases like "I'll help you with...", "Let me assist...", or "Based on the information provided..."
- Get straight to the point and provide value immediately
- Use active voice and concrete language
- DO NOT improvise or add features unless the user specifically asks for them
- Only do exactly what the user has requested, nothing more
- If the user wants something specific done, they will mention it explicitly
- Don't assume additional requirements or enhancements are needed
</general_guidelines>

<response_format>
- **Concise Tasks**: For straightforward requests, provide brief, focused responses
- **Complex Tasks**: For detailed work, use structured markdown with clear sections and bullet points
- Include tables when presenting structured data or comparisons
- If you have the links available, make sure to include them in the response markdown.
</response_format>

<tool_execution_principles>
- To perform a task or an action, ALWAYS call a tool, do not assume any information without calling a tool.
- **ALWAYS include additionalArgs for every tool call** with:
  - microfoxReasoning: Your reasoning for making this tool call
  - microfoxAnnotationAudio: Brief, lively explanation of what's happening
  - microfoxNextToolQuery: Query to find the next tool (when applicable)
  - microfoxOutputType: Expected content type (text/audio/image/video) when relevant
- If a tool call results in "User denied access", continue with alternative tools or approaches
- Never call a tool named "pkg" - this tool does not exist
- Base responses on actual tool results, not assumptions or prior knowledge
- If you don't know something after using tools, explicitly state that
</tool_execution_principles>

<error_handling>
- If a tool fails, try alternative approaches without extensive explanation
- Note any limitations in your final response
</error_handling>

<meta_communication_avoidance>
- Don't explain your process unless specifically asked
- Don't apologize for tool limitations or explain why you're using certain tools
- Focus on results, not methodology
- If a tool fails, simply use an alternative approach without elaborate explanations
</meta_communication_avoidance>

<tool_guidelines>
${combinedToolsSystemPromtps ?? `When using tools, follow the specific guidelines for each tool as provided in your tool documentation.`}
use the redditSummary tool to summarise the data if the summary tool is available & the content is about reddit.
</tool_guidelines>

<context_awareness>
${lastToolCallName ? `Previous tool used: ${lastToolCallName} - build upon this context when relevant` : "This is a new task execution."}

Previous message outputSummaries: When available, previous messages may contain outputSummaries in their last text parts with structured data about tool executions (e.g., Slack interactions). Use this context to provide better continuity and avoid repeating actions.
</context_awareness>

Remember: Execute tasks efficiently using available tools. Be direct, accurate, and helpful. Only do what the user explicitly requests - do not add features or enhancements unless specifically asked.
The inputs you are giving for tool calls are passed to user, so don't ask user for input values, just assume he'll add in input later.
`,
            //${Object.entries(toolSet.tools).map(([toolName, tool]) => toolName).join(", \n")}
            stopWhen: (s) => {
                if (s.steps.length > 0) {
                    console.log("stopWhen", s.steps[s.steps.length - 1]?.toolResults, s.steps[s.steps.length - 1]?.finishReason);
                    const lastStep = s.steps[s.steps.length - 1];
                    // state = output-available.
                    const isFinalCall =
                        lastStep?.toolCalls?.some((toolCall: any) => toolCall.toolName === "redditSummary") ||
                        lastStep?.toolResults?.some((result: any) => result.output?._isFinal && result);
                    //console.log("isFinalCall task_ids", lastStep?.toolResults?.map((result: any) => result));
                    if (isFinalCall) {
                        return true;
                    }
                }
                return client.isHitlStep()(s);
            },
            prepareStep: async (step) => {
                console.log("prepareStep", step);

                if (Object.keys(toolSet.tools).length < 5) {
                    return step;
                }

                const toolDefinitions = Object.values(toolSet.tools).map((tool: any) => ({
                    _id: tool._id,
                    toolName: tool.toolName,
                    description: tool.description,
                }));

                let microfoxNextToolQuery = lastToolPart
                    ? lastToolPart.input?.body?.microfoxNextToolQuery ||
                    lastToolPart.input?.microfoxNextToolQuery
                    : null;
                const prompt = `From the following list of tools, select 5 of the most relevant tools for the user's request: "${getTextPartsContent(request.messages[request.messages.length - 1])}".\n\n
                    ${lastToolCallName ? `Last tool call: ${lastToolCallName}\n` : ""}
                    ${executionHistory ?? ""}
                    ${microfoxNextToolQuery ? `Select tools for: ${microfoxNextToolQuery}\n` : ""}
                    Available tools:
                    ${JSON.stringify(toolDefinitions, null, 2)}`;

                // console.log("prepareStep prompt", prompt)
                const { object: aiFilteredTools } = await generateObject({
                    model: models.googleGeminiFlash,
                    system: `You are a tool selection agent. You are given a list of tools, user's request and execution history(if any). You need to select the most relevant tools for the user's request. Some steps for the user's request might already be done, so you need to select the tools that are most relevant to the next step.
                    
                    select exactly 5 tools
                    `,
                    prompt: prompt,
                    schema: z.object({
                        tools: z.array(z.object({
                            _id: z.string(),
                            toolName: z.string(),
                        })).max(5),
                    })
                });
                console.log("all available tools", Object.keys(availableTools));
                console.log("ai filteredTools", aiFilteredTools);

                const filteredToolsIds = aiFilteredTools.tools.map((t) => t._id);
                const filteredTools = Object.fromEntries(
                    Object.entries(toolSet.tools).filter(([toolId]) => filteredToolsIds.includes(toolId))
                );
                let activeTools = {
                    ...persistedTools,
                    ...filteredTools,
                }
                console.log("filtered available tools", Object.keys(activeTools));
                response.writeMessageMetadata({
                    activeTools: Object.keys(activeTools)
                });

                return {
                    ...step,
                    activeTools: Object.keys(activeTools),
                };
            },
            activeTools: Object.keys(availableTools),
            onStepFinish: async (step) => {
                console.log("step finished", step.usage, step.finishReason);
                //console.log("Step - request", JSON.stringify(step.request, null, 2));
                //console.log("Step - response", JSON.stringify(step.response, null, 2));
            },
            onError: (error) => {
                console.log("error", error);
            },
            onFinish: async (result) => {
                TokenUsageAnalyticsTracker.trackUsage({
                    userId: ctx.request.userId,
                    clientRequestId: ctx.state.clientRequest?.id,
                    model: models.claude35Sonnet.modelId,
                    usage: result.usage,
                })
            }
        });
        ctx.response.merge(stream.toUIMessageStream({ sendFinish: false, sendStart: false }));
        const result = await stream.text;
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

