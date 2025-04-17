/**
 * Parses serverless logs to extract function information
 * @param serverlessLog The serverless log string to parse
 * @returns Array of objects containing function name and size
 */
export function parseServerlessLogs(
  serverlessLog: string
): Array<{ functionName: string; size: string }> {
  // Split the log into lines
  const lines = serverlessLog.split("\n");

  // Initialize result array
  const result: Array<{ functionName: string; size: string }> = [];

  // Process each line
  for (const line of lines) {
    // Skip empty lines and lines that don't contain function information
    if (!line.trim() || !line.includes(":")) continue;

    // Extract function name and size
    const match = line.match(/(\w+):\s+([^(]+)\s+\(([^)]+)\)/);
    if (match) {
      // We know these groups will exist based on our regex pattern
      const functionName = match[1] as string;
      const size = match[3] as string;

      result.push({
        functionName: functionName.trim(),
        size: size.trim(),
      });
    }
  }

  return result;
}
