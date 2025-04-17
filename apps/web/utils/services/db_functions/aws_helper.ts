import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";

interface UpdateLambdaEnvVarsParams {
  functionName: string;
  environmentVariables: Record<string, string>;
  region: string;
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
      region: region ?? process.env.AWS_REGION,
    });

    const command = new UpdateFunctionConfigurationCommand({
      FunctionName: functionName,
      Environment: {
        Variables: environmentVariables,
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
