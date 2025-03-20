import { models } from "@/server/models";
import { streamText } from "ai";

export const analyzeUsersIntent = (userIntent: string, messages: any[]) => {
  return streamText({
    model: models.googleGeminiFlash,
    messages: messages,
    system: `
        - you deep-analyse the users goal from his intent. 
        - you respond back with questions if needed more clarity
        - if the goal is clear, you just explain & summarize the users end-goal with steps to take & info to collect later. 
        The user's intent is: ${userIntent}. Reference the previous messages to understand the user's intent better.
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
    `,
  });
};
