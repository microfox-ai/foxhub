import {
  UIMessage,
  createUIMessageStream,
  UIMessageStreamWriter,
  createUIMessageStreamResponse,
  UIDataTypes,
  generateId,
} from "ai";
import { StreamWriter } from "./helper.js";
import { UITools } from "./types.js";

// --- Core Types ---
// For clarity, these are defined here. They can be moved to a separate types.ts file.

/**
 * The context object passed through the middleware chain.
 */
export type AiContext<
  METADATA,
  PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  ContextState extends Record<string, any> = Record<string, any>,
> = {
  request: {
    messages: UIMessage<METADATA, PARTS, TOOLS>[];
    [key: string]: any;
  };
  state: ContextState;
  /**
   * The writer for the UI Message Stream. Middleware and agents
   * use this to contribute to the final response by calling methods
   * like `.write()` or `.merge()`.
   */
  writer: UIMessageStreamWriter<UIMessage<METADATA, PARTS, TOOLS>> &
    Omit<StreamWriter<METADATA, TOOLS>, "writer"> & {
      generateId: typeof generateId;
    };
};

export type NextFunction = () => Promise<void>;
export type AiHandler<
  METADATA,
  PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  ContextState extends Record<string, any> = Record<string, any>,
> = (ctx: AiContext<METADATA, PARTS, TOOLS, ContextState>) => Promise<void>;
export type AiMiddleware<
  METADATA,
  PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  ContextState extends Record<string, any> = Record<string, any>,
> = (
  ctx: AiContext<METADATA, PARTS, TOOLS, ContextState>,
  next: NextFunction
) => Promise<void>;

// --- Router Implementation ---

type Layer<
  METADATA,
  PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  ContextState extends Record<string, any> = Record<string, any>,
> = {
  path: string | RegExp;
  handler: AiMiddleware<METADATA, PARTS, TOOLS, ContextState>;
  isTool: boolean;
};

/**
 * A composable router for AI agents, inspired by Express.js.
 */
export class AiAgentKit<
  KIT_METADATA,
  PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  ContextState extends Record<string, any> = {},
> {
  private stack: Layer<KIT_METADATA, PARTS, TOOLS, any>[] = [];

  constructor(stack?: Layer<KIT_METADATA, PARTS, TOOLS, any>[]) {
    if (stack) {
      this.stack = stack;
    }
  }

  /**
   * Registers an agent that runs for a specific path prefix, regex pattern, or wildcard.
   * @param path The path prefix, regex pattern, or "*" for wildcard matching.
   * @param agents The agent function(s).
   */
  agent<
    MW_METADATA,
    MW_TOOLS extends UITools,
    MW_STATE extends Record<string, any>,
  >(
    path:
      | string
      | RegExp
      | AiMiddleware<MW_METADATA, PARTS, MW_TOOLS, ContextState & MW_STATE>,
    ...agents: AiMiddleware<
      MW_METADATA,
      PARTS,
      MW_TOOLS,
      ContextState & MW_STATE
    >[]
  ): AiAgentKit<
    KIT_METADATA | MW_METADATA,
    PARTS,
    TOOLS & MW_TOOLS,
    ContextState & MW_STATE
  > {
    let prefix: string | RegExp = "/";
    if (typeof path === "string" || path instanceof RegExp) {
      prefix = path;
    } else {
      agents.unshift(path);
    }

    for (const handler of agents) {
      if (typeof handler !== "function") continue;
      this.stack.push({
        path: prefix,
        handler: handler as any,
        isTool: false,
      });
      console.log(`[AiAgentKit] Agent registered for path: ${prefix}`);
    }

    return this as any;
  }

  /**
   * Registers a final tool handler for a specific path or regex pattern.
   * @param path The path or regex pattern to match exactly.
   * @param handler The tool handler function.
   */
  tool<
    TOOL_METADATA,
    TOOL_TOOLS extends UITools,
    TOOL_STATE extends Record<string, any>,
  >(
    path: string | RegExp,
    handler: AiHandler<
      TOOL_METADATA,
      PARTS,
      TOOL_TOOLS,
      ContextState & TOOL_STATE
    >
  ): AiAgentKit<
    KIT_METADATA | TOOL_METADATA,
    PARTS,
    TOOLS & TOOL_TOOLS,
    ContextState & TOOL_STATE
  > {
    if (this.stack.some((l) => l.isTool && l.path === path)) {
      throw new Error(`A tool is already registered for path: ${path}`);
    }
    // A tool is the final step, so its handler is wrapped in a middleware
    // that doesn't call `next()`. This makes the types consistent.
    const toolMiddleware: AiMiddleware<
      TOOL_METADATA,
      PARTS,
      TOOL_TOOLS,
      ContextState & TOOL_STATE
    > = async (ctx, _next) => {
      await handler(ctx);
    };
    this.stack.push({ path, handler: toolMiddleware as any, isTool: true });
    console.log(`[AiAgentKit] Tool registered for path: ${path}`);
    return this as any;
  }

  /**
   * Executes the middleware chain and the appropriate agent handler,
   * wrapping the entire process in a UI Message Stream.
   *
   * @param path The path of the agent to execute.
   * @param initialContext The initial context for the execution.
   * @returns A `Response` object containing the rich UI stream.
   */
  handle(
    path: string,
    initialContext: Omit<
      AiContext<KIT_METADATA, PARTS, TOOLS, ContextState>,
      "state" | "writer"
    >
  ): Response {
    console.log(`[AiAgentKit] Handling request for path: ${path}`);
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        originalMessages: initialContext.request.messages,
        execute: async ({ writer }) => {
          const streamWriter = new StreamWriter<KIT_METADATA, TOOLS>(writer);
          const ctx: AiContext<KIT_METADATA, PARTS, TOOLS, ContextState> = {
            ...initialContext,
            state: {} as ContextState,
            writer: {
              ...writer,
              writeMessageMetadata: streamWriter.writeMessageMetadata,
              writeCustomTool: streamWriter.writeCustomTool,
              writeObjectAsTool: streamWriter.writeObjectAsTool,
              generateId: generateId,
            },
          };

          const layersToRun = this.stack.filter((layer) => {
            // Check if this layer should run for the given path
            let shouldRun = false;

            if (layer.path === "*") {
              // Wildcard: always run
              shouldRun = true;
            } else if (layer.path instanceof RegExp) {
              // Regex pattern: test against the path
              shouldRun = layer.path.test(path);
            } else {
              // String: prefix matching
              shouldRun = path.startsWith(layer.path);
            }

            // For tools, require exact path match (unless it's a regex)
            if (layer.isTool) {
              if (layer.path === "*") {
                shouldRun = false; // Tools can't use wildcard
              } else if (layer.path instanceof RegExp) {
                shouldRun = layer.path.test(path);
              } else {
                shouldRun = path === layer.path;
              }
            }

            return shouldRun;
          });

          console.log(
            `[AiAgentKit] Found ${
              layersToRun.length
            } layers to run for path: ${path}: ${layersToRun
              .map((l) => `${l.path} (${l.isTool ? "tool" : "agent"})`)
              .join(", ")}`
          );

          const hasTool = layersToRun.some((l) => l.isTool);
          const hasAgent = layersToRun.some((l) => !l.isTool);

          // Allow execution if we have an tool, or if we have agent and path is "*"
          if (!hasTool && !(hasAgent && path === "*")) {
            const errorMsg = `Tool not found for path: ${path}`;
            console.error(`[AiAgentKit] ${errorMsg}`);
            throw new Error(errorMsg);
          }

          const runner = layersToRun.reduceRight(
            (
              next: NextFunction,
              layer: Layer<KIT_METADATA, PARTS, TOOLS, ContextState>
            ) =>
              async () => {
                console.log(
                  `[AiAgentKit] -> Running ${
                    layer.isTool ? "tool" : "agent"
                  } for path: ${layer.path}`
                );
                await layer.handler(ctx, next);
                console.log(
                  `[AiAgentKit] <- Finished ${
                    layer.isTool ? "tool" : "agent"
                  } for path: ${layer.path}`
                );
              },
            async () => {} // End of chain
          );

          console.log(
            `[AiAgentKit] Starting execution chain for path: ${path}`
          );
          await runner();
          console.log(
            `[AiAgentKit] Finished execution chain for path: ${path}`
          );
        },
      }),
    });
  }
}
