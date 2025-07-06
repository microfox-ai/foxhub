import { MinionType } from "@/components/screens/hooks/convertors";
import { findLastElementWith } from "@/utils/helpers/array";
import { AiRouter, findLastElement, getTextParts, getTextPartsContent } from "@microfox/ai-router";


const toolSelectionAgent = new AiRouter<any>();

toolSelectionAgent.use("/", async (ctx, next) => {
    const { request, state, response } = ctx;
    response.writeMessageMetadata({
        MinionType: MinionType.ToolFox,
    });
    return next();
});

toolSelectionAgent.agent("/", async (ctx) => {
    const { request, state, response } = ctx;

    console.log("toolSelectionAgent", request.messages);

    const lastUserMessage = findLastElementWith(request.messages, (message: any) => message.role === "user");

    if (!lastUserMessage) {
        throw new Error("No user message found");
    }

    const userMessage = getTextPartsContent(lastUserMessage);

    console.log("last userMessage", userMessage);

    // 1. generate a list of RAG search query to find the best package/agent 
    // {mcpSearchQuery: "search query to find the correct API/MCP/Agent", 
    // toolSearchQuery: "search query to find the correct tools inside this MCP/API/Agent"}

    //2. Do RAG search to find the best matching api_mcps
    //3. for each top api_mcp (again do rag search for tools)

    //3. call the next agent with the tools passed in. (Leave this to me.)

});