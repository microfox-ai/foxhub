import {
  findApiMcps,
  plainSearchMcps,
} from "@/utils/services/embeddings/packageSearch";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    let query = searchParams.get("query");
    const match_threshold = searchParams.get("match_threshold");
    const match_count = searchParams.get("match_count");
    const api_type = searchParams.get("api_type");
    const query_type = searchParams.get("query_type"); // "rag_seach", "plain_search"

    // if (!query) {
    //   return NextResponse.json(
    //     { error: "Query parameter is required" },
    //     { status: 400 }
    //   );
    // }

    query = query && query.length > 0 ? query : "*";

    let mcps;

    if (query_type === "plain_search") {
      mcps = await plainSearchMcps({
        query,
        match_count: match_count ? parseInt(match_count) : 10,
        ...(api_type ? { api_type } : {}),
      });
    } else {
      mcps = await findApiMcps({
        query,
        match_threshold: match_threshold ? parseFloat(match_threshold) : 0.5,
        match_count: match_count ? parseInt(match_count) : 10,
        api_type: api_type ?? "package-sls",
      });
    }

    const _mcps = mcps.filter((mcp) => mcp.type === "package-sls");
    const _agents = mcps.filter((mcp) => mcp.type === "agent-sls");
    return NextResponse.json(
      { mcps: _mcps, agents: _agents, mixed: mcps },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error searching for mcps:", error);
    return NextResponse.json(
      { error: "Failed to search for mcps" },
      { status: 500 }
    );
  }
}
