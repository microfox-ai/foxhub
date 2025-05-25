import { CloudWatchLogEvent } from "@/types/aws";
import { calculateLambdaCost } from "../pricing/lambda";

export interface LambdaInvocation {
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
  endpointPath?: string;
  httpMethod?: string;
  costUSD: number;
}

interface FunctionDetails {
  functionName: string;
  endpointLink?: string;
  size?: string | number;
}

export function processLambdaLogs(
  logs: CloudWatchLogEvent[],
  functionDetails: FunctionDetails,
  docData?: { paths: Record<string, any> }
): LambdaInvocation[] {
  const invocations: LambdaInvocation[] = [];
  let currentInvocation: Partial<LambdaInvocation> = {};

  for (const log of logs) {
    const message = log.message;
    if (!message) continue;

    if (message.startsWith("START RequestId:")) {
      // Start of new invocation
      const requestIdMatch = message.match(/RequestId: ([a-f0-9-]+)/);
      if (!requestIdMatch?.[1]) continue;

      // Get endpoint details from OpenAPI spec
      let endpointPath: string | undefined;
      let httpMethod: string | undefined;
      if (functionDetails.endpointLink && docData?.paths) {
        const paths = docData.paths;
        for (const [path, methods] of Object.entries(paths)) {
          for (const [method, details] of Object.entries(
            methods as Record<string, any>
          )) {
            if (functionDetails.endpointLink?.includes(path)) {
              endpointPath = path;
              httpMethod = method.toUpperCase();
              break;
            }
          }
          if (endpointPath) break;
        }
      }

      currentInvocation = {
        requestId: requestIdMatch[1],
        timestamp: log.timestamp,
        additionalLogs: [],
        functionName: functionDetails.functionName,
        endpointPath,
        httpMethod,
      };
    } else if (message.startsWith("END RequestId:")) {
      // End of invocation
      const requestIdMatch = message.match(/RequestId: ([a-f0-9-]+)/);
      if (!requestIdMatch?.[1] || !currentInvocation.requestId) continue;

      if (requestIdMatch[1] === currentInvocation.requestId) {
        currentInvocation.endTimestamp = log.timestamp;
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
      const maxMemoryUsedMatch = metrics[4]?.match(/Max Memory Used: (\d+) MB/);
      const initDurationMatch = metrics[5]?.match(/Init Duration: ([\d.]+) ms/);

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
        costUSD: calculateLambdaCost(
          parseInt(memorySizeMatch[1]),
          parseFloat(durationMatch[1]),
          50
        ),
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

  return invocations;
}
