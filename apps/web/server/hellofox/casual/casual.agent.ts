import { AiAgentKit } from "@repo/ai-utils/router";
import { convertToModelMessages, streamText } from "ai";
import { getMicrofoxCharacter } from "../_prompts";
import { models } from "../../models";
import { aboutMicrofoxInfo } from "../_prompts";
import { getMicrofoxCapabilities } from "../_prompts";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";

const casualHelloFoxAgent = new AiAgentKit<any, any, any, any>();

casualHelloFoxAgent.use("/", async (ctx, next) => {
  const { request, state, response } = ctx;
  console.log("casualHelloFoxAgent - use start", ctx.executionContext);
  if (state.classification.type === "casual") {
    response.writeMessageMetadata({
      path: "hellofox/casual",
    });
    return next();
  }
  console.log("casualHelloFoxAgent - use continue", ctx.executionContext);

  //return ;
});

casualHelloFoxAgent.agent("/", async (ctx) => {
  const { request, state, response } = ctx;
  console.log("casualHelloFoxAgent - agent", ctx.executionContext);
  const classification = state.classification;
  const lastFewMessages =
    request.messages.length > 8 ? request.messages.slice(-8) : request.messages;
  const result = streamText({
    model: models.googleGeminiFlash,
    system: `
          ${getMicrofoxCharacter()}
          - always speak in the first person (as microfox).
          ___
          Info About Microfox:
          ${
            classification.complexity === "complex" ||
            classification.taskClarity === "ambiguous"
              ? `${aboutMicrofoxInfo()}\n\n${getMicrofoxCapabilities()}`
              : aboutMicrofoxInfo()
          }
          ___
          Respond to the user's query in a short & concise manner.
          End the conversation asking on how you can be of help to the user.
          Never tell about your technicalities, unless asked.
          use proper line breaks in your response.
          `,
    messages: convertToModelMessages(lastFewMessages),
    onFinish: (result) => {
      console.log("result", result.usage);
      TokenUsageAnalyticsTracker.trackUsage({
        ...ctx.request,
        userId: ctx.request.userId,
        model: models.googleGeminiFlash.modelId,
        usage: result.usage,
      });
    },
  });
  response.merge(result.toUIMessageStream());
});

export default casualHelloFoxAgent;
