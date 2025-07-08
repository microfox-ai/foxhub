// import { findLastElementWith } from "@/utils/helpers/array";
// import { AiHandler } from "@microfox/ai-router";
// import { generateObject } from "ai";
// import { z } from "zod";
// import { buildFoxRouter } from "../buildfox/_buildFoxRouter";
// import { models } from "../models";

// // Tight control required on this route as this burns MOOOOOOOONEEEEEEY
// export const modifyFoxRouter: AiHandler<any, any, any> = async (props) => {
//   const { request, state, response, next } = props;
//   if (!request.messages) return;

//   const lastUsersMessage = findLastElementWith(
//     request.messages as any[],
//     (message) => message.role === "user"
//   );
//   if (!lastUsersMessage) return;

//   const lastUsersMessageContent = lastUsersMessage.content;

//   const result = await generateObject({
//     model: models.googleGeminiPro,
//     schema: z.object({
//       intent: z.enum([
//         "Modify-Task",
//         "Add-Features",
//         "Rebuild-App",
//         "Redeploy-App",
//         "Casual-Chat",
//       ]),
//       reason: z.string(),
//     }),
//     system: `
//             We are building an automation for the user.
//             In the middle of the conversation, user has sent the following message,
//             we need to detect the exact intent of the user to understand what they want to do.

//             CRITICAL:
//             If the user is asking for even a tiny change/modification, then always pass the intent as "Modify-Task"
//             If the user is asking for a new feature, then pass the intent as "Add-Features"
//         `,
//     prompt: `
//             The user has sent the following message:
//             ${lastUsersMessageContent}
//         `,
//   });

//   response.writeMessageMetadata({
//     loader: "Thinking about the user's intent: " + result.object.intent,
//   });

//   if (result.object.intent === "Modify-Task") {
//     return next.callAgent("/convertfox", props);
//   }

//   if (result.object.intent === "Add-Features") {
//     return next.callAgent("/hellofox/task-query", props);
//   }

//   if (result.object.intent === "Casual-Chat") {
//     return next.callAgent("/hellofox/casual", props);
//   }

//   if (result.object.intent === "Rebuild-App") {
//     return buildFoxRouter(props);
//   }

//   if (result.object.intent === "Redeploy-App") {
//     return next.callAgent("/deployfox", props);
//   }

//   return;
// };
