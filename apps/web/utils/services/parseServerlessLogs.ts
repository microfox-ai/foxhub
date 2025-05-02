/**
 * Parses serverless logs to extract function information and their corresponding endpoints
 * @param serverlessLog The serverless log string to parse
 * @returns Array of objects containing function name, size, and endpoint link
 */
export function parseServerlessLogs(
  serverlessLog: string
): Array<{ functionName: string; size: string; endpointLink: string }> {
  // Split the log into lines
  const lines = serverlessLog.split("\n");

  // Initialize result array
  const result: Array<{
    functionName: string;
    size: string;
    endpointLink: string;
  }> = [];

  // Store endpoints mapping
  const endpoints: { [key: string]: string } = {};
  let currentSection = "";

  // Process each line
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check if we're in endpoints or functions section
    if (line.startsWith("endpoints:")) {
      currentSection = "endpoints";
      continue;
    } else if (line.startsWith("functions:")) {
      currentSection = "functions";
      continue;
    }

    if (currentSection === "endpoints") {
      // Parse endpoint line
      const endpointMatch = line.match(/(GET|POST)\s+-\s+(https:\/\/[^\s]+)/);
      if (endpointMatch && endpointMatch[2]) {
        const url = endpointMatch[2];
        // Extract the last part of the URL path as the function identifier
        const pathParts = url.split("/");
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
          const functionIdentifier = lastPart.replace(".json", "");
          endpoints[functionIdentifier] = url;
        }
      }
    } else if (currentSection === "functions") {
      // Parse function line
      const functionMatch = line.match(/(\w+):\s+([^(]+)\s+\(([^)]+)\)/);
      if (functionMatch && functionMatch[1] && functionMatch[3]) {
        const functionName = functionMatch[1];
        const size = functionMatch[3];
        // Find matching endpoint
        const endpointLink = endpoints[functionName] || "";

        result.push({
          functionName: functionName.trim(),
          size: size.trim(),
          endpointLink: endpointLink,
        });
      }
    }
  }

  return result;
}
