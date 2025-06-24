import { MinionFlow } from "@/components/screens/hooks/convertors";
import { AiAgentKit, AiContext } from "@repo/ai-utils/router";
import { usageTrackerRouter } from "./analytics/_usageTrackerRouter";
import { buildFlow } from "./flows/buildFlow";
import { chatFlow } from "./flows/chatFlow";
import { assistantMessageProcessor } from "./system/assistantProcess";
export interface MicrofoxRequestBody {
  originClientRequestId?: string;
  userId?: string;
  content?: string;
  context?: string;
  metadata?: any;
}
const microfoxRouter = new AiAgentKit();

// ratelimit should be per time per model ().

const processAnyMinionFlow = async (props: AiContext) => {
  const { request, state, writer } = props;

  console.log("request", request, state, writer);

  let _minionFlow = request.messages?.[request.messages.length - 1]?.metadata;

  if (request.messages.length < 2 && _minionFlow === MinionFlow.Unknown) {
    _minionFlow = MinionFlow.BuildFlow;
  }

  switch (_minionFlow) {
    case MinionFlow.BuildFlow:
      return buildFlow(props);
    case MinionFlow.ChatFlow:
      return chatFlow(props);
    default:
      console.log(
        "WARNING: hitting old routes as minionFlow is not set",
        request.minionFlow,
        request.minionType,
        request.messages[request.messages.length - 1]
      );
      return {
        responseBody: { ...request },
        appendRequestBody: { ...request },
      };
  }
};

microfoxRouter.use("*", assistantMessageProcessor);
microfoxRouter.use("*", usageTrackerRouter);
microfoxRouter.agent(MinionFlow.BuildFlow, buildFlow);
microfoxRouter.agent(MinionFlow.ChatFlow, chatFlow);

// TODO: remove this & bifract this into multiple small steps in both server & frontend
//microfoxRouter.addPath("createMessage", createMessageRouter);
// microfoxRouter.addPath("hellofox", hellofoxRouter);
// microfoxRouter.addPath("convertfox", convertfoxRouter);
// microfoxRouter.addPath("buildfox", buildFoxRouter);
// microfoxRouter.addPath("deployfox", deployFoxRouter);
// microfoxRouter.addPath("modifyfox", modifyFoxRouter);
// microfoxRouter.addPath("usageTracker", usageTrackerRouter);
// microfoxRouter.addPath(MinionFlow.BuildFlow, buildFlow);
// microfoxRouter.addPath(MinionFlow.ChatFlow, chatFlow);
// microfoxRouter.addPath("msgProcessor", assistantMessageProcessor);
// microfoxRouter.addPath("processAnyMinionFlow", processAnyMinionFlow);
//microfoxRouter.addPath(MinionFlow.InstallFlow, installFlow);

// action - defines from the user end. - abrupt-switch, switch-notsure, unknown,
// minionFlow - preset by the type of clientRequest (on-start) & editable in middle of the conversation.
// minonType - exact end point of the router.

// CHANGING THIS WILL REQUIRE RESTARTING THE SERVER
// microfoxRouter.setRouting((requestBody: any) => {
//   return ["usageTracker", "msgProcessor", "processAnyMinionFlow"];

//   // if (
//   //   requestBody.action === "abrupt-switch" ||
//   //   requestBody.action === "switch-notsure" ||
//   //   requestBody.action === "unknown"
//   // ) {
//   //   return ["usageTracker", "msgProcessor", "modifyfox"];
//   // }
//   // let minionType = requestBody.minionType.replaceAll('"', "") || "hellofox";
//   // if (minionType === "hellofox") {
//   //   return ["usageTracker", "hellofox"];
//   // } else if (minionType === "convertfox") {
//   //   return ["usageTracker", "convertfox"];
//   // } else if (minionType === "buildfox") {
//   //   return ["usageTracker", "buildfox"];
//   // } else if (minionType === "deployfox") {
//   //   return ["usageTracker", "deployfox"];
//   // } else if (minionType === "modifyfox") {
//   //   return ["usageTracker", "modifyfox"];
//   // }
//   // return ["usageTracker"];
// });

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
