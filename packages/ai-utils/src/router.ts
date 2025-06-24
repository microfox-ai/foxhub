import {
  UIMessage,
  createUIMessageStream,
  UIMessageStreamWriter,
  createUIMessageStreamResponse,
} from "ai";

// --- Core Types ---
// For clarity, these are defined here. They can be moved to a separate types.ts file.

/**
 * The context object passed through the middleware chain.
 */
export type AiContext = {
  request: {
    messages: UIMessage[];
    [key: string]: any;
  };
  state: {
    [key: string]: any;
  };
  /**
   * The writer for the UI Message Stream. Middleware and agents
   * use this to contribute to the final response by calling methods
   * like `.write()` or `.merge()`.
   */
  writer: UIMessageStreamWriter;
};

export type NextFunction = () => Promise<void>;
export type AiHandler = (ctx: AiContext) => Promise<void>;
export type AiMiddleware = (
  ctx: AiContext,
  next: NextFunction
) => Promise<void>;

// --- Router Implementation ---

type Layer = {
  path: string | RegExp;
  handler: AiMiddleware;
  isAgent: boolean;
};

/**
 * A composable router for AI agents, inspired by Express.js.
 */
export class AiAgentKit {
  private stack: Layer[] = [];

  /**
   * Registers a middleware that runs for a specific path prefix, regex pattern, or wildcard.
   * @param path The path prefix, regex pattern, or "*" for wildcard matching.
   * @param middleware The middleware function(s).
   */
  use(
    path: string | RegExp | AiMiddleware,
    ...middleware: AiMiddleware[]
  ): this {
    let prefix: string | RegExp = "/";
    if (typeof path === "string" || path instanceof RegExp) {
      prefix = path;
    } else {
      middleware.unshift(path);
    }

    for (const handler of middleware) {
      if (typeof handler !== "function") continue;
      this.stack.push({ path: prefix, handler, isAgent: false });
      console.log(`[AiAgentKit] Middleware registered for path: ${prefix}`);
    }

    return this;
  }

  /**
   * Registers a final agent handler for a specific path or regex pattern.
   * @param path The path or regex pattern to match exactly.
   * @param handler The agent handler function.
   */
  agent(path: string | RegExp, handler: AiHandler): this {
    if (this.stack.some((l) => l.isAgent && l.path === path)) {
      throw new Error(`An agent is already registered for path: ${path}`);
    }
    // An agent is the final step, so its handler is wrapped in a middleware
    // that doesn't call `next()`. This makes the types consistent.
    const agentMiddleware: AiMiddleware = async (ctx, _next) => {
      await handler(ctx);
    };
    this.stack.push({ path, handler: agentMiddleware, isAgent: true });
    console.log(`[AiAgentKit] Agent registered for path: ${path}`);
    return this;
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
    initialContext: Omit<AiContext, "state" | "writer">
  ): Response {
    console.log(`[AiAgentKit] Handling request for path: ${path}`);
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        originalMessages: initialContext.request.messages,
        execute: async ({ writer }) => {
          const ctx: AiContext = { ...initialContext, state: {}, writer };

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

            // For agents, require exact path match (unless it's a regex)
            if (layer.isAgent) {
              if (layer.path === "*") {
                shouldRun = false; // Agents can't use wildcard
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
              .map((l) => `${l.path} (${l.isAgent ? "agent" : "middleware"})`)
              .join(", ")}`
          );

          const hasAgent = layersToRun.some((l) => l.isAgent);
          const hasMiddleware = layersToRun.some((l) => !l.isAgent);

          // Allow execution if we have an agent, or if we have middleware and path is "*"
          if (!hasAgent && !(hasMiddleware && path === "*")) {
            const errorMsg = `Agent not found for path: ${path}`;
            console.error(`[AiAgentKit] ${errorMsg}`);
            throw new Error(errorMsg);
          }

          const runner = layersToRun.reduceRight(
            (next: NextFunction, layer: Layer) => async () => {
              console.log(
                `[AiAgentKit] -> Running ${
                  layer.isAgent ? "agent" : "middleware"
                } for path: ${layer.path}`
              );
              await layer.handler(ctx, next);
              console.log(
                `[AiAgentKit] <- Finished ${
                  layer.isAgent ? "agent" : "middleware"
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
