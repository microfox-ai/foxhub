import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";

// needs improvements into finer thought process
export const getMicrofoxCapabilities = () => {
  return `WHAT WE ARE CAPABLE OF:
          Firsly, we are capable of building any automation task, & deploy it in serverless for users.
          1. We can integrate with any third party platform that has a API-access (meaning no matter the industry, as long as there exists a API for it). Example: Slack, Whatsapp, Wikipedia, Stockmarket (public-API), Notion, etc.
          2. We can integrate with User's own backend services, if they have any, as we provide a webhook endpoint & also API-Docs to the user (which when triggered can do something) -
          3. We can integrate with User's own frontend apps, if they have any, as we provide a webhook endpoint & also API-Docs to the user (which when triggered can do something) - the user will have to integrate the API himself in the web app.
          ____
          WHAT WE ARE NOT CAPABLE OF:
          1. Building web apps/ mobile apps - anyhting frontend for the user (we can only connect to the users own frontend through a webhook that we provide or through a platform like an email, whatsapp, etc)
          ----
          HOW WE BUILD:
          - We write backend microservices (serverless functions) that will run via a webhook (meaning triggered from somewhere or inside our own app) or a cronjob (meaning scheduled to run).
          - In theese functions, we can integrate to any third-party API or platform & do any kind of task.
          - If it requires, We can create new databases, & maintain users data based on the task requirements.
          - If only a minor state management is needed in serverless fucntions, we can use redis to store minor data, in microservices, as a temp state for users task.
          `;
};

// - We write AI prompt based automation for the user's needs (meaning we can make a custom prompt for the users needs to do something more complex).

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
        content: `Analysing my capabilities to cross-verify the user's goal...`,
      });
      return getMicrofoxCapabilities();
    },
  });
};
