import { AiRouter } from "@microfox/ai-router";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { models } from "../../models";
import { getMicrofoxCapabilities } from "../_prompts";
import { isTaskBuildable } from "./query.isTaskBuildable";
import { analyseUserIntent } from "./query.analyzeUsersIntent";
import { confirmSpecifics } from "./query.confirmSpecifics";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { guideUserToDoableGoal } from "./query.guideUserToDoableGoal";

const hellofoxQueryAgent = new AiRouter<any, any, any, any>();

hellofoxQueryAgent.use("/", async (ctx, next) => {
  const { request, state, response } = ctx;
  response.writeMessageMetadata({
    path: "hellofox/task-query",
  });
  if (
    state.classification.type === "task-query" ||
    state.classification.type === "task-confirmation"
  ) {
    await next();
  }
});

hellofoxQueryAgent.tool("/isTaskBuildable", isTaskBuildable);
hellofoxQueryAgent.tool("/analyseUserIntent", analyseUserIntent);
hellofoxQueryAgent.tool("/confirmSpecifics", confirmSpecifics);
hellofoxQueryAgent.tool("/guideUserToDoableGoal", guideUserToDoableGoal);

hellofoxQueryAgent.agent("/", async (ctx) => {
  const { request, state, response } = ctx;

  let classification = state.classification;

  let lastFewMessages =
    request.messages.length > 8 ? request.messages.slice(-8) : request.messages;

  let toolUsage = ``;
  if (classification.taskClarity === "clear") {
    // call isTaskBuildable tool
    toolUsage = `- isTaskBuildable: Check if the user's task is buildable & then confirm the task. (make sure to pass in the platforms & requirements)`;
  } else if (classification.taskClarity === "ambiguous") {
    // call analyseUserIntent tool
    toolUsage = `
      - analyseUserIntent: Analyse the user's intent.
      - confirmSpecifics: Confirm the specific details of the task.
      - isTaskBuildable: Check if the user's task is buildable & then confirm the task. (make sure to pass in the platforms & requirements)
      `;
  } else {
    // call guideUserToDoableGoal tool
    toolUsage = `
      - analyseUserIntent: Analyse the user's intent.
      - guideUserToDoableGoal: Guide the user to a doable goal.
      - confirmSpecifics: Confirm the specific details of the task.`;
  }

  console.log("hellofoxQueryAgent", ctx.executionContext);

  const result = streamText({
    model: models.googleGeminiPro,
    system: `
        - You are called Microfox, 
        - your primary intent/job is to fine-grain the users goal & help him finalise on what he wishes to build.
        - you keep your answers/questions short & concise, unless it is needed.
        - you are a great listener, & you are able to understand the user's intent 
        - you call tools that can fetch information or help you think.
        - you communicate complex technical jargon in a easy to understand manner.
        - ALWAYS speak in the first person (as if you are microfox).
        ----
        About yourself
        ${getMicrofoxCapabilities()}
        ----
        Tool usage:
        ${toolUsage}
        ----
        A few things about your workflow:
        - You first think carefully about the users last messages & the tools you have, and analyse what needs to be done.
        - You call the tools given based on your analysis in a pattern that is most likely to give you the best results.
        - The tools will only help you think, & you will have to make the final call on what to respond back to the user.
        - Your final goal is to call isTaskBuildable tool, to confirm if the users task is buildable.
    
        Critically, you must never ask for any specific details from the user.
        specific details examples:
         - what is the name/url/email of the website/app/repo/etc?
         - can you provide API keys/tokens/etc of your slack/whatsapp/etc?
  
         You can ask for moderate details, like:
         - do you want to integrate with slack/whatsapp/etc ?
         - what kind of details can you provide later about the webhook/job/api you want to build?
  
        In place of asking for any specific details, you can call tool - isTaskBuildable
        If there is decent amount of details about the task/workflow/automation, you can call isTaskBuildable tool.
  
        DO NOT CALL ANY OTHER TOOL further, if isTaskBuildable is called.
        ${classification.type === "task-confirmation" && " YOU MUST CALL isTaskBuildable tool "}
        use proper line breaks in your response.
        `,
    messages: convertToModelMessages(lastFewMessages),
    stopWhen: stepCountIs(3),
    toolChoice: "auto", // force the model to call a tool
    tools: {
      ...(classification.taskClarity === "clear"
        ? {
            isTaskBuildable: ctx.next.attachTool("/isTaskBuildable"),
          }
        : classification.taskClarity === "ambiguous"
          ? {
              analyseUserIntent: ctx.next.attachTool("/analyseUserIntent"),
              confirmSpecifics: ctx.next.attachTool("/confirmSpecifics"),
              isTaskBuildable: ctx.next.attachTool("/isTaskBuildable"),
            }
          : {
              analyseUserIntent: ctx.next.attachTool("/analyseUserIntent"),
              guideUserToDoableGoal: ctx.next.attachTool(
                "/guideUserToDoableGoal"
              ),
              confirmSpecifics: ctx.next.attachTool("/confirmSpecifics"),
            }),
    },
    onStepFinish: (step) => {
      console.log("step", step.usage, step.toolCalls);
    },
    onFinish: async (result) => {
      console.log("result", result.usage);
      TokenUsageAnalyticsTracker.trackUsage({
        ...ctx.request,
        userId: ctx.request.userId,
        model: models.googleGeminiPro.modelId,
        usage: result.usage,
      });
    },
    onError: (error) => {
      console.log(
        "error",
        error,
        (error.error as any)?.requestBodyValues?.contents
      );
    },
  });
  response.merge(result.toUIMessageStream());

  await result.text;
  console.log("hellofoxQueryAgent");
});

export default hellofoxQueryAgent;
