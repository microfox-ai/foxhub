import { getApiMcpsByPackageName } from "@/utils/services/embeddings/packageSearch";
import { NextRequest, NextResponse } from "next/server";
import { constructHeaders, getAuthOptions } from "@microfox/tool-kit";
import {
  fetchAuthSecrets,
  getVariablesForAuthObject,
} from "@/server/toolfox/helpers/fetchVariables";

interface AgentConfig {
  baseUrl: string;
  openApiSchema: any;
}

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
    openApiSchema: agent.metadata?.docs_data,
  };
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const [agentName, ...apiPathParts] = slug;
    const apiPath = apiPathParts.join("/");

    if (!agentName) {
      return NextResponse.json(
        { error: "Agent name is missing from URL path." },
        { status: 400 }
      );
    }

    const agentConfig = await getAgentConfig(agentName);

    if (!agentConfig) {
      return NextResponse.json(
        { error: `Agent '${agentName}' not found or is misconfigured.` },
        { status: 404 }
      );
    }

    // Reconstruct the full destination URL, preserving any query parameters.
    const destinationUrl = `${agentConfig.baseUrl}/${apiPath}${request.nextUrl.search}`;

    const headers = new Headers(request.headers);
    // The 'host' header is automatically set by fetch to the destination's host.
    // We must remove the original 'host' from the forwarded request.
    headers.delete("host");

    // Here is a good place to inject authentication for your internal services.
    // For example: headers.set('Authorization', `Bearer ${process.env.INTERNAL_API_KEY}`);

    //console.log("destinationUrl", destinationUrl);

    // Extract path and method from the request for auth
    const path = apiPath || "";
    const operation =
      agentConfig.openApiSchema?.paths?.[`/${path}`]?.[
        request.method.toLowerCase()
      ];

    //console.log("operation", operation?.operationId);

    // Get auth options from the OpenAPI schema and operation
    const authOptions = getAuthOptions(
      agentConfig.openApiSchema,
      operation || {}
    );

    // Fetch and process auth secrets
    const authSecrets = await fetchAuthSecrets(authOptions, {
      clientRequest: request as any, // Note: You might need to adapt the request object
      fillEncryptionKey: true,
      fillVariables: true,
    });

    // Get variables for auth object
    const authFilledOutput = await getVariablesForAuthObject(authSecrets, {
      clientRequest: request as any, // Note: You might need to adapt the request object
      refetchFromDb: false,
    });

    //console.log("authFilledOutput", authFilledOutput);
    // Construct auth headers using the helper function
    const authHeaders = constructHeaders(authFilledOutput);

    //console.log("request data", authHeaders, request.body, request.method);

    // insert the auth variables into the auth Header.
    const response = await fetch(destinationUrl, {
      method: request.method,
      headers: authHeaders,
      body: request.body,
      // The `duplex: 'half'` property is required to stream request bodies.
      // @ts-ignore
      duplex: "half",
      redirect: "manual",
    });

    //console.log("response", response);

    // The fetch response is a stream. We can return it directly to the client.
    return response;
  } catch (error) {
    console.error("Error in agent gateway:", error);
    return NextResponse.json(
      {
        error: "Internal server error in agent gateway",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
};
