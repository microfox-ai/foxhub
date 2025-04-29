import express from "express";
import { config } from "dotenv";
import { App, createNodeMiddleware } from "@octokit/app";
import mongoose from "mongoose";
import { gitHubRoutes } from "./routes/github.routes.js";
import { PackageFox } from "./lib/octokit.js";
import { registerGitHubHooks } from "./hooks/github.hooks.js";

// Load environment variables
config();

const app = express();
const port = process.env.GITBOT_PORT || 7001;

// Middleware
app.use(express.json());

// Register GitHub webhooks
console.log("Setting up GitHub webhooks...", process.env.GITHUB_WEBHOOK_SECRET);
// const _appWithHooks = registerGitHubHooks(PackageFox);

// Log installations
await PackageFox.eachInstallation(({ octokit, installation }) => {
  console.log(`Found installation: ${installation.id}`);
});

await PackageFox.eachRepository(({ octokit, repository }) => {
  console.log(`Found repository: ${repository.name}`);
});

PackageFox.webhooks.onAny((event) => {
  console.log("Any event received:", JSON.stringify(event, null, 2));
});

// Create Octokit middleware
const octokitMiddleware = createNodeMiddleware(PackageFox, {
  pathPrefix: "/api/v1/packagefox",
  log: console,
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_CONNECTION_URL!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Octokit routes
app.use(octokitMiddleware);

// Custom routes
//app.use("/api/v2/packagefox", gitHubRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware (must be defined AFTER all other routes/middleware)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction // Keep next even if unused for now, it's the standard signature
  ) => {
    console.error("Unhandled error:", err.stack || err); // Log the error stack or the error itself

    // Avoid sending response if headers already sent (e.g., by a streaming response)
    if (res.headersSent) {
      return next(err); // Delegate to default Express handler if response already started
    }

    // Send a generic JSON error response
    res.status(500).json({ error: "Internal Server Error" });
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(
    `Webhook endpoint: http://localhost:${port}/api/v1/packagefox/webhook`
  );
});
