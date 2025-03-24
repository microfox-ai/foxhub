import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";

// needs improvements into finer thought process
export const getMicrofoxCapabilities = () => {
  return `WHAT WE ARE CAPABLE OF:
          Firsly, we are capable of building any automation task, & deploy it in serverless for users.
          1. We can integrate with any third party platform that has a API-access (meaning no matter the industry, as long as there exists a API for it). Example: Slack, Whatsapp, Wikipedia, Stockmarket (public-API), Notion, etc.
          2. We can write any backend microservice that will run via a webhook (meaning triggered from somewhere or in our app) or a cronjob (meaning scheduled to run at a specific time).
          3. We can write any AI prompt based automation for the user's needs (meaning we can make a custom prompt for the users needs to do something more complex).
          4. We can create new database, & maintain users data as he sees fit, by further communication.
          ____
          WHAT WE ARE NOT CAPABLE OF:
          1. Building web apps/ mobile apps - anyhting frontend`;
};

export const getMicrofoxCapabilitiesTool = (
  props: StreamingFucntionProps<any, any>
) => {
  return tool({
    description: "Fetches & Sends infrormation about Microfox's capabilities",
    parameters: z.object({
      task: z.string().describe("The user's goal or task"),
    }),
    execute: async ({ task }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "getMicrofoxCapabilities",
        toolCallId: options.toolCallId,
        content: `Thinking about the capabilities of Microfox to build the user's task`,
      });
      return getMicrofoxCapabilities();
    },
  });
};
