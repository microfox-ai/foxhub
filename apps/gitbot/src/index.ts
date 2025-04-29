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

registerGitHubHooks(PackageFox);
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
//app.use(octokitMiddleware);

// Custom routes
//app.use("/api/v1/packagefox", gitHubRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
// Error handling middleware
app.use(
  async (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.log("Request received:", req.originalUrl);
    console.error(err.stack);
    if (await octokitMiddleware(req, res, next)) {
      return;
    } else {
      next();
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
