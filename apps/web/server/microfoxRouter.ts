import {
  ServerStreamingRouter,
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { createOrReOpenPullRequest } from "./system/createOrReOpenPullRequest";
import { hellofoxRouter } from "./hellofox/_hellofoxRouter";
import { convertfoxRouter } from "./convertfox/convertFoxRouter";
import { createMessage } from "@/utils/services/db_functions/messages";

export interface MicrofoxRequestBody {
  originClientRequestId?: string;
  userId?: string;
  content?: string;
  context?: string;
  metadata?: any;
}
const microfoxRouter = new ServerStreamingRouter<
  MicrofoxRequestBody,
  defaultCallbackResultBody
>();

const createMessageRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  console.log("createMessage", requestBody);
  const lastMessage =
    requestBody.messages.length > 0
      ? requestBody.messages[requestBody.messages.length - 1]
      : null;
  let minionType = requestBody.minionType.replaceAll('"', "") || "hellofox";
  if (lastMessage) {
    await createMessage({
      clientRequestId: requestBody.clientRequestId,
      message: {
        ...lastMessage,
        id: requestBody.clientRequestId + "-" + lastMessage.id,
        originClientRequestId: requestBody.clientRequestId,
        userId: requestBody.userId,
        minionType: minionType,
        context: "on-start",
      },
    });
  }
  return {
    responseBody: props.responseBody,
    appendRequestBody: props.requestBody,
  };
};
// TODO: remove this & bifract this into multiple small steps in both server & frontend
microfoxRouter.addPath("createMessage", createMessageRouter);
microfoxRouter.addPath("hellofox", hellofoxRouter);
microfoxRouter.addPath("convertfox", convertfoxRouter);

// CHANGING THIS WILL REQUIRE RESTARTING THE SERVER
microfoxRouter.setRouting((requestBody: any) => {
  console.log("routing to", requestBody.minionType);
  // if (requestBody.somethin === "nothing") {
  //   return ["nothing"];
  // }

  let minionType = requestBody.minionType.replaceAll('"', "") || "hellofox";
  if (minionType === "hellofox") {
    return ["createMessage", "hellofox"];
  } else if (minionType === "convertfox") {
    return ["createMessage", "convertfox"];
  }
  return [];
});

export { microfoxRouter };

// IDEA
// 1. Request creation -> directly open the new window you have requestId
// .createNew Request in doc in API / find exisitn Request in API
// . the rest of the steps will not be done in APO
// . no messages should be added/sent, the name can be generated

// 2. Request creation -> inside the new window
// connect to /api/chat -> if minionType is null, & requestId, fetch previously saved messages
// . passIn the data using writeData, & writeAnnotations during every step
// at the end of this step, send a writeAnnotation, that we are switching minionType.
// on frontend, change minionType

// 3. start with no message if new request ->
// . only if user types something, send it to server
// . do the github PR creations, & file commits here, & stream updates to frontend what is happening

// 4. communication with hellofox server, so it can understand
// . auto setup with tool-calls, & set to convertfox when its job is done
// . setup so user can upload files & ask AI to do some understanding at any time.

// 5. communication with convertfox server, so it can understand
// packages & example reference to refer to some code.

// 6. communication with packagefox server, so it can write code
// packages, & deploy them.

// 7. communciation with buildfox server, so it can build the code, & deploy it.
// stream the code geenration with eithr text or object
