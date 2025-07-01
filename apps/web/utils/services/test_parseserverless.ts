import {
  parseServerlessFunctions,
  parseServerlessLogs,
} from "./parseServerlessLogs";

const serverlessConfig = {
  service: "R-1750901454910-ef5c8ddc",
  package: {
    exclude: ["venv/**", "src/**", "node_modules/serverless-offline/**"],
  },
  custom: {
    stage: "${env:ENVIRONMENT, 'dev'}",
    "serverless-offline": {
      httpPort: 4000,
      lambdaPort: 4002,
      useChildProcesses: true,
      useWorkerThreads: true,
      noCookieValidation: true,
      allowCache: true,
      hideStackTraces: false,
      disableCookieValidation: true,
      noTimeout: true,
      environment: "${file(env.json)}",
    },
  },
  provider: {
    name: "aws",
    runtime: "nodejs20.x",
    region: "us-east-1",
    stage: "${env:ENVIRONMENT, 'dev'}",
    environment: "${file(env.json)}",
  },
  plugins: ["serverless-plugin-typescript", "serverless-offline"],
  functions: {
    getUserConfig: {
      handler: "dist/functions/getUserConfig.getUserConfigFunction",
      events: [
        {
          http: {
            path: "/user/config/{userId}",
            method: "GET",
            cors: true,
          },
        },
      ],
    },
    getMonitorConfig: {
      handler: "dist/functions/getMonitorConfig.getMonitorConfigFunction",
      events: [
        {
          http: {
            path: "/monitor/config/{userId}/{monitorId}",
            method: "GET",
            cors: true,
          },
        },
      ],
    },
    deleteMonitorConfig: {
      handler: "dist/functions/deleteMonitorConfig.deleteMonitorConfigFunction",
      events: [
        {
          http: {
            path: "/monitor/config/{userId}/{monitorId}",
            method: "DELETE",
            cors: true,
          },
        },
      ],
    },
    updateUserConfig: {
      handler: "dist/functions/updateUserConfig.updateUserConfigFunction",
      events: [
        {
          http: {
            path: "/user/config",
            method: "POST",
            cors: true,
          },
        },
      ],
    },
    updateMonitorConfig: {
      handler: "dist/functions/updateMonitorConfig.updateMonitorConfigFunction",
      events: [
        {
          http: {
            path: "/monitor/config/update",
            method: "POST",
            cors: true,
          },
        },
      ],
    },
    listMonitorConfigsForUser: {
      handler:
        "dist/functions/listMonitorConfigsForUser.listMonitorConfigsForUserFunction",
      events: [
        {
          http: {
            path: "/monitor/configs/{userId}",
            method: "GET",
            cors: true,
          },
        },
      ],
    },
    newUserRequest: {
      handler: "dist/functions/newUserRequest.newUserRequestFunction",
      events: [
        {
          http: {
            path: "/user/request",
            method: "POST",
            cors: true,
          },
        },
      ],
      environment: {
        INDEX_SUBREDDIT_QUEUE_URL: {
          Ref: "IndexSubredditQueue",
        },
      },
    },
    indexMonitorConfig: {
      handler: "dist/functions/indexMonitorConfig.indexMonitorConfigFunction",
      events: [
        {
          http: {
            path: "/user/monitor-config",
            method: "POST",
            cors: true,
          },
        },
      ],
      environment: {
        INDEX_SUBREDDIT_QUEUE_URL: {
          Ref: "IndexSubredditQueue",
        },
      },
    },
    indexSubReddit: {
      handler: "dist/functions/indexSubReddit.indexSubReddit",
      events: [
        {
          sqs: {
            arn: {
              "Fn::GetAtt": ["IndexSubredditQueue", "Arn"],
            },
          },
        },
      ],
      environment: {
        INDEX_POST_QUEUE_URL: {
          Ref: "IndexPostQueue",
        },
      },
    },
    indexPost: {
      handler: "dist/functions/indexPost.indexPost",
      events: [
        {
          sqs: {
            arn: {
              "Fn::GetAtt": ["IndexPostQueue", "Arn"],
            },
          },
        },
      ],
    },
    generateDeepResearch: {
      handler:
        "dist/functions/generateDeepResearch.generateDeepResearchFunction",
      events: [
        {
          schedule: "rate(1 day)",
        },
        {
          http: {
            path: "/reports/generate",
            method: "POST",
            cors: true,
          },
        },
      ],
    },
    runIndexAll: {
      handler: "dist/functions/runIndexAll.runIndexAllFunction",
      events: [
        {
          schedule: "rate(5 minutes)",
        },
      ],
    },
    testIndexSubReddit: {
      handler: "dist/functions/indexSubReddit.indexSubRedditFunction",
      events: [
        {
          http: {
            path: "/test/index/subreddit",
            method: "POST",
            cors: true,
          },
        },
      ],
      environment: {
        INDEX_POST_QUEUE_URL: {
          Ref: "IndexPostQueue",
        },
      },
    },
    testIndexPost: {
      handler: "dist/functions/indexPost.indexPostFunction",
      events: [
        {
          http: {
            path: "/test/index/post",
            method: "POST",
            cors: true,
          },
        },
      ],
    },
    getDocs: {
      handler: "dist/index.getDocs",
      events: [
        {
          http: {
            path: "/docs.json",
            method: "get",
            cors: true,
          },
        },
      ],
    },
  },
  resources: {
    Resources: {
      IndexSubredditQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName:
            "${self:service}-index-subreddit-queue-${self:custom.stage}",
          VisibilityTimeout: 300,
        },
      },
      IndexPostQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "${self:service}-index-post-queue-${self:custom.stage}",
          VisibilityTimeout: 300,
        },
      },
    },
    Outputs: {
      ApiEndpoints: {
        Description: "API Endpoints",
        Value: {
          "Fn::Join": [
            "",
            [
              "API: https://",
              {
                Ref: "ApiGatewayRestApi",
              },
              ".execute-api.",
              {
                Ref: "AWS::Region",
              },
              ".amazonaws.com/${env:ENVIRONMENT, 'dev'}",
            ],
          ],
        },
      },
    },
  },
};
const functionBase = "R-1750901454910-ef5c8ddc-staging";

const serverlessLog = `endpoints:
    GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/config/{userId}
    GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/{userId}/{monitorId}
    DELETE - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/{userId}/{monitorId}
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/config
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/config/update
    GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/monitor/configs/{userId}
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/request
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/user/monitor-config
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/reports/generate
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/subreddit
    POST - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/test/index/post
    GET - https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging/docs.json
  functions:
    getUserConfig: R-1750901454910-ef5c8ddc-staging-getUserConfig (29 MB)
    getMonitorConfig: R-1750901454910-ef5c8ddc-staging-getMonitorConfig (29 MB)
    deleteMonitorConfig: R-1750901454910-ef5c8ddc-staging-deleteMonitorConfig (29 MB)
    updateUserConfig: R-1750901454910-ef5c8ddc-staging-updateUserConfig (29 MB)
    updateMonitorConfig: R-1750901454910-ef5c8ddc-staging-updateMonitorConfig (29 MB)
    listMonitorConfigsForUser: R-1750901454910-ef5c8ddc-staging-listMonitorConfigsForUser (29 MB)
    newUserRequest: R-1750901454910-ef5c8ddc-staging-newUserRequest (29 MB)
    indexMonitorConfig: R-1750901454910-ef5c8ddc-staging-indexMonitorConfig (29 MB)
    indexSubReddit: R-1750901454910-ef5c8ddc-staging-indexSubReddit (29 MB)
    indexPost: R-1750901454910-ef5c8ddc-staging-indexPost (29 MB)
    generateDeepResearch: R-1750901454910-ef5c8ddc-staging-generateDeepResearch (29 MB)
    runIndexAll: R-1750901454910-ef5c8ddc-staging-runIndexAll (29 MB)
    testIndexSubReddit: R-1750901454910-ef5c8ddc-staging-testIndexSubReddit (29 MB)
    testIndexPost: R-1750901454910-ef5c8ddc-staging-testIndexPost (29 MB)
    getDocs: R-1750901454910-ef5c8ddc-staging-getDocs (29 MB)
  
  Stack Outputs:
    DeleteMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-deleteMonitorConfig:2
    GetMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getMonitorConfig:2
    RunIndexAllLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-runIndexAll:1
    NewUserRequestLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-newUserRequest:2
    IndexSubRedditLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexSubReddit:2
    GenerateDeepResearchLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-generateDeepResearch:2
    TestIndexSubRedditLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexSubReddit:2
    ServerlessDeploymentBucketName: r-1750901454910-ef5c8ddc--serverlessdeploymentbuck-5stfvtku52tf
    GetDocsLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getDocs:2
    ApiEndpoints: API: https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/dev
    UpdateMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-updateMonitorConfig:2
    GetUserConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-getUserConfig:1
    IndexPostLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexPost:2
    TestIndexPostLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-testIndexPost:2
    ListMonitorConfigsForUserLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-listMonitorConfigsForUser:2
    UpdateUserConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-updateUserConfig:2
    IndexMonitorConfigLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:211125656699:function:R-1750901454910-ef5c8ddc-staging-indexMonitorConfig:1
    ServiceEndpoint: https://mod7rt19m9.execute-api.us-east-1.amazonaws.com/staging
  `;

// const result = parseServerlessLogs(serverlessLog);
// console.log(JSON.stringify(result, null, 4));

const result2 = parseServerlessFunctions(
  serverlessConfig,
  functionBase,
  serverlessLog
);
console.log(JSON.stringify(result2, null, 4));
