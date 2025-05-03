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

interface UpdateLambdaEnvVarsParams {
  functionName: string;
  environmentVariables: Record<string, string>;
  region?: string;
}

interface GetLambdaLogsParams {
  functionName: string;
  region?: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Updates environment variables for an AWS Lambda function
 * @param params UpdateLambdaEnvVarsParams object containing function details
 * @returns Promise that resolves when the update is complete
 */
export async function updateLambdaEnvironmentVariables({
  functionName,
  environmentVariables,
  region,
}: UpdateLambdaEnvVarsParams): Promise<void> {
  try {
    const lambdaClient = new LambdaClient({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
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
}: GetLambdaLogsParams): Promise<any[]> {
  try {
    const logsClient = new CloudWatchLogsClient({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });

    // Get the log stream name
    const logGroupName = `/aws/lambda/${functionName}`;
    console.log(logGroupName, "logGroupName");
    const describeLogStreamsCommand = new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: "LastEventTime",
      descending: true,
      limit: 1,
    });

    const logStreams = await logsClient.send(describeLogStreamsCommand);
    if (!logStreams.logStreams?.[0]?.logStreamName) {
      throw new Error("No log streams found for the Lambda function");
    }

    const logStreamName = logStreams.logStreams[0].logStreamName;

    // Get the log events
    const getLogEventsCommand = new GetLogEventsCommand({
      logGroupName,
      logStreamName,
      limit,
      startTime,
      endTime,
    });

    const logEvents = await logsClient.send(getLogEventsCommand);
    return logEvents.events ?? [];
  } catch (error) {
    console.error("Error fetching Lambda logs:", error);
    throw error;
  }
}
