export type FunctionInfo = {
  eventType: "http" | "cron" | "sqs";
  functionName: string;
  size?: string;
  endpointLink?: string;
  path?: string;
  method: string;
  details?: string;
};

export type SQSInfo = {
  queueName: string;
  queueUrl: string;
};

export function parseServerlessFunctions(
  serverlessConfig: any,
  functionbase: string,
  serverlessOutput: string
): Array<FunctionInfo> {
  const functions: FunctionInfo[] = [];

  let baseUrl = "";
  const serviceEndpointMatch = serverlessOutput.match(
    /ServiceEndpoint:\s+(https:\/\/\S+)/
  );
  if (serviceEndpointMatch && serviceEndpointMatch[1]) {
    baseUrl = serviceEndpointMatch[1];
  } else {
    const apiEndpointsMatch = serverlessOutput.match(
      /ApiEndpoints: API: (https:\/\/\S+)/
    );
    if (apiEndpointsMatch && apiEndpointsMatch[1]) {
      baseUrl = apiEndpointsMatch[1];
    }
  }

  const functionSizes: { [key: string]: string } = {};
  const lines = serverlessOutput.split("\n");
  let inFunctionsSection = false;
  for (const line of lines) {
    if (line.startsWith("functions:")) {
      inFunctionsSection = true;
      continue;
    }
    if (
      line.startsWith("Stack Outputs:") ||
      (inFunctionsSection && line.trim() === "")
    ) {
      inFunctionsSection = false;
    }
    if (inFunctionsSection && line.trim()) {
      const functionMatch = line.match(/^\s*(\w+):\s+.*\(([^)]+)\)/);
      if (functionMatch && functionMatch[1] && functionMatch[2]) {
        functionSizes[functionMatch[1]] = functionMatch[2].trim();
      }
    }
  }

  const stage = functionbase.substring(serverlessConfig.service.length + 1);

  if (serverlessConfig.functions) {
    for (const functionName of Object.keys(serverlessConfig.functions)) {
      const func = serverlessConfig.functions[functionName];
      if (func.events) {
        for (const event of func.events) {
          if (event.http) {
            functions.push({
              eventType: "http",
              functionName,
              size: functionSizes[functionName],
              endpointLink: `${baseUrl}${event.http.path}`,
              path: event.http.path,
              method: event.http.method.toUpperCase(),
            });
          } else if (event.schedule) {
            const schedule =
              typeof event.schedule === "string"
                ? event.schedule
                : event.schedule.rate;
            functions.push({
              eventType: "cron",
              functionName,
              size: functionSizes[functionName],
              details: schedule,
              method: "SCHEDULE",
            });
          } else if (event.sqs) {
            let queueName = "Unknown SQS";
            if (event.sqs.arn && event.sqs.arn["Fn::GetAtt"]) {
              const resourceName = event.sqs.arn["Fn::GetAtt"][0];
              if (
                serverlessConfig.resources &&
                serverlessConfig.resources.Resources &&
                serverlessConfig.resources.Resources[resourceName]
              ) {
                let queueNameTemplate =
                  serverlessConfig.resources.Resources[resourceName].Properties
                    .QueueName;
                queueName = queueNameTemplate
                  .replace(/\$\{self:service\}/g, serverlessConfig.service)
                  .replace(/\$\{self:custom\.stage\}/g, stage)
                  .replace(/\$\{self:provider\.stage\}/g, stage);
              }
            } else if (typeof event.sqs === "string") {
              queueName = event.sqs;
            } else if (event.sqs.queueName) {
              queueName = event.sqs.queueName;
            }

            const region = serverlessConfig.provider.region;

            functions.push({
              eventType: "sqs",
              functionName,
              size: functionSizes[functionName],
              details: queueName,
              method: "SQS",
              endpointLink: `https://sqs.${region}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${queueName}`,
            });
          }
        }
      }
    }
  }

  return functions;
}

/**
 * Parses serverless logs to extract function information and their corresponding endpoints
 * based on their order of appearance.
 * @param serverlessLog The serverless log string to parse
 * @returns Array of objects containing function name, size, and endpoint link
 */
export function parseServerlessLogs(
  serverlessLog: string
): Array<FunctionInfo> {
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
    // improved to handle verbs and acronyms better
    const verbs = ["get", "post", "put", "delete", "patch", "update", "list"];
    let processedName = name;
    for (const verb of verbs) {
      if (processedName.toLowerCase().startsWith(verb)) {
        processedName = processedName.substring(verb.length);
        break;
      }
    }
    return processedName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
  };

  const result = functions.map((func): FunctionInfo => {
    const functionNameLower = func.functionName.toLowerCase();
    let bestMatch: {
      endpoint: { method: string; url: string };
      score: number;
    } | null = null;

    for (const endpoint of endpoints) {
      const endpointPath = getPathFromUrl(endpoint.url).toLowerCase();
      const method = endpoint.method.toLowerCase();

      // Strip verb from function name for matching
      let baseFunctionName = functionNameLower;
      if (baseFunctionName.startsWith(method)) {
        baseFunctionName = baseFunctionName.substring(method.length);
      }

      // a very direct match
      const endpointPathForMatching = endpointPath
        .replace(/\{[^}]+\}/g, "")
        .replace(/-/g, "");
      const functionNameForMatching = baseFunctionName.replace(/-/g, "");

      if (endpointPathForMatching.includes(functionNameForMatching)) {
        let score = functionNameForMatching.length;
        if (functionNameLower.startsWith(method)) {
          score += 100; // Strong bonus for method match
        }

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { endpoint, score };
        }
      }
    }

    if (bestMatch) {
      // Remove the matched endpoint so it's not used again
      const index = endpoints.indexOf(bestMatch.endpoint);
      if (index > -1) {
        endpoints.splice(index, 1);
      }
    }

    const path = bestMatch ? getPathFromUrl(bestMatch.endpoint.url) : "";
    return {
      eventType: "http",
      ...func,
      endpointLink: bestMatch?.endpoint.url || "",
      path,
      method: bestMatch?.endpoint.method || "",
    };
  });

  return result;
}

// this function is not working correctly as for the following log.

// endpoints:
//   GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/config/{userId}
//   GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/{userId}/{monitorId}
//   DELETE - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/{userId}/{monitorId}
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/config
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/update
//   GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/configs/{userId}
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/request
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/monitor-config
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/reports/generate
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/subreddit
//   POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/post
//   GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/docs.json
// functions:
//   getUserConfig: R-1750901454910-ef5c8ddc-staging-getUserConfig (29 MB)
//   getMonitorConfig: R-1750901454910-ef5c8ddc-staging-getMonitorConfig (29 MB)
//   deleteMonitorConfig: R-1750901454910-ef5c8ddc-staging-deleteMonitorConfig (29 MB)
//   updateUserConfig: R-1750901454910-ef5c8ddc-staging-updateUserConfig (29 MB)
//   updateMonitorConfig: R-1750901454910-ef5c8ddc-staging-updateMonitorConfig (29 MB)
//   listMonitorConfigsForUser: R-1750901454910-ef5c8ddc-staging-listMonitorConfigsForUser (29 MB)
//   newUserRequest: R-1750901454910-ef5c8ddc-staging-newUserRequest (29 MB)
//   indexMonitorConfig: R-1750901454910-ef5c8ddc-staging-indexMonitorConfig (29 MB)
//   indexSubReddit: R-1750901454910-ef5c8ddc-staging-indexSubReddit (29 MB)
//   indexPost: R-1750901454910-ef5c8ddc-staging-indexPost (29 MB)
//   generateDeepResearch: R-1750901454910-ef5c8ddc-staging-generateDeepResearch (29 MB)
//   runIndexAll: R-1750901454910-ef5c8ddc-staging-runIndexAll (29 MB)
//   testIndexSubReddit: R-1750901454910-ef5c8ddc-staging-testIndexSubReddit (29 MB)
//   testIndexPost: R-1750901454910-ef5c8ddc-staging-testIndexPost (29 MB)
//   getDocs: R-1750901454910-ef5c8ddc-staging-getDocs (29 MB)

// Stack Outputs:
//   DeleteMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-deleteMonitorConfig:2
//   GetMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getMonitorConfig:2
//   RunIndexAllLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-runIndexAll:1
//   NewUserRequestLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-newUserRequest:2
//   IndexSubRedditLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexSubReddit:2
//   GenerateDeepResearchLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-generateDeepResearch:2
//   TestIndexSubRedditLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexSubReddit:2
//   ServerlessDeploymentBucketName: r-1750901454910-ef5c8ddc--serverlessdeploymentbuck-5stfvtku52tf
//   GetDocsLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getDocs:2
//   ApiEndpoints: API: https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/dev
//   UpdateMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-updateMonitorConfig:2
//   GetUserConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getUserConfig:1
//   IndexPostLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexPost:2
//   TestIndexPostLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexPost:2
//   ListMonitorConfigsForUserLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-listMonitorConfigsForUser:2
//   UpdateUserConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-updateUserConfig:2
//   IndexMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexMonitorConfig:1
//   ServiceEndpoint: https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging

// It outputtted

// [
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "getUserConfig"
//     },
//     {
//         "size": "29 MB",
//         "method": "POST",
//         "endpointLink": "https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/monitor-config",
//         "functionName": "getMonitorConfig"
//     },
//     {
//         "size": "29 MB",
//         "method": "POST",
//         "endpointLink": "https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/monitor-config",
//         "functionName": "deleteMonitorConfig"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "updateUserConfig"
//     },
//     {
//         "size": "29 MB",
//         "method": "POST",
//         "endpointLink": "https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/monitor-config",
//         "functionName": "updateMonitorConfig"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "listMonitorConfigsForUser"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "newUserRequest"
//     },
//     {
//         "size": "29 MB",
//         "method": "POST",
//         "endpointLink": "https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/monitor-config",
//         "functionName": "indexMonitorConfig"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "indexSubReddit"
//     },
//     {
//         "size": "29 MB",
//         "method": "POST",
//         "endpointLink": "https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/post",
//         "functionName": "indexPost"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "generateDeepResearch"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "runIndexAll"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "testIndexSubReddit"
//     },
//     {
//         "size": "29 MB",
//         "method": "",
//         "endpointLink": "",
//         "functionName": "testIndexPost"
//     },
//     {
//         "size": "29 MB",
//         "method": "GET",
//         "endpointLink": "https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/docs.json",
//         "functionName": "getDocs"
//     }
// ]
