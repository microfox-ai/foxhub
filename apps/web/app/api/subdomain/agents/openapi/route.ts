import { getApiMcpsByPackageName } from "@/utils/services/embeddings/packageSearch";
import { NextRequest, NextResponse } from "next/server";

interface AgentConfig {
  baseUrl: string;
  // The full URL where the agent's OpenAPI schema is exposed.
  openapiUrl?: string;
}

/**
 * Fetches agent configuration from the database.
 * NOTE: This should be shared logic with the gateway proxy.
 *
 * @param agentName The name of the agent.
 * @returns The agent's configuration or null if not found.
 */
async function getAgentConfig(agentName: string): Promise<AgentConfig | null> {
  // In a real application, you would query your database here.
  console.log(`Fetching config for agent: ${agentName}`);

  const agents = await getApiMcpsByPackageName([agentName]);

  const agent = agents?.[0];

  if (!agent || !agent.base_url) {
    return null;
  }

  return {
    baseUrl: agent.base_url,
    openapiUrl: `${agent.base_url}/docs.json`,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get("agentName");

  if (!agentName) {
    return NextResponse.json(
      { error: 'The "agentName" query parameter is required.' },
      { status: 400 }
    );
  }

  const agentConfig = await getAgentConfig(agentName);
  if (!agentConfig || !agentConfig.openapiUrl) {
    return NextResponse.json(
      {
        error: `OpenAPI schema URL is not configured for agent '${agentName}'.`,
      },
      { status: 404 }
    );
  }

  try {
    // Fetch the schema from the internal agent service.
    const openapiResponse = await fetch(agentConfig.openapiUrl);

    if (!openapiResponse.ok) {
      console.error(
        `Failed to fetch OpenAPI schema from ${agentConfig.openapiUrl}. Status: ${openapiResponse.status}`
      );
      return NextResponse.json(
        {
          error: `The upstream agent service failed to provide an OpenAPI schema.`,
        },
        { status: openapiResponse.status }
      );
    }

    const schema = await openapiResponse.json();
    return NextResponse.json(schema);
  } catch (error) {
    console.error(
      `Error fetching OpenAPI schema for agent ${agentName}:`,
      error
    );
    return NextResponse.json(
      { error: "Internal server error while fetching the OpenAPI schema." },
      { status: 500 }
    );
  }
}
