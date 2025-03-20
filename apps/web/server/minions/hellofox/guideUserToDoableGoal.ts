import { models } from "@/server/models";
import { streamText } from "ai";

export const guideUserToDoableGoal = (
  initialGoal: string,
  missingCapabilities: string,
  messages: any[]
) => {
  return streamText({
    model: models.googleGeminiFlash,
    system: `
        You are an expert in what our software is capable of doing, & can either guide or clarify the user's goal.

        The user does not understand all the complex code & technical jargon, so you need to guide the user in a way that is easy to understand
          `,
    prompt: `The user's initial goal is: ${initialGoal}.
        Think what to clarify with the user to get a basic & clear understanding of the goal.
        Return the question that you think is most likely to help in clarifying the user's goal.
        `,
  });
};
