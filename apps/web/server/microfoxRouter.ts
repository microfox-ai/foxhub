import {
  MinionFlow,
  MinionTypeType,
} from "@/components/screens/hooks/convertors";
import { AiAgentKit } from "@repo/ai-utils/router";
import { usageTrackerRouter } from "./analytics/_usageTrackerRouter";
import { buildManager } from "./flows/buildFlow";
import { assistantMessageProcessor } from "./system/assistantProcess";
import { chatManager } from "./flows/chatFlow";
export interface MicrofoxRequestBody {
  originClientRequestId?: string;
  userId?: string;
  content?: string;
  context?: string;
  metadata?: any;
}

export interface DefaultMessageMetadata {
  loader?: string;
  minionType?: MinionTypeType;
  error?: string;
}

const microfoxRouter = new AiAgentKit<DefaultMessageMetadata, any, any, any>();

microfoxRouter.use("/", assistantMessageProcessor);
microfoxRouter.use("/", usageTrackerRouter);
microfoxRouter.agent("/" + MinionFlow.BuildFlow, buildManager);
microfoxRouter.agent("/" + MinionFlow.ChatFlow, chatManager);

export { microfoxRouter };
