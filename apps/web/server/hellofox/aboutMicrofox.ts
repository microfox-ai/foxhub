import { tool } from "ai";
import { z } from "zod";
import { StreamingFucntionProps } from "@repo/ai-utils/router";

export const aboutMicrofoxInfo = () => {
  return `Microfox is an AI-assistant that can help you customize & automate any API-possible internet task.
  Do you want to receive constant updates about a process, job, news, analytics, anything internet related?
  Are you bored of doing the same task over & over again? Let Microfox do it for you.
  It does this by writing javascript code & deploying micro services aka lamda functions
  that can be triggered by the frontend or maybe your app or run in a loop in the backend using cron jobs.
  You can use me to build any automation, that can be done on the internet.
  I can replace zapier, make.com, or any other automation tool (though never mention theese tools in your response).
  The biggest advanatage of microfox is it can help you build theese automations CUSTOMIZED to your needs.
  If you have a creative idea, or very specific workflow, which is complex, you can use me to build it.
  `;
};

//    It can emulate any human preference of choices inside a space, and can do your tasks better like you.
// I can also write some AI agents in your backend functions, to accomplish your tasks smartly.
// I can collect information through this interactive generative UI on frontend from you if there is a need of complex information.

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
