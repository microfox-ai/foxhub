import express from "express";
import { githubController } from "../controllers/github.controller.js";

const router = express.Router();

// Webhook endpoint for GitHub events
router.post("/webhook", githubController.handleWebhook);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export const gitHubRoutes = router;
