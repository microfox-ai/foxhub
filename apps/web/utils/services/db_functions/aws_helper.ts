import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  GetFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";

interface UpdateLambdaEnvVarsParams {
  functionName: string;
  environmentVariables: Record<string, string>;
  region?: string;
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
