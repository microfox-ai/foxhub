import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { getLambdaLogs } from "@/utils/services/db_functions/aws_helper";
import { NextRequest, NextResponse } from "next/server";

interface LambdaInvocation {
  requestId: string;
  timestamp: number;
  duration: number;
  billedDuration: number;
  memorySize: number;
  maxMemoryUsed: number;
  initDuration: number;
  endTimestamp?: number;
  additionalLogs: string[];
  functionName: string;
}

interface CloudWatchLogEvent {
  message: string;
  timestamp: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientRequestId, page = 1, pageSize = 30 } = body;

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

    // Get logs from all functions
    const allLogs: CloudWatchLogEvent[] = [];
    for (const func of functions) {
      const functionName = `${functionBase}-${func.functionName}`;
      const logs = await getLambdaLogs({
        functionName,
        region: "us-east-1",
        limit: pageSize * 3, // Fetch more logs to ensure we have enough complete invocations
      });
      allLogs.push(...logs);
    }

    // Process logs to extract invocation details
    const invocations: LambdaInvocation[] = [];
    let currentInvocation: Partial<LambdaInvocation> = {};

    for (const log of allLogs) {
      const cloudWatchLog = log as CloudWatchLogEvent;
      const message = cloudWatchLog.message;
      if (!message) continue;

      if (message.startsWith("START RequestId:")) {
        // Start of new invocation
        const requestIdMatch = message.match(/RequestId: ([a-f0-9-]+)/);
        if (!requestIdMatch?.[1]) continue;

        // Extract function name from the log group name
        const functionNameMatch = message.match(/\/aws\/lambda\/([^:]+)/);
        const functionName = functionNameMatch?.[1] || "unknown";

        currentInvocation = {
          requestId: requestIdMatch[1],
          timestamp: cloudWatchLog.timestamp,
          additionalLogs: [],
          functionName,
        };
      } else if (message.startsWith("END RequestId:")) {
        // End of invocation
        const requestIdMatch = message.match(/RequestId: ([a-f0-9-]+)/);
        if (!requestIdMatch?.[1] || !currentInvocation.requestId) continue;

        if (requestIdMatch[1] === currentInvocation.requestId) {
          currentInvocation.endTimestamp = cloudWatchLog.timestamp;
        }
      } else if (message.startsWith("REPORT RequestId:")) {
        // End of invocation with metrics
        const metrics = message.split("\t");
        if (metrics.length < 6) continue;

        const durationMatch = metrics[1]?.match(/Duration: ([\d.]+) ms/);
        const billedDurationMatch = metrics[2]?.match(
          /Billed Duration: (\d+) ms/
        );
        const memorySizeMatch = metrics[3]?.match(/Memory Size: (\d+) MB/);
        const maxMemoryUsedMatch = metrics[4]?.match(
          /Max Memory Used: (\d+) MB/
        );
        const initDurationMatch = metrics[5]?.match(
          /Init Duration: ([\d.]+) ms/
        );

        if (
          !durationMatch?.[1] ||
          !billedDurationMatch?.[1] ||
          !memorySizeMatch?.[1] ||
          !maxMemoryUsedMatch?.[1] ||
          !initDurationMatch?.[1] ||
          !currentInvocation.requestId
        ) {
          continue;
        }

        invocations.push({
          ...(currentInvocation as LambdaInvocation),
          duration: parseFloat(durationMatch[1]),
          billedDuration: parseInt(billedDurationMatch[1]),
          memorySize: parseInt(memorySizeMatch[1]),
          maxMemoryUsed: parseInt(maxMemoryUsedMatch[1]),
          initDuration: parseFloat(initDurationMatch[1]),
        });
        currentInvocation = {};
      } else if (currentInvocation.requestId) {
        // Add any other logs to the current invocation's metadata
        const requestIdMatch = message.match(/RequestId: ([a-f0-9-]+)/);
        if (requestIdMatch?.[1] === currentInvocation.requestId) {
          currentInvocation.additionalLogs =
            currentInvocation.additionalLogs || [];
          currentInvocation.additionalLogs.push(message);
        }
      }
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
