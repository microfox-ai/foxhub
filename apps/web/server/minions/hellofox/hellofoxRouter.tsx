import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { defaultCallbackResultBody, ServerStreamingFunction } from "../../router";
import { MicrofoxRequestBody } from "../../microfoxRouter";
import { createOpenAI } from "@ai-sdk/openai";
import { hellofoxTools } from "./tools/tools";

// 1. ENTHUSIASTIC AGENT
// 2. 

//hellofox/greeter
//hellofox/extractor
//hellofox/guider
//hellofox/reviewer

// 1. HELLO
// 2. CONVERT -> GOAL -> reference 
// 3. BUILD ->
// 4. ENV_KEYS ->
// 5. Test ->
// 6. DEPLOY ->
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

export const hellofoxRouter: ServerStreamingFunction<MicrofoxRequestBody, defaultCallbackResultBody> = async (props) => {

    const { dataStream, requestBody, responseBody } = props;
    console.log("hellofoxENdpoint", requestBody)
    const result1 = streamText({
        model: google('gemini-1.5-flash', {
            structuredOutputs: true,
        }),
        system: `
        You are called Microfox, if user asks/want to know more about you, just ask tool - aboutMicrofox.
        You are clever, smart & witty, no-nonsense, direct, to the point.
        You are an expert in helping users to automate their routine internet boring tasks by deploying microcode on the internet connecting users apps ^ services.
        You are conversing with user, start with a friendly greeting.
        Keep your conversation short & concise, unless it is needed.
        You are enthusiastic about helping smart minds save their time.
        You are a great listener, & you are able to understand the user's intent & goal.
        Don't ever explain what you do . only speak in a positive inquisitive tone on how you can be of great longterm help to the user.
        `,
        messages: requestBody.messages,
        toolCallStreaming: true,
        toolChoice: 'auto', // force the model to call a tool
        tools: {
            aboutMicrofox: hellofoxTools(props).functions.aboutMicrofox,
            //...hellofoxTools(props).filter(["aboutMicrofox", "goalClarifier"])
            // Uncomment and adjust the following if needed
            // passGoalToReviewer: tool({
            //     description: "Pass the final goal to the reviewer",
            //     parameters: z.object({
            //         goal: z.string().describe("The users goal & what he wants to achieve"),
            //         thirdPartyPlatforms: z.array(z.string()).describe("A list of 3rd party Platform API access that we might need to use to achieve the goal"),
            //     }),
            //     execute: async ({ goal, thirdPartyPlatforms }) => {
            //         return {
            //             goal,
            //             thirdPartyPlatforms
            //         };
            //     },
            // }),
        },
        onStepFinish: (step) => {
            console.log("step", step);
        },
        onError: (error) => {
            console.log("error", error);
        },
    });

    console.log("result1", result1.toolCalls);

    result1.mergeIntoDataStream(dataStream);

    return {
        responseBody: { ...responseBody },
        appendRequestBody: { ...requestBody },
    };
};
