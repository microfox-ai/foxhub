import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { MicrofoxRequestBody } from "../../microfoxRouter";
import { defaultCallbackResultBody, ServerStreamingFunction } from "../../router";
import { getMicrofoxCharacter } from "../default";
import { hellofoxTools } from "./tools";
import { models } from "@/server/models";


// 1. HELLO
// 2. CONVERT -> GOAL -> reference 
// 3. BUILD ->
// 4. ENV_KEYS ->
// 5. Test ->
// 6. DEPLOY ->
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

// HELLO FOX <--> NextFox => CONVERTFox

// if the users task is too simple like one-step, then guide the user to expand his goal, as you can do more than just that. = requires Sequential Thinking to better suggest Ideas
// TODO: VISHWAJEET - guideUserToDoableGoal should be converted into guideUserToGoal with sequential thinking on inside it.

// hellofox listens to what the user asks, 
// analyses the user's intent
// confirms if the users goal is clear 
// & is currently posiibble to build with mirofox capapbilities or not. 
// If not, it guides the user to a doable goal.
// If it is too simple, it guides the user to expand his goal.
export const hellofoxRouter: ServerStreamingFunction<MicrofoxRequestBody, defaultCallbackResultBody> = async (props) => {

    const { dataStream, requestBody, responseBody } = props;
    console.log("hellofoxENdpoint", requestBody)
    const result1 = streamText({
        model: models.googleGeminiFlash,
        system: `
        ${getMicrofoxCharacter()}
        - your primary intent/job is to fine-grain the users goal & help him finalise on what he wishes to build.
        - you keep your answers/questions short & concise, unless it is needed.
        - You are a great listener, & you are able to understand the user's intent & call tools that can fetch information or help you think.
        - You call the right tools for you to better do you job,
        - If it is plain conversation, you do not call below tools, & just respond back to the user.
        - you do not ever use lists, tables, or bullet points; instead, you provide a single response
        - you do not aks users any information, you just confirm if the user is okay with providing said information later when building what he needs.
        - you communicate complex technical jargon in a way that is easy to understand.
        ---
        if user asks/want to know more about you, call tool - aboutMicrofox.
        if user does not understand what you do, call tool - aboutMicrofox.
        if user says something that is not clear, call tool - whatToClarify.
        if user has specified a goal or a task that he wants done - call tool - analyseUserIntent.
        if it is unclear whether you can build the user's task - call tool - getMicrofoxCapabilities.
        if there is not enough information about the user's requirement, call tool - analyseUserIntent.
        if user's goal or intent is completely clear, call tool - isTaskBuildable.
        if user's goal or intent is not clear, call tool - guideUserToDoableGoal.
        if user's goal is vague or not specific to certain platforms & tools, call tool - analyseUserIntent.
        if task is buildable, & user confirms the task, finish the conversation by call tool - confirmTask
        ----
        Don't think about how to do it or what the user means, that is not your job, call tools as needed.
        Don't directly respond with tool responses, instead, use them to think & respond.
        If an existing tool match is not discovered, call tool - sendStruckLogs`,
        messages: requestBody.messages,
        toolCallStreaming: true,
        maxSteps: 3,
        toolChoice: 'auto', // force the model to call a tool
        tools: {
            aboutMicrofox: hellofoxTools(props).aboutMicrofox,
            analyseUserIntent: hellofoxTools(props).analyseUserIntent,
            getMicrofoxCapabilities: hellofoxTools(props).getMicrofoxCapabilities,
            isTaskBuildable: hellofoxTools(props).isTaskBuildable,
            guideUserToDoableGoal: hellofoxTools(props).guideUserToDoableGoal,
            sendStruckLogs: hellofoxTools(props).sendStruckLogs,
        },
        onStepFinish: (step) => {
            console.log("step", step.usage);
        },
        onFinish: (result) => {
            console.log("result", result.usage);
        },
        onError: (error) => {
            console.log("error", error, (error.error as any)?.requestBodyValues?.contents);
        },
    });

    //console.log("result1", result1.toolCalls);

    result1.mergeIntoDataStream(dataStream, {
        experimental_sendStart: false,
    });

    return {
        responseBody: { ...responseBody },
        appendRequestBody: { ...requestBody },
    };
};
