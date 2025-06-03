import { NextResponse } from "next/server";
import { models } from "@/server/models";
import { generateText } from "ai";
import { toolSelection } from "@/server/slsfox/toolSelection";
import { prisma } from "@/prisma/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate required parameters
    const botProjectId = searchParams.get("botProjectId") as string;
    const clientSecretIdsParam = searchParams.get("clientSecretIds");
    const prompt = searchParams.get("prompt");

    if (!clientSecretIdsParam) {
      return NextResponse.json(
        { error: "clientSecretIds parameter is required" },
        { status: 400 }
      );
    }

    const clientSecretIds = clientSecretIdsParam.split(",").filter(id => id.trim());
    if (clientSecretIds.length === 0) {
      return NextResponse.json(
        { error: "At least one valid clientSecretId is required" },
        { status: 400 }
      );
    }

    let clientSecrets;
    try {
      clientSecrets = await prisma.clientSecret.findMany({
        where: {
          id: {
            in: clientSecretIds,
          },
        },
      });

      if (clientSecrets.length === 0) {
        return NextResponse.json(
          { error: "No client secrets found for the provided IDs" },
          { status: 404 }
        );
      }

      console.log(`✅ Found ${clientSecrets.length} client secrets`);
    } catch (dbError) {
      console.error("❌ Database error fetching client secrets:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch client secrets from database" },
        { status: 500 }
      );
    }

    const userId = "U06NE7XFEJU";
    // const channelId = "C0747DURBHT";
    const senderEmail = "ai@reply-bots.com";
    const senderName = "AI";
    const recipientEmail = "vishwajeety14122@gmail.com";

    // Example prompts for testing
    const testPrompts = [
      `Send an email to ${recipientEmail} from ${senderEmail} with name ${senderName} with subject 'Test Email' and body 'Hello from the AI assistant!'`,
      `Send a slack text message to ${userId} and email to ${recipientEmail} from ${senderEmail} with name ${senderName} saying 'Hello from the AI assistant!'`,
      `Post a message to slack channel ${userId}`,
    ];

    const userPrompt = prompt || testPrompts[1] as string;

    if (!userPrompt || userPrompt.trim() === '') {
      return NextResponse.json(
        { error: "User prompt is required and cannot be empty" },
        { status: 400 }
      );
    }

    console.log(`🚀 Processing request with prompt: "${userPrompt}"`);

    let toolSelectionResult;
    try {
      toolSelectionResult = await toolSelection(userPrompt, clientSecrets, botProjectId);
    } catch (toolError) {
      console.error("❌ Tool selection failed:", toolError);
      return NextResponse.json(
        {
          error: "Tool selection failed",
          details: toolError instanceof Error ? toolError.message : String(toolError)
        },
        { status: 500 }
      );
    }

    const { allTools, tasks, errors: toolSelectionErrors } = toolSelectionResult;

    // Log tool selection results
    console.log(`📊 Tool selection results:`);
    console.log(`  - Tasks: ${tasks.length}`);
    console.log(`  - Tools: ${Object.keys(allTools).length}`);
    console.log(`  - Errors: ${toolSelectionErrors?.length || 0}`);

    // Now use generateText with all tools to execute the user prompt
    if (Object.keys(allTools).length > 0) {
      try {
        console.log("🤖 Executing tasks with AI...");
        console.log(`🔍 Tools:`, allTools);

        const { usage: execUsage, text: execResult } = await generateText({
          model: models.claude35Sonnet,
          tools: allTools,
          system: `You are an expert API task executor. Your role is to analyze user requests, select appropriate tools, and execute them efficiently to accomplish the requested tasks.

## AVAILABLE TOOLS & CAPABILITIES

You have access to the following task types and providers:
${tasks.map(t => `• ${t.provider}: ${t.action} - ${t.description}`).join('\n')}

## EXECUTION STRATEGY

1. **Task Analysis**: Break down the user request into specific actionable tasks
2. **Tool Selection**: Choose the most appropriate tool(s) for each task
3. **Sequential Execution**: Execute tools in logical order when multiple tasks are involved
4. **Result Validation**: Verify successful completion and provide clear feedback

## PARAMETER GUIDELINES - MINIMAL APPROACH

**REQUIRED PARAMETERS ONLY**: 
- Include ONLY parameters that are absolutely required for tool functionality
- Validate you have minimum required information before executing
- Never add parameters "just in case" - be minimal and precise

**OPTIONAL PARAMETERS - STRICT RULES**:
- Include ONLY if explicitly mentioned by the user in their request
- Do NOT include optional parameters for "better functionality" unless user specifically asks
- Do NOT add default values unless the user explicitly requests them
- When in doubt, exclude the optional parameter completely
- IGNORE SLACK'S BLOCKS AND ATTACHMENTS UNLESS USER SPECIFICALLY ASKS FOR THEM

**PARAMETER MINIMALISM**:
- Use the smallest set of parameters possible to complete the task
- Prefer fewer parameters over more parameters
- Only use what the user specifically provided or what's absolutely required
- Ignore all optional fields unless user explicitly mentions them

**Value Handling**:
- Use exact values provided by user without modification
- Preserve user formatting and specifications
- Don't interpret or change user-provided data unless necessary
- Don't add extra context or metadata unless required

## ERROR HANDLING & RECOVERY

**On Tool Failures**:
- Acknowledge the specific failure clearly
- Explain what went wrong and why
- Continue with remaining tasks if possible
- Provide actionable suggestions for resolution

**On Missing Information**:
- Clearly state what information is missing
- Explain why it's needed for task completion
- Don't make assumptions - ask for clarification

## SUCCESS REPORTING

For each completed task:
- Confirm successful execution
- Summarize what was accomplished
- Provide relevant details or IDs when applicable
- Give clear status on overall request completion

CRITICAL: Always use the absolute minimum parameters needed. When in doubt, use fewer parameters, not more.`,
          prompt: `User Request: ${userPrompt}

Please analyze this request, identify the required tasks, and execute them using the available tools. Provide clear feedback on the results.`,
        });

        console.log("🎯 Execution usage:", execUsage);
        console.log("✅ Execution completed successfully");

        // Return comprehensive results
        return NextResponse.json({
          message: "Tasks processed and executed successfully",
          userPrompt,
          parsedTasks: tasks,
          totalTasks: tasks.length,
          tasksByProvider: tasks.reduce((acc, task) => {
            if (!acc[task?.provider]) {
              acc[task?.provider] = [];
            }
            acc[task?.provider]?.push(task);
            return acc;
          }, {} as Record<string, Array<{ provider: string; action: string; description: string }>>),
          totalToolsCreated: Object.keys(allTools).length,
          executionResult: execResult,
          executionUsage: execUsage,
          warnings: toolSelectionErrors,
        });

      } catch (execError) {
        console.error("❌ Error executing tasks:", execError);
        return NextResponse.json({
          message: "Tasks parsed and APIs found, but execution failed",
          userPrompt,
          parsedTasks: tasks,
          totalToolsCreated: Object.keys(allTools).length,
          executionError: execError instanceof Error ? execError.message : "Unknown execution error",
          warnings: toolSelectionErrors,
        }, { status: 500 });
      }
    }

    // Return results when no tools were created
    const hasErrors = toolSelectionErrors && toolSelectionErrors.length > 0;
    return NextResponse.json({
      message: hasErrors ? "Prompt processed with errors" : "Prompt parsed successfully",
      userPrompt,
      parsedTasks: tasks,
      totalTasks: tasks.length,
      tasksByProvider: tasks.reduce((acc, task) => {
        if (!acc[task?.provider]) {
          acc[task?.provider] = [];
        }
        acc[task?.provider]?.push(task);
        return acc;
      }, {} as Record<string, Array<{ provider: string; action: string; description: string }>>),
      totalToolsCreated: 0,
      errors: toolSelectionErrors,
    }, { status: hasErrors ? 422 : 200 });

  } catch (error) {
    console.error("❌ Critical error in API request:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
