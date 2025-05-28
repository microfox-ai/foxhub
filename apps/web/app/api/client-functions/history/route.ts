import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { getLambdaLogs } from "@/utils/services/aws/aws_helper";
import { NextRequest, NextResponse } from "next/server";
import {
  LambdaInvocation,
  processLambdaLogs,
} from "@/utils/services/aws/process-lambda-logs";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clientRequestId = searchParams.get("clientRequestId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "30");

    if (!clientRequestId) {
      return NextResponse.json(
        { error: "clientRequestId is required" },
        { status: 400 }
      );
    }

    // Get client deployment from client request
    const clientDeployment = await prisma.clientDeployment.findFirst({
      where: {
        originClientRequestId: clientRequestId,
      },
    });

    if (!clientDeployment) {
      return NextResponse.json(
        { error: "Client deployment not found" },
        { status: 404 }
      );
    }

    const metadata =
      clientDeployment.metadata as unknown as ClientDeploymentMetadata;
    if (
      !metadata?.serverless?.functionBase ||
      !metadata?.serverless?.functions
    ) {
      return NextResponse.json(
        { error: "Invalid deployment metadata" },
        { status: 400 }
      );
    }

    const functionBase = metadata.serverless.functionBase;
    const functions = metadata.serverless.functions;

    // Create a map of function names to their details
    const functionMap = new Map(
      functions.map((func) => [
        `${functionBase}-${func.functionName}`,
        {
          functionName: func.functionName,
          endpointLink: func.endpointLink,
        },
      ])
    );

    // Get logs from all functions
    const allLogs = new Map<string, any[]>();
    for (const [fullFunctionName] of functionMap) {
      const logs = await getLambdaLogs({
        functionName: fullFunctionName,
        region: "us-east-1",
        limit: pageSize * 3, // Fetch more logs to ensure we have enough complete invocations
        streamLimit: 5,
      });
      console.log(fullFunctionName, logs.length);
      allLogs.set(fullFunctionName, logs);
    }

    // Process logs to extract invocation details
    const invocations: LambdaInvocation[] = [];

    // Iterate through each function's logs
    for (const [fullFunctionName, logs] of allLogs) {
      const functionDetails = functionMap.get(fullFunctionName);
      if (!functionDetails) continue;

      const functionInvocations = processLambdaLogs(
        logs,
        functionDetails,
        (clientDeployment as any).metadata?.docData
      );
      invocations.push(...functionInvocations);
    }

    // Sort invocations by timestamp in descending order
    invocations.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInvocations = invocations.slice(startIndex, endIndex);

    return NextResponse.json({
      invocations: paginatedInvocations,
      total: invocations.length,
      page,
      pageSize,
      totalPages: Math.ceil(invocations.length / pageSize),
    });
  } catch (error) {
    console.error("Error fetching Lambda history:", error);
    return NextResponse.json(
      { error: "Failed to fetch Lambda history" },
      { status: 500 }
    );
  }
}
