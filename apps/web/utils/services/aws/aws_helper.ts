import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  GetFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
  DescribeLogStreamsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

export enum AWS_REGION {
  US_EAST_1 = "us-east-1",
}

interface UpdateLambdaEnvVarsParams {
  functionName: string;
  environmentVariables: Record<string, string>;
  region?: string;
}

interface RemoveLambdaEnvVarsParams {
  functionName: string;
  variableKeys: string[];
  region?: string;
}

interface GetLambdaLogsParams {
  functionName: string;
  region?: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
  streamLimit?: number;
}

/**
 * Updates environment variables for an AWS Lambda function
 * @param params UpdateLambdaEnvVarsParams object containing function details
 * @returns Promise that resolves when the update is complete
 */
export async function addLambdaEnvironmentVariables({
  functionName,
  environmentVariables,
  region,
}: UpdateLambdaEnvVarsParams): Promise<void> {
  try {
    console.log("region", region);
    console.log("functionName", functionName);
    const lambdaClient = new LambdaClient({
      region: region ?? process.env.AWS_REGION ?? AWS_REGION.US_EAST_1,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });

    // Get current configuration
    const getConfigCommand = new GetFunctionConfigurationCommand({
      FunctionName: functionName,
    });
    const currentConfig = await lambdaClient.send(getConfigCommand);
    const currentVariables = currentConfig.Environment?.Variables ?? {};

    // Merge variables
    const mergedVariables = {
      ...currentVariables,
      ...environmentVariables, // New variables overwrite existing ones
    };

    const command = new UpdateFunctionConfigurationCommand({
      FunctionName: functionName,
      Environment: {
        Variables: mergedVariables, // Use merged variables
      },
    });

    await lambdaClient.send(command);
    console.log(
      `Successfully updated environment variables for Lambda function: ${functionName}`
    );
  } catch (error) {
    console.error("Error updating Lambda environment variables:", error);
    throw error;
  }
}

export async function removeLambdaEnvironmentVariables({
  functionName,
  variableKeys,
  region,
}: RemoveLambdaEnvVarsParams): Promise<void> {
  try {
    console.log("region", region);
    console.log("functionName", functionName);
    const lambdaClient = new LambdaClient({
      region: region ?? process.env.AWS_REGION ?? AWS_REGION.US_EAST_1,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });

    // Get current configuration
    const getConfigCommand = new GetFunctionConfigurationCommand({
      FunctionName: functionName,
    });
    const currentConfig = await lambdaClient.send(getConfigCommand);
    const currentVariables = currentConfig.Environment?.Variables ?? {};

    // Remove specified keys
    variableKeys.forEach((key) => delete currentVariables[key]);

    const command = new UpdateFunctionConfigurationCommand({
      FunctionName: functionName,
      Environment: {
        Variables: currentVariables,
      },
    });

    await lambdaClient.send(command);
    console.log(
      `Successfully removed environment variables from Lambda function: ${functionName}`
    );
  } catch (error) {
    console.error("Error removing Lambda environment variables:", error);
    throw error;
  }
}

export const AWS_LAMBDA_LOG_GROUP_PREFIX = "/aws/lambda/";

export const AWS_LAMBDA_DEFAULT_REGION = AWS_REGION.US_EAST_1;
/**
 * Fetches logs from a Lambda function
 * @param params GetLambdaLogsParams object containing function details and log parameters
 * @returns Promise that resolves with the log events
 */
export async function getLambdaLogs({
  functionName,
  region,
  limit = 50,
  startTime,
  endTime,
  streamLimit = 1,
}: GetLambdaLogsParams): Promise<any[]> {
  try {
    const logsClient = new CloudWatchLogsClient({
      region: region ?? process.env.AWS_REGION ?? AWS_REGION.US_EAST_1,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });

    // Get all log streams
    const logGroupName = `/aws/lambda/${functionName}`;
    const describeLogStreamsCommand = new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: "LastEventTime",
      descending: true,
      limit: streamLimit,
    });

    const logGroup = await logsClient.send(describeLogStreamsCommand);
    if (!logGroup.logStreams || logGroup.logStreams.length === 0) {
      return [];
    }

    console.log(logGroup.logStreams.length, "logGroup.logStreams");
    // Fetch logs from all streams
    const allLogEvents = await Promise.all(
      logGroup.logStreams.map(async (stream) => {
        const getLogEventsCommand = new GetLogEventsCommand({
          logGroupName,
          logStreamName: stream.logStreamName,
          limit,
          startTime,
          endTime,
        });

        const logEvents = await logsClient.send(getLogEventsCommand);
        return logEvents.events ?? [];
      })
    );

    // Flatten and sort all log events by timestamp
    const flattenedLogs = allLogEvents
      .flat()
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    return flattenedLogs;
  } catch (error) {
    console.error("Error fetching Lambda logs:", error);
    throw error;
  }
}
