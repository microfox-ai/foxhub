/**
 * Parses serverless logs to extract function information and their corresponding endpoints
 * based on their order of appearance.
 * @param serverlessLog The serverless log string to parse
 * @returns Array of objects containing function name, size, and endpoint link
 */
export function parseServerlessLogs(
  serverlessLog: string
): Array<{ functionName: string; size: string; endpointLink: string }> {
  const lines = serverlessLog.split("\n");
  const endpoints: string[] = [];
  const functions: Array<{ functionName: string; size: string }> = [];
  let currentSection = "";

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith("endpoints:")) {
      currentSection = "endpoints";
      continue;
    } else if (line.startsWith("functions:")) {
      currentSection = "functions";
      continue;
    }

    if (currentSection === "endpoints") {
      const endpointMatch = line.match(/(GET|POST)\s+-\s+(https:\/\/[^\s]+)/);
      if (endpointMatch && endpointMatch[2]) {
        endpoints.push(endpointMatch[2]);
      }
    } else if (currentSection === "functions") {
      const functionMatch = line.match(/(\w+):\s+([^(]+)\s+\(([^)]+)\)/);
      if (functionMatch && functionMatch[1] && functionMatch[3]) {
        functions.push({
          functionName: functionMatch[1].trim(),
          size: functionMatch[3].trim(),
        });
      }
    }
  }

  // Combine based on index
  const result = functions.map((func, index) => ({
    ...func,
    endpointLink: endpoints[index] || "", // Assign endpoint based on order
  }));

  return result;
}
