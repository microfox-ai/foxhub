import { tool } from "ai";
import { z } from "zod";
import { StreamingFucntionProps } from "@repo/ai-utils/router";

export const aboutMicrofox = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description:
      "Fetches & Sends infrormation about Microfox based on user query / doubts / needs ? & his chat context",
    parameters: z.object({
      query: z.string().describe("The query from the user"),
    }),
    execute: async ({ query }, options) => {
      // RAG SETUP IN FUTURE
      return {
        text: `Microfox is an AI-assistant that can help you accesss & automate any API-possible internet task. 
            It does this by writing javascript code & deploying micro services aka lamda functions
             that can be triggered by the frontend or run in a loop in the backend using cron jobs.
             You can use me to build any automation, that can be done on the internet.
             I can replace zapier, make.com, or any other automation tool.
             I can also write some AI agents in your backend functions, to accomplish your tasks smartly.
             I can collect information through this interactive generative UI on frontend from you if there is a need of complex information.`,
      };
    },
  });
};
