# AI Agent Kit

`AiAgentKit` is a lightweight, composable router for building complex AI agents and applications, inspired by modern web frameworks like Express.js and Next.js. It allows you to structure your AI logic using middleware (`agents`) and final handlers (`tools`), and provides a flexible way to handle different API paths with a single, organized entry point.

This routing system is built on top of the Vercel AI SDK and is designed to stream rich UI components, text, and data to your frontend.

## Core Concepts

- **`AiAgentKit`**: The main router instance. You create one and register agents and tools with it.
- **Agents (Middleware)**: These are handler functions that process an incoming request. They can perform actions, modify context, and then pass control to the next agent in the chain. They are registered with `.agent()`.
- **Tools (Final Handlers)**: These are special handlers that terminate the request-response cycle. They are meant to be the final processing step for a given path. They are registered with `.tool()`.
- **`AiContext`**: A context object that is passed through the chain of agents. It contains the incoming messages, a writer for the response stream, and a `state` object for passing data between agents.
- **Path Matching**: Agents and tools are registered for specific URL-like paths.
  - Agents use prefix matching (e.g., a path of `/foo` matches `/foo` and `/foo/bar`). They also support wildcards (`*`) and regular expressions.
  - Tools use exact path matching (e.g., `/foo` only matches `/foo`). They also support regular expressions.

## Basic Usage

Here's how to create a simple agent and tool:

```typescript
import { AiAgentKit } from "./router";
import { UIMessage } from "ai";

// 1. Create a router instance
const router = new AiAgentKit<{ myData: string }>();

// 2. Register a global agent (middleware)
router.agent(async (ctx, next) => {
  console.log("Global agent runs for every request!");
  // You can add data to the shared state
  ctx.state.startTime = Date.now();
  await next(); // Pass control to the next handler
});

// 3. Register a tool for a specific path
router.tool("/hello", async (ctx) => {
  // Use the writer to stream back a response
  ctx.writer.write("Hello from the tool!");
});

// 4. Handle an incoming request
export async function POST(req: Request) {
  const { messages, agentPath } = await req.json();

  return router.handle(agentPath, {
    request: {
      messages: messages as UIMessage<{ myData: string }>[],
    },
  });
}
```

## Nested Routers

For more complex applications, you can split your logic into multiple files using nested routers. `AiAgentKit` supports composition, allowing you to mount one router within another.

This is achieved by using the `constructor` to combine the middleware and tool stacks from different routers.

### Example

Let's say you have a primary router and want to mount a separate router for all paths under `/billing`.

**`billing.router.ts`**

```typescript
import { AiAgentKit } from "./router";

// Create a sub-router for billing features
export const billingRouter = new AiAgentKit();

// This agent will run for any path starting with `/invoices`
// within the context of where billingRouter is mounted.
billingRouter.agent("/invoices", async (ctx, next) => {
  console.log("Handling an invoice request...");
  ctx.state.isInvoice = true;
  await next();
});

// This tool handles the specific path `/invoices/create`
billingRouter.tool("/invoices/create", async (ctx) => {
  ctx.writer.write("Creating a new invoice.");
});
```

**`main.router.ts`**

```typescript
import { AiAgentKit } from "./router";
import { billingRouter } from "./billing.router.ts";

// Create the main router by composing stacks
const mainRouter = new AiAgentKit([
  // Mount the billing router under the "/billing" path
  ...billingRouter.getStackWithPrefix("/billing"),

  // You can add other root-level tools and agents
  ...new AiAgentKit()
    .tool("/status", async (ctx) => {
      ctx.writer.write("System is A-OK.");
    })
    .getStack(),
]);

// Now, you can handle requests:
// - A request to "/billing/invoices/create" will be handled by billingRouter's tool.
// - A request to "/status" will be handled by the main router's tool.
export async function POST(req: Request) {
  const { messages, agentPath } = await req.json();
  return mainRouter.handle(agentPath, { request: { messages } });
}
```

To make this pattern work, you need to add two small helper methods to the `AiAgentKit` class in `router.ts`:

```typescript
// In packages/ai-utils/src/router.ts, inside the AiAgentKit class:

  /**
   * Returns the internal stack of layers.
   */
  getStack() {
    return this.stack;
  }

  /**
   * Returns the internal stack with a path prefix applied to each layer.
   * @param prefix The prefix to add to each path.
   */
  getStackWithPrefix(prefix: string) {
    return this.stack.map(layer => {
      const newPath = layer.path instanceof RegExp
        // This is a simplistic way to combine regex and might need refinement
        ? new RegExp(prefix.replace(/\\/g, '\\\\') + layer.path.source)
        : `${prefix}${layer.path}`.replace('//', '/');

      return {
        ...layer,
        path: newPath,
      };
    });
  }
```

This approach allows for clean code organization and separation of concerns as your AI application grows in complexity.
