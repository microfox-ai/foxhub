import { NextResponse } from "next/server";
import { getLambdaLogs } from "../aws/aws_helper";
import { ClientDeployment } from "@prisma/client";
import { ClientDeploymentMetadata } from "@/server/types";
import {
  LambdaInvocation,
  processLambdaLogs,
} from "../aws/process-lambda-logs";

export interface LambdaUsageResult {
  invocations: LambdaInvocation[];
  totalComputeTime: number;
  totalMemoryUsed: number;
  totalInvocations: number;
  totalPrice: number;
  totalOriginalPrice: number;
}

export const getLambdaFunctionMap = (clientDeployment: ClientDeployment) => {
  const metadata =
    clientDeployment.metadata as unknown as ClientDeploymentMetadata;
  if (
    !metadata ||
    !metadata?.serverless?.functionBase ||
    !metadata?.serverless?.functions
  ) {
    throw new Error("Invalid deployment metadata");
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
        size: func.size,
      },
    ])
  );
  return functionMap;
};

export async function fetchLambdaUsage(
  requestId: string,
  clientDeployment: ClientDeployment,
  options: {
    pageSize?: number;
    streamLimit?: number;
    startTime?: number;
    endTime?: number;
  }
): Promise<LambdaUsageResult> {
  const allLogs = new Map<string, any[]>();

  const functionMap = getLambdaFunctionMap(clientDeployment);
  // Fetch logs for each function
  for (const [fullFunctionName] of functionMap) {
    const logs = await getLambdaLogs({
      functionName: fullFunctionName,
      region: "us-east-1",
      limit: (options.pageSize ?? 100) * 3,
      streamLimit: options.streamLimit ?? 5,
      startTime: options.startTime,
      endTime: options.endTime,
    });
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

  // Calculate usage metrics
  const totalComputeTime = invocations.reduce(
    (sum, inv) => sum + inv.billedDuration,
    0
  );
  const totalMemoryUsed = invocations.reduce(
    (sum, inv) => sum + inv.billedDuration,
    0
  );

  const totalPrice = invocations.reduce((sum, inv) => sum + inv.costUSD, 0);
  const totalOriginalPrice = invocations.reduce(
    (sum, inv) => sum + inv.originalCostUSD,
    0
  );
  const totalInvocations = invocations.length;

  return {
    invocations,
    totalComputeTime,
    totalMemoryUsed,
    totalInvocations,
    totalPrice,
    totalOriginalPrice,
  };
}
