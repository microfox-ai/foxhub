import { MinionType } from "@/components/screens/hooks/convertors";
import { findLastElementWith } from "@/utils/helpers/array";
import { AiRouter, getTextPartsContent } from "@microfox/ai-router";
import { models } from "../models";
import { generateObject } from "ai";
import { z } from "zod";
import { findApiMcps, ApiMcp, getApiMcpById } from "@/utils/services/embeddings/packageSearch";
import { queryApis, QueryApisResult } from "./helpers/queryApis";

// mounted at /chatFlow/toolSelection
const toolSelectionAgent = new AiRouter<any, any, any, any>();

toolSelectionAgent.actAsTool("/", {
    description: "Select the best tools for the user's request",
    inputSchema: z.object({
        userRequest: z.string().describe("The actual user's request"),
    }),
});

toolSelectionAgent.use("/", async (ctx, next) => {
    const { request, state, response } = ctx;
    response.writeMessageMetadata({
        MinionType: MinionType.ToolFox,
    });
    response.writeMessageMetadata({
        loader: "Searching for the best tools...",
    });
    return next();
});

toolSelectionAgent.agent("/", async (ctx) => {
    const { request, state, response } = ctx;

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

    // 1. generate a list of RAG search query to find the best package/agent

    // ---
    // **Process Flow:**
    //   -   You run in a loop of Thought, Action, PAUSE, Observation.
    //   -   At the end of the loop you output an Answer.
    //   -   Use Thought to describe your thoughts about the question you have been asked.
    //   -   Use Action to run one of the actions available to you - then return PAUSE.
    //   -   Observation will be the result of running those actions.
    //   -   At the end of the loop you output an Answer.
    // ---

    let ragResults: ApiMcp[] = [];
    if (ctx.request.selectedMcps && ctx.request.selectedMcps.length > 0) {
        ragResults = await getApiMcpById(ctx.request.selectedMcps);
    }
    else if (ctx.request.toolMode == "deep") {
        response.writeMessageMetadata({
            loader: "Deep-Thinking the best fit.",
        });
        const searchQueriesResult = await generateObject({
            model: models.googleGeminiTwoFive,
            system: `
          You are an expert software architect and a senior full-stack developer. Your primary goal is to deconstruct a user's request into a series of platforms/packages that are most likely to be used to accomplish the request.

          **Steps:**
          1.  **Deconstruction (Thought)**:
              -   Analyze the user's request.
              -   Break down the request into smaller, concrete programming steps or functions that would be needed.

          2.  **Initial Platform Selection (Action)**:
              -   Based on your deconstruction, generate a list of precise platforms/packages. Each platform/package should target a specific platform/package that is most likely to be used to accomplish the request.

          3.  **Introspection and Refinement (Observation)**:
              -   Critically review your generated platforms. Ask yourself:
                  -   Is this platform relevant for the user's request?
                  -   Is there any other platform that is more likely to be used to accomplish the request?
                  -   Is there any important requirement/service/feature from the user's request that is not covered by any of the platforms/packages?

          4.  **Final Answer (Output)**:
              -   After refining your list, provide the final, high-quality, and meaningful platforms/packages in the specified JSON format:
                -   platform: The platform/package that is most likely to be used to accomplish the request
                -   alternativePlatforms: Array of probable platforms/packages which can also be used to accomplish the request.
                -   searchQuery: A concise and fully detailed search query which factors the user's request and finds the most relevant platform/package

          ---
          **CRITICAL EXCLUSION LIST**:
          Your final output MUST NOT include platforms/packages for:
          -   **Deployment Services** (e.g., AWS Lambda, Vercel).
          -   **Database Services** (e.g., Postgres, Redis, Supabase).
          -   **Generic Architectural Patterns** (e.g., Webhooks, HTTP Server, Cron Jobs, API Design).
          Acknowledge these in your thought process if necessary, but EXCLUDE them from the final JSON output.
          Do not duplicate platforms/packages. If a platform/package is already in the list, do not add it again.
          ---

          Now, begin your process for the following request.
        `,
            schema: z.array(
                z.object({
                    platform: z
                        .string()
                        .describe(
                            "The platform/package that is most likely to be used to accomplish the request"
                        ),
                    alternativePlatforms: z
                        .array(z.string())
                        .describe(
                            "Array of probable platforms/packages related to user request "
                        ),
                    searchQuery: z
                        .string()
                        .describe(
                            "A concise and fully detailed search query which factors the user's request and finds the most relevant platform/package. Do not include any other information in the search query."
                        ),
                })
            ),
            prompt: `
            User's Request: ${userMessage}
        `,
        });

        console.log("searchQueriesResult", searchQueriesResult.object);

        // {mcpSearchQuery: "search query to find the correct API/MCP/Agent",
        const platforms = searchQueriesResult.object;
        console.log("platforms", platforms);

        response.writeMessageMetadata({
            loader: `Searching for the best tools for ${platforms.length} platforms...`,
        });
        for (const platform of platforms) {
            const similarPackages = await findApiMcps({
                query: `Platform: ${platform.platform} - Search Query: ${platform.searchQuery}`,
                match_threshold: 0.5,
                match_count: 5,
            });
            ragResults.push(...similarPackages);
        }
        ragResults = ragResults.filter(
            (item, index, self) => index === self.findIndex((t) => t.id === item.id)
        );
        ragResults.sort((a, b) => b.similarity - a.similarity);
        console.log("ragResults", ragResults);
    }
    else if (ctx.request.toolMode == "fast") {
        response.writeMessageMetadata({
            loader: "Fast-search based on user's request...",
        });
        ragResults = await findApiMcps({
            query: `User's Request: ${userMessage}`,
            match_threshold: 0.5,
            match_count: 5,
        });
    }


    let toolPopulatedMcps: (ApiMcp)[] = [];

    if (ragResults.length > 0 && ctx.request.selectedMcps && ctx.request.selectedMcps.length > 0) {
        toolPopulatedMcps = ragResults.map((ragResult) => {
            return {
                ...ragResult,
                openApiSchema: ragResult.metadata.docs_data,
            };
        });
    }
    else if (ragResults.length > 0 && ctx.request.toolMode == "fast") {
        toolPopulatedMcps = ragResults.map((ragResult) => {
            return {
                ...ragResult,
                openApiSchema: ragResult.metadata.docs_data,
            };
        });
    }
    else if (ragResults.length > 0 && ctx.request.toolMode == "deep") {
        // toolSearchQuery: "search query to find the correct tools inside this MCP/API/Agent"}
        const toolPopulatedMcpsPromises = ragResults.map(async (ragResult) => {
            const toolsResults = await queryApis({
                query: `Platform: ${ragResult.name} - Search Query: ${ragResult.name} - Type: ${ragResult.type}`,
                package_name: ragResult.package_name,
                match_threshold: 0.5,
                match_count: 10,
            });
            // CONSTRUCT A TOOL BASED MCP WITH ONLY THE PROVIDED TOOLS (in the array in future).    
            //console.log("toolsResults", toolsResults.map((tool) => tool.metadata.openApiSchema));
            return {
                ...ragResult,
                //tools: toolsResults,
                openApiSchema: toolsResults?.[0]?.metadata.openApiSchema,
            };
        });
        toolPopulatedMcps = await Promise.all(toolPopulatedMcpsPromises);
    }



    console.log("toolPopulatedMcps", toolPopulatedMcps);

    await ctx.next.callAgent("@/chatFlow/toolExecution", {
        toolPopulatedMcps,
    })
    //3. call the next agent with the tools passed in. (Leave this to me.)
});

export { toolSelectionAgent };
