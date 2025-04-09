import {
  defaultCallbackResultBody,
  ServerStreamingRouter,
} from "@repo/ai-utils/router";
import { usageTrackerRouter } from "./analytics/_usageTrackerRouter";
import { buildFoxRouter } from "./buildfox/_buildFoxRouter";
import { convertfoxRouter } from "./convertfox/_convertFoxRouter";
import { deployFoxRouter } from "./deployfox/_deployfoxRouter";
import { hellofoxRouter } from "./hellofox/_hellofoxRouter";
import { modifyFoxRouter } from "./system/modifier";

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

// ratelimit should be per time per model ().

// TODO: remove this & bifract this into multiple small steps in both server & frontend
//microfoxRouter.addPath("createMessage", createMessageRouter);
microfoxRouter.addPath("hellofox", hellofoxRouter);
microfoxRouter.addPath("convertfox", convertfoxRouter);
microfoxRouter.addPath("buildfox", buildFoxRouter);
microfoxRouter.addPath("deployfox", deployFoxRouter);
microfoxRouter.addPath("modifyfox", modifyFoxRouter);
microfoxRouter.addPath("usageTracker", usageTrackerRouter);

// CHANGING THIS WILL REQUIRE RESTARTING THE SERVER
microfoxRouter.setRouting((requestBody: any) => {
  // if (requestBody.somethin === "nothing") {
  //   return ["nothing"];
  // }

  console.log("requestBody", requestBody);

  if (
    requestBody.action === "abrupt-switch" ||
    requestBody.action === "switch-notsure" ||
    requestBody.action === "unkown"
  ) {
    return ["usageTracker", "modifyfox"];
  }
  let minionType = requestBody.minionType.replaceAll('"', "") || "hellofox";
  if (minionType === "hellofox") {
    return ["usageTracker", "hellofox"];
  } else if (minionType === "convertfox") {
    return ["usageTracker", "convertfox"];
  } else if (minionType === "buildfox") {
    return ["usageTracker", "buildfox"];
  } else if (minionType === "deployfox") {
    return ["usageTracker", "deployfox"];
  } else if (minionType === "modifyfox") {
    return ["usageTracker", "modifyfox"];
  }
  return ["usageTracker"];
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
