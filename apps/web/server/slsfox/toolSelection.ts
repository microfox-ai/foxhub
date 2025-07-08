// import { models } from "@/server/models";
// import { generateObject } from "ai";
// import { z } from "zod";
// import {
//   ApiSearchResult,
//   searchPublicApis,
//   searchProjectApis,
// } from "../toolfox/helpers/queryApis";
// import {
//   createOpenAPIToolsClient,
//   ToolSet,
// } from "@/utils/services/OpenAPIToolsClient";
// import { createClient } from "@supabase/supabase-js";
// import { ClientSecret } from "@prisma/client";
// import { addAuthFromSchema } from "./addAuthVars";

// // Define schema for parsing user prompts into service-based tasks
// const TasksSchema = z.array(
//   z.object({
//     provider: z
//       .string()
//       .describe(
//         "The service provider (e.g., 'slack', 'google-sheets', 'discord', 'aws-ses', etc.)"
//       ),
//     action: z
//       .string()
//       .describe(
//         "The specific action to perform (e.g., 'send message', 'add data', 'send email', etc.)"
//       ),
//     description: z
//       .string()
//       .describe("A clear description of what needs to be done"),
//   })
// );

// type Tasks = z.infer<typeof TasksSchema>;

// export const toolSelection = async (
//   userPrompt: string,
//   clientSecrets: ClientSecret[],
//   botProjectId?: string
// ): Promise<{ allTools: ToolSet; tasks: Tasks; errors?: string[] }> => {
//   const errors: string[] = [];

//   try {
//     // Validate inputs
//     if (
//       !userPrompt ||
//       typeof userPrompt !== "string" ||
//       userPrompt.trim() === ""
//     ) {
//       throw new Error("User prompt is required and must be a non-empty string");
//     }

//     if (!Array.isArray(clientSecrets)) {
//       throw new Error("Client secrets must be an array");
//     }

//     console.log(`🔍 Processing user prompt: "${userPrompt}"`);
//     console.log(`📋 Available client secrets: ${clientSecrets.length}`);

//     const supabase = createClient(
//       process.env.EMBEDDING_SUPABASE_URL!,
//       process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!
//     );

//     // Generate response using AI
//     let result;
//     let usage: any;

//     try {
//       const response = await generateObject({
//         model: models.googleGeminiPro,
//         schema: TasksSchema,
//         system: `
//                   You are an AI assistant that parses user requests and categorizes them into specific service-based tasks.

//                   When a user provides a prompt, analyze it and break it down into individual tasks based on the service providers involved.

//                   Common service providers include:
//                   - slack: for sending messages, getting conversation history
//                   - google-sheets: for saving data, updating spreadsheets
//                   - email/aws-ses: for sending emails
//                   - database: for storing/retrieving data
//                   - file-storage: for saving files

//                   For each task, identify:
//                   1. The service provider
//                   2. The specific action to perform
//                   3. A clear description

//                   Example: "save user details in google sheet and send slack message to my channel"
//                   Should be parsed into:
//                   1. Provider: google-sheets, Action: add data, Description: save user details to spreadsheet
//                   2. Provider: slack, Action: send message, Description: send message to channel
//                 `,
//         prompt: `Parse this user request into service-based tasks: "${userPrompt}"`,
//       });

//       result = response.object;
//       usage = response.usage;
//     } catch (aiError) {
//       const errorMsg = `Failed to parse user prompt with AI: ${aiError instanceof Error ? aiError.message : String(aiError)}`;
//       console.error("❌", errorMsg);
//       errors.push(errorMsg);
//       return { allTools: {}, tasks: [], errors };
//     }

//     const tasks = result;
//     console.log("🎯 AI Usage:", usage);
//     console.log(`📋 Parsed ${tasks.length} tasks:`, tasks);

//     if (tasks.length === 0) {
//       console.warn("⚠️ No tasks were parsed from the user prompt");
//       return {
//         allTools: {},
//         tasks: [],
//         errors: ["No tasks could be parsed from the user prompt"],
//       };
//     }

//     // Search for APIs for each task and create tools
//     let allTools: ToolSet = {};
//     let taskApiMappings: Array<{
//       task: any;
//       apis: any[];
//     }> = [];

//     for (const task of tasks) {
//       try {
//         console.log(`🔍 Searching APIs for task: ${task.description}`);

//         // Search query combining provider, action, and description
//         const searchQuery = `Provider: ${task.provider}\nAction: ${task.action}\nDescription: ${task.description}`;

//         // Search APIs based on whether botProjectId is provided
//         let apis: ApiSearchResult[] = [];
//         try {
//           if (botProjectId) {
//             const projectApis = await searchProjectApis({
//               projectId: botProjectId,
//               query: searchQuery,
//               limit: 5,
//             });
//             apis = [
//               ...apis,
//               ...projectApis.filter((api) => api.similarity > 1.5),
//             ];
//           }
//           const publicApis = await searchPublicApis({
//             query: searchQuery,
//             limit: 5,
//           });
//           apis = [...apis, ...publicApis.filter((api) => api.similarity > 1.5)];
//         } catch (searchError) {
//           const errorMsg = `Failed to search APIs for task "${task.description}": ${searchError instanceof Error ? searchError.message : String(searchError)}`;
//           console.error("❌", errorMsg);
//           errors.push(errorMsg);
//           continue;
//         }

//         console.log(
//           `📋 Found ${apis.length} APIs for task: ${task.description}`
//         );
//         taskApiMappings.push({ task, apis });

//         if (apis.length === 0) {
//           console.warn(`⚠️ No APIs found for task: ${task.description}`);
//           errors.push(`No APIs found for task: ${task.description}`);
//           continue;
//         }

//         let toolWrapperInput = [];

//         // Create tools from found APIs
//         for (const api of apis) {
//           try {
//             const { data: apiData, error: apiError } = await supabase
//               .from("api_embeddings")
//               .select("metadata,http_method")
//               .eq("id", api.id)
//               .single();

//             if (apiError) {
//               const errorMsg = `Database error fetching API ${api.id}: ${apiError.message}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             if (!api.base_url) {
//               const errorMsg = `No base_url found for API ${api.id}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             if (!apiData?.metadata) {
//               const errorMsg = `No metadata found for API ${api.id}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             if (!apiData?.metadata.openApiSchema) {
//               const errorMsg = `Missing openApi schema for API ${api.id}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             if (!apiData?.metadata.endpointSchema) {
//               const errorMsg = `Missing endpoint schema for API ${api.id}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             if (!api.endpoint_path) {
//               const errorMsg = `Missing endpoint_path for API ${api.id}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             if (!apiData?.http_method) {
//               const errorMsg = `Missing http_method for API ${api.id}`;
//               console.error("❌", errorMsg);
//               errors.push(errorMsg);
//               continue;
//             }

//             console.log(
//               `✅ Retrieved API data for: ${apiData?.http_method} ${api.base_url}${api.endpoint_path}`
//             );

//             const openApiSchema = apiData?.metadata.openApiSchema;
//             const path = api.endpoint_path;
//             const method = apiData?.http_method.toLowerCase();
//             let methodSchema = apiData?.metadata.endpointSchema;
//             let pathSchema = {
//               [method]: methodSchema,
//             };

//             let singlePathOpenApiSchema = {
//               openapi: openApiSchema.openapi,
//               info: openApiSchema.info,
//               servers: openApiSchema.servers,
//               paths: {
//                 [path]: pathSchema,
//               },
//             };

//             // Extract authentication and package name from the original schema
//             const authResult = addAuthFromSchema(
//               pathSchema[method],
//               clientSecrets
//             );
//             if (authResult.error) {
//               console.error("❌ Error extracting auth:", authResult.error);
//               errors.push(
//                 `Failed to extract auth for API ${api.id}: ${authResult.error}`
//               );
//               // Continue with empty preset body rather than failing completely
//             }

//             console.log("🔧 Preset body for API:", authResult.presetBody);

//             toolWrapperInput.push({
//               schema: singlePathOpenApiSchema,
//               baseUrl: api.base_url,
//               headers: {},
//               presetBodyFields: authResult.presetBody,
//             });
//           } catch (apiError) {
//             const errorMsg = `Error processing API ${api.base_url}${api.endpoint_path}: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
//             console.error("❌", errorMsg);
//             errors.push(errorMsg);
//             continue;
//           }
//         }

//         if (toolWrapperInput.length === 0) {
//           const errorMsg = `No valid tools could be created for task: ${task.description}`;
//           console.warn("⚠️", errorMsg);
//           errors.push(errorMsg);
//           continue;
//         }

//         console.log(`🛠️ Creating client for ${toolWrapperInput.length} tools`);

//         // Create client for this API
//         try {
//           const client = await createOpenAPIToolsClient(toolWrapperInput);
//           const toolSet = await client.tools();
//           allTools = toolSet.tools;

//           // Merge the toolSet into allTools object
//           console.log(
//             `🛠️ Created ${Object.keys(allTools).length} tools for task: ${task.description}`
//           );
//         } catch (clientError) {
//           const errorMsg = `Failed to create OpenAPI client for task "${task.description}": ${clientError instanceof Error ? clientError.message : String(clientError)}`;
//           console.error("❌", errorMsg);
//           errors.push(errorMsg);
//           continue;
//         }
//       } catch (taskError) {
//         const errorMsg = `Error processing task "${task.description}": ${taskError instanceof Error ? taskError.message : String(taskError)}`;
//         console.error("❌", errorMsg);
//         errors.push(errorMsg);
//         continue;
//       }
//     }

//     console.log(
//       `🎉 Successfully created ${Object.keys(allTools).length} total tools from ${tasks.length} tasks`
//     );

//     if (errors.length > 0) {
//       console.warn(`⚠️ Completed with ${errors.length} warnings/errors`);
//     }

//     // console.log(`🛠️ All tools: ${JSON.stringify(allTools, null, 2)}`);

//     return { allTools, tasks, errors: errors.length > 0 ? errors : undefined };
//   } catch (error) {
//     const errorMessage = `Critical error in tool selection: ${error instanceof Error ? error.message : String(error)}`;
//     console.error("❌", errorMessage);
//     return { allTools: {}, tasks: [], errors: [errorMessage] };
//   }
// };
