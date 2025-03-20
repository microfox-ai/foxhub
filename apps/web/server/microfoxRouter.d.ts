import {
  ServerStreamingRouter,
  defaultCallbackResultBody,
} from "@repo/ai-utils/router";
export interface MicrofoxRequestBody {
  originClientRequestId?: string;
  userId?: string;
  content?: string;
  context?: string;
  metadata?: any;
}
declare const microfoxRouter: ServerStreamingRouter<
  MicrofoxRequestBody,
  defaultCallbackResultBody
>;
export { microfoxRouter };
//# sourceMappingURL=microfoxRouter.d.ts.map
