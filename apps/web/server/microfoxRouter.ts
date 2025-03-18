import { hellofoxRouter } from "./minions/hellofox/hellofoxRouter";
import { ServerStreamingRouter, defaultCallbackResultBody } from "./router";
import { createOrReOpenPullRequest } from "./system/createOrReOpenPullRequest";

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

microfoxRouter.addPath("createOrReOpenPullRequest", createOrReOpenPullRequest);
microfoxRouter.addPath("hellofox", hellofoxRouter);

microfoxRouter.setRouting((requestBody: any) => {
  //console.log("requestBody", requestBody);
  if (requestBody.minionType === "hellofox") {
    return ["hellofox"];
  }
  return [];
});

export { microfoxRouter };
