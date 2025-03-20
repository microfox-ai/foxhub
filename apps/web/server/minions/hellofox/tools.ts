import { models } from "@/server/models";
import { StreamingFucntionProps } from "@/server/router";
import { findLastElement } from "@/utils/helpers/array";
import {
  generateObject,
  streamText,
  tool,
  ToolCallUnion,
  ToolResultUnion,
} from "ai";
import { z } from "zod";
import { analyzeUsersIntent } from "./analyzeUsersIntent";
import { guideUserToDoableGoal } from "./guideUserToDoableGoal";
import { getMicrofoxCapabilities } from "./getMicrofoxCapabilities";

// whatToClarify vs. whatWeAreCapableOf
// prompt & messages cant be defined at the same time.

export const hellofoxTools = (props: StreamingFucntionProps<any, any>) => {
  const _functions = {
    // USE RAG TO ANSWER THIS
    aboutMicrofox: tool({
      description:
        "Fetches & Sends infrormation about Microfox based on user query / doubts / needs ? & his chat context",
      parameters: z.object({
        query: z.string().describe("The query from the user"),
      }),
      execute: async ({ query }, options) => {
        return {
          text: `Microfox is an AI-assistant that can help you accesss & automate any API-possible internet task.`,
        };
      },
    }),
    // USE ML TO ANALYSE THE USER'S INTENT
    analyseUserIntent: tool({
      description:
        "Analyse & understand the user's intent & guide/return the user's goal",
      parameters: z.object({
        userIntent: z.string().describe("The user's intent"),
      }),
      execute: async ({ userIntent }, options) => {
        // should not be merged actually, but we are using it for now
        props.dataStream.writeMessageAnnotation({
          type: "thinking",
          toolName: "analyseUserIntent",
          toolCallId: options.toolCallId,
          content: `Analyse & understand the user's intent & confirm the user's goal`,
        });
        const response = analyzeUsersIntent(userIntent, options.messages);
        response.mergeIntoDataStream(props.dataStream, {
          experimental_sendFinish: true,
        });
        return response.text;
      },
    }),
    // USE ML TO KNOW WHAT TO CLARIFY WITH THE USER
    guideUserToDoableGoal: tool({
      description: "Knows how to guide the user to a doable goal",
      parameters: z.object({
        initialGoal: z
          .string()
          .describe("The initial unclear/non-executable goal of the user"),
        missingCapabilities: z
          .string()
          .describe(
            "The capabilities of Microfox that are missing to build the user's task"
          ),
      }),
      execute: async ({ initialGoal, missingCapabilities }, options) => {
        props.dataStream.writeMessageAnnotation({
          type: "thinking",
          toolName: "guideUserToDoableGoal",
          toolCallId: options.toolCallId,
          content: `Thinking how to guide the user to a doable goal.`,
        });
        const response = guideUserToDoableGoal(
          initialGoal,
          missingCapabilities,
          options.messages
        );
        response.mergeIntoDataStream(props.dataStream, {
          experimental_sendFinish: false,
        });
        return response.text;
      },
    }),
    // USE ML TO CHECK IF THE USER'S TASK IS BUILDABLE WITH OUR SOFTWARE
    getMicrofoxCapabilities: tool({
      description: "Fetches & Sends infrormation about Microfox's capabilities",
      parameters: z.object({
        task: z.string().describe("The user's goal or task"),
      }),
      execute: async ({ task }, options) => {
        return {
          text: getMicrofoxCapabilities(),
        };
      },
    }),
    // CHECK IF THE USER'S TASK IS BUILDABLE BASED ON THE CAPABILITIES OF MICROFOX
    isTaskBuildable: tool({
      description: "Checks if the user's task is buildable with Microfox",
      parameters: z.object({
        task: z.string().describe("The user's task"),
        capabilities: z
          .array(z.string())
          .describe(
            "The capabilities of Microfox that are relevant to the user's task"
          )
          .default([]),
        missingCapabilities: z
          .array(z.string())
          .describe(
            "The capabilities of Microfox that are missing to build the user's task"
          )
          .default([]),
      }),
      execute: async (
        { task, capabilities, missingCapabilities },
        { messages }
      ) => {
        props.dataStream.writeMessageAnnotation({
          type: "thinking",
          toolName: "isTaskBuildable",
          content: `Thinking if I am capable of building your task.`,
        });
        if (missingCapabilities.length <= 0) {
          return {
            isBuildable: false,
            reason: `Microfox is not capable of building the task.`,
          };
        }
        // const _isTaskBuildable = await generateObject({
        //   model: models.googleGeminiFlash,
        //   system: `
        //   - You are an expert in what we are capable of doing, & can analyze the missing capabilities of Microfox.
        //   - You can also analyze the user's task & guide the user to a doable goal.
        //   `,
        //   schema: z.object({
        //     isBuildable: z
        //       .boolean()
        //       .describe("Whether the task is buildable, eveen if partially"),
        //     reason: z
        //       .string()
        //       .describe("The reason for the task being buildable or not"),
        //     response: z.string().describe("The response back to the user"),
        //   }),
        //   prompt: `The user's task is: ${task}. our missing capabilities are: ${missingCapabilities}.`,
        // });
        // props.dataStream.writeData({
        //   isTaskBuildable: _isTaskBuildable.object,
        // });
        return {
          isBuildable: true,
          reason: `Microfox is capable of building the task.`,
          shiftMinionTo: "convetfox",
        };
      },
    }),
    // SEND STRUCK LOGS TO THE USER
    sendStruckLogs: tool({
      description: "Sends the stuck logs to the user",
      parameters: z.object({
        struckpoint: z.string().describe("Where are you struck"),
      }),
      execute: async ({ struckpoint }, { messages }) => {
        return {
          resolution:
            "At this point, I am not sure how to solve your request. Shall we restart ?",
          minionToShiftTo: "refresh",
          struckpoint: struckpoint,
          message: findLastElement(messages),
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
