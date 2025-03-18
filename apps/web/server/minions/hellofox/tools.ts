import { models } from "@/server/models";
import { StreamingFucntionProps } from "@/server/router";
import {
  generateObject,
  streamObject,
  streamText,
  Tool,
  tool,
  ToolCallUnion,
  ToolResultUnion,
} from "ai";
import { z } from "zod";

export const hellofoxTools = (props: StreamingFucntionProps<any, any>) => {
  const _functions = {
    aboutMicrofox: tool({
      description:
        "Fetches infrormation about Microfox based on user query / doubts / needs ? & his chat context",
      parameters: z.object({
        query: z.string().describe("The query from the user"),
        chatContext: z
          .string()
          .describe(
            "small chat context that describes the user's current intent & previous conversation history"
          ),
      }),
      execute: async ({ query, chatContext }, options) => {
        console.log("aboutMicrofox", options.toolCallId);
        props.dataStream.writeMessageAnnotation({
          type: "system",
          toolName:
            "aboutMicrofox - Microfox is an AI-assistant that can help you accesss & automate any API-possible internet task.",
          content: `Deep thinkin about what to tell the user based on the query & the user's goal.`,
        });
        const response = streamText({
          model: models.googleGeminiFlash,
          system: `You know everything about Microfox.
            Microfox is an AI-assistant that can help you accesss & automate any API-possible internet task.
            Deep thinkin about what to tell the user based on the query & the user's goal.
            `,
          prompt: `The user asked: ${query}. Answer him in short & concise manner.`,
          //tools:
        });
        props.dataStream.writeData({
          type: "system",
          toolName: "aboutMicrofox",
          content: `Deep thinkin about what to tell the user.`,
        });
        response.mergeIntoDataStream(props.dataStream, {
          experimental_sendFinish: true,
        });
        return response.text;
      },
    }),
    goalClarifier: tool({
      description: "Further clarifies the goal of the user",
      parameters: z.object({
        goal: z.string().describe("The goal of the user"),
      }),
      execute: async ({ goal }) => {
        const response = streamText({
          model: models.googleGeminiFlash,
          system: `
          You are able to convert the user's intent & goal into a specific task that can be automated.
        You are able to guide the user to be more specific about their goal.
        You are able to review the user's goal & provide feedback.
        You are able to convert the user's goal into a list of 3rd party Platform API access that we might need to use to achieve the goal.
            ----
        Your task is to extract a final goal from the conversation.
        when it is completely clear & very specific about what user wants to build or achieve based on the conversation with user.
        You need to think the final goal from the conversation.
        At each step of the conversation, think if the goal is understood, 
        & if not, guide the user to be more specific.
        ---
        A goal is considered complete when user either provides/confirms the following:
        - A specific task that user wants to be done in internet either now or in automation,
        - A list of 3rd party Platform API access that we might need to use to achieve the goal,
        ----
        When you have the final goal, pass it to the reviewer.
            `,
        });
        response.mergeIntoDataStream(props.dataStream);
        return {
          goal,
        };
      },
    }),
  };

  return {
    ..._functions,
  };
};

export type HelloFoxToolCall = ToolCallUnion<ReturnType<typeof hellofoxTools>>;
export type HelloFoxToolResult = ToolResultUnion<
  ReturnType<typeof hellofoxTools>
>;
