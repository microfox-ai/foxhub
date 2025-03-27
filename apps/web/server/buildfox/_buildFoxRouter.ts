import { createPullRequest } from "@/server/buildfox/createPullRequest";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { genDbCode } from "./genDbCode";
import { genInitialCode } from "./genInitialCode";
import { genLambdaCode } from "./genLambdaCode";
import { genCronJobs } from "./genCronJobs";
import { genFinalCode } from "./genFinalCode";
import { pushToGit } from "./pushToGit";

//TODO: diffModal to write functions
//TODO: embedding data contextualisation
//TODO: (Requires further thought) shared scripts or files, using a tool call to check if said shared file exists, & fetchit/createit as needed.

export const buildFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const { clientRequestId } = requestBody;

  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);
  if (!taskInstanceMeta?.taskInfo) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }
  let clientRequest = await getClientRequest(clientRequestId);
  if (!clientRequest) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }
  //console.log("taskInstanceMeta", taskInstanceMeta.taskStructure);

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "buildfox",
  });

  if (!clientRequest.prUrl) {
    dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Creating the pull request if not yet created",
    });
    clientRequest = await createPullRequest({
      clientRequestId,
      description: taskInstanceMeta.taskInfo?.summary,
      title: taskInstanceMeta.taskInfo?.name,
    });
  }

  // dataStream.writeMessageAnnotation({
  //   type: "thinking",
  //   content: "Generating initial code",
  // });
  // taskInstanceMeta = await genInitialCode(
  //   props,
  //   taskInstanceMeta,
  //   clientRequest
  // );

  // dataStream.writeMessageAnnotation({
  //   type: "thinking",
  //   content: "Writing db schema",
  // });
  // // write/modify schema files for prisma
  // taskInstanceMeta = await genDbCode(props, taskInstanceMeta, clientRequest);

  // dataStream.writeMessageAnnotation({
  //   type: "thinking",
  //   content: "Writing lambda functions",
  // });
  // // write/modify lambda functions
  // taskInstanceMeta = await genLambdaCode(
  //   props,
  //   taskInstanceMeta,
  //   clientRequest
  // );
  // //write/modify cron jobs
  // taskInstanceMeta = await genCronJobs(props, taskInstanceMeta, clientRequest);

  // dataStream.writeMessageAnnotation({
  //   type: "thinking",
  //   content: "Writing final code pieces",
  // });
  // // write/modify root files - index.ts, package.json, serverless.yml, etc.
  // await genFinalCode(props, taskInstanceMeta, clientRequest);

  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Pushing to git",
  });
  // push to git
  await pushToGit(props, clientRequest);

  // TODO: shiftMinion to deployfox

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
