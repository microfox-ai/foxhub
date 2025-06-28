// Examples:
//
// endpoints:
// GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config
// DELETE - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/config
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/update
// GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/configs/{userId}
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/request
// GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/reddit
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/reports/generate
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/monitor-config
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/subreddit
// POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/post
// GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/docs.json
// functions:
// getMonitorConfig: R-1750901454910-ef5c8ddc-staging-getMonitorConfig (27 MB)
// deleteMonitorConfig: R-1750901454910-ef5c8ddc-staging-deleteMonitorConfig (27 MB)
// updateUserConfig: R-1750901454910-ef5c8ddc-staging-updateUserConfig (27 MB)
// updateMonitorConfig: R-1750901454910-ef5c8ddc-staging-updateMonitorConfig (27 MB)
// listMonitorConfigsForUser: R-1750901454910-ef5c8ddc-staging-listMonitorConfigsForUser (27 MB)
// newUserRequest: R-1750901454910-ef5c8ddc-staging-newUserRequest (27 MB)
// monitorRedditPosts: R-1750901454910-ef5c8ddc-staging-monitorRedditPosts (27 MB)
// indexSubReddit: R-1750901454910-ef5c8ddc-staging-indexSubReddit (27 MB)
// indexPost: R-1750901454910-ef5c8ddc-staging-indexPost (27 MB)
// generateDeepResearch: R-1750901454910-ef5c8ddc-staging-generateDeepResearch (27 MB)
// testIndexMonitorConfig: R-1750901454910-ef5c8ddc-staging-testIndexMonitorConfig (27 MB)
// testIndexSubReddit: R-1750901454910-ef5c8ddc-staging-testIndexSubReddit (27 MB)
// testIndexPost: R-1750901454910-ef5c8ddc-staging-testIndexPost (27 MB)
// getDocs: R-1750901454910-ef5c8ddc-staging-getDocs (27 MB)

// Stack Outputs:
// DeleteMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-deleteMonitorConfig:1
// MonitorRedditPostsLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-monitorRedditPosts:1
// GetMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getMonitorConfig:1
// NewUserRequestLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-newUserRequest:1
// IndexSubRedditLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexSubReddit:1
// GenerateDeepResearchLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-generateDeepResearch:1
// TestIndexSubRedditLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexSubReddit:1
// TestIndexMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexMonitorConfig:1
// ServerlessDeploymentBucketName: r-1750901454910-ef5c8ddc--serverlessdeploymentbuck-5stfvtku52tf
// GetDocsLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getDocs:1
// ApiEndpoints: API: https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/dev
// UpdateMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-updateMonitorConfig:1
// IndexPostLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexPost:1
// TestIndexPostLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexPost:1
// ListMonitorConfigsForUserLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-listMonitorConfigsForUser:1
// UpdateUserConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-updateUserConfig:1
// ServiceEndpoint: https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging

/**
 * Parses serverless logs to extract function information and their corresponding endpoints
 * based on their order of appearance.
 * @param serverlessLog The serverless log string to parse
 * @returns Array of objects containing function name, size, and endpoint link
 */
export function parseServerlessLogs(serverlessLog: string): Array<{
  functionName: string;
  size: string;
  endpointLink: string;
  method: string;
}> {
  const lines = serverlessLog.split("\n");
  const endpoints: Array<{ method: string; url: string }> = [];
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
    } else if (line.startsWith("Stack Outputs:")) {
      currentSection = "";
      continue;
    }

    if (currentSection === "endpoints") {
      const endpointMatch = line.match(
        /(GET|POST|PUT|DELETE|PATCH)\s+-\s+(https:\/\/[^\s]+)/
      );
      if (endpointMatch && endpointMatch[1] && endpointMatch[2]) {
        endpoints.push({ method: endpointMatch[1], url: endpointMatch[2] });
      }
    } else if (currentSection === "functions") {
      const functionMatch = line.match(/^\s*(\w+):\s+.*\(([^)]+)\)/);
      if (functionMatch && functionMatch[1] && functionMatch[2]) {
        functions.push({
          functionName: functionMatch[1].trim(),
          size: functionMatch[2].trim(),
        });
      }
    }
  }

  const getPathFromUrl = (url: string) => {
    try {
      const path = new URL(url).pathname;
      // remove stage, e.g. /staging or /prod
      return path.replace(/^\/[^/]+/, "");
    } catch (e) {
      return "";
    }
  };

  const functionNameToPathFragment = (name: string) => {
    return name
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
  };

  const result = functions.map((func) => {
    const functionPathFragment = functionNameToPathFragment(func.functionName);
    const matchedEndpoint = endpoints.find((endpoint) => {
      const endpointPath = getPathFromUrl(endpoint.url).toLowerCase();
      return (
        endpointPath.includes(
          functionPathFragment.split("-").slice(1).join("-")
        ) || endpointPath.includes(func.functionName.toLowerCase())
      );
    });

    return {
      ...func,
      endpointLink: matchedEndpoint?.url || "",
      method: matchedEndpoint?.method || "",
    };
  });

  return result;
}
