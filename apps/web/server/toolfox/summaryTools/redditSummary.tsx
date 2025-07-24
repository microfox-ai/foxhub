import { convertToModelMessages, generateObject, streamText, tool } from "ai";
import { z } from "zod";
import { models } from "../../models";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { AiContext, AiToolFactory } from "@microfox/ai-router";
import { cleanUiMessageParts } from "@/utils/helpers/array";

type RedditSummaryToolMetadata = {
    loader?: string;
    summary?: string;
};

export const insertRedditSummaryTool = (toolSet: any, ctx: AiContext<any, any, any, any>) => {
    if (Object.keys(toolSet.tools).some(t => t.includes("ragreddit"))) {
        console.log("insertRedditSummaryTool", ctx.state.processedMessages?.length);
        return {
            redditSummary: redditSummary(ctx)
        }
    }
    return undefined;
}

export const redditSummary: AiToolFactory<
    RedditSummaryToolMetadata,
    any,
    any,
    any
> = (ctx: AiContext<any, any, any, any>) => {
    return tool<
        any, any
    >({
        description: "Generates a markdown summary for Reddit related data, used to summarise large amounts of data from ragreddit tools.",
        inputSchema: z.object({
            userRequest: z.string().describe("The user's request"),
        }),
        execute: async ({ requestMessages }, { messages, toolCallId }) => {
            ctx.response.writeMessageMetadata({
                loader: "Analyzing Reddit posts...",
            });

            const result = streamText({
                model: models.claude35Sonnet,
                system: `You are an expert Reddit analyzer. 
                Your task is to create a comprehensive, well-structured markdown summary of the discussion.

        # [An Overall Report Headline]
        Follow these guidelines for formatting:
        1. Format Reddit-specific links like below ( if a link is not given ):
           - Users: [u/username](https://reddit.com/u/username)
           - Subreddits: [r/subreddit](https://reddit.com/r/subreddit)
           - Posts: [Post Title](https://reddit.com/r/subreddit/comments/...)
           Always maintain this link format throughout the summary.

        2. Summarize discussions using a clean, nested format:
           ## [Main Point/Topic]
           - [Key insight or argument] by [u/user1](user_link) <timesince>timestamp</timesince>
             - [Related detail or example] by [u/user2](user_link) <timesince>timestamp</timesince>
             - [Contrasting perspective] from [u/user3](user_link) <timesince>timestamp</timesince>

        3. Key insights table with attribution: 
        ##  A good heading for this table.
        A short 2 line decription before the table
           | Category | Insight | Source | Time |
           |----------|---------|--------|------|
           | Theme | Description | [u/user](link) | <timesince>timestamp</timesince> |
           | Theme | Description | [p/post](post_link) | <timesince>timestamp</timesince> |

        4. Structure Guidelines:
           - Use proper markdown headers (##) for each section
           - Format tables with proper alignment
           - Include bullet points for additional context
           - Always attribute quotes and insights to users with proper links
           - Link to relevant subreddits when mentioned
           - Always include relative timestamps using <timesince>timestamp</timesince>
           - End with a conclusion table including relevant links and timestamps

        5. Cross-reference format:
           - When referencing other posts: [Related Discussion](post_link) <timesince>timestamp</timesince>
           - When mentioning communities: [r/community](subreddit_link)
           - When quoting users: > Quote by [u/username](user_link) <timesince>timestamp</timesince>`,
                messages: convertToModelMessages(
                    cleanUiMessageParts(ctx.state.processedMessages, {
                        removeAllToolCallsExceptLast: true,
                    })),
                onFinish: (step) => {
                    TokenUsageAnalyticsTracker.trackUsage({
                        userId: ctx.request.userId,
                        clientRequestId: ctx.request.clientRequestId,
                        originClientRequestId: ctx.request.originClientRequestId,
                        model: models.googleGeminiPro.modelId,
                        usage: step.usage,
                    });
                }
            });

            ctx.response.merge(result.toUIMessageStream({
                sendFinish: false, sendStart: false,
            }))

            const summary = await result.text;
            return {
                _isFinal: true,
                summary: summary,
            };
        },
    });
};
