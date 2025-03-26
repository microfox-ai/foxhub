import { createClientRequestPR } from "@/utils/services/db_functions/createClientRequestPR";
import { getTaskInstanceMeta } from "@/utils/services/db_functions/getClientRequest";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
export const buildFoxRouter = async (
  props: StreamingFucntionProps<any, any>
) => {
  const { dataStream, requestBody, responseBody } = props;

  const { clientRequestId } = requestBody;

  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);
  if (!taskInstanceMeta) {
    taskInstanceMeta = {
      originClientRequestId: clientRequestId,
    };
  }
  console.log("taskInstanceMeta", taskInstanceMeta.taskStructure);

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "buildfox",
  });

  dataStream.writeMessageAnnotation({
    type: "thinking",
    value: "Creating the pull request if not yet created",
  });
  await createClientRequestPR({
    clientRequestId,
    description: "Creating the pull request if not yet created",
    title: "Creating the pull request if not yet created",
  });
  // a single step, that loops for each function & cron & ui
};
