import { Request, Response } from "express";
import { App } from "@octokit/app";
import { GitHubEvent } from "../models/github-event.model.js";
import { MicrofoxAiApp } from "../lib/octokit.js";

class GitHubController {
  private octokitApp: App;

  constructor(octokitApp: App) {
    this.octokitApp = octokitApp;
  }

  handleWebhook = async (req: Request, res: Response) => {
    try {
      const eventName = req.headers["x-github-event"];
      const signature = req.headers["x-hub-signature-256"];

      if (!signature) {
        return res.status(401).json({ error: "No signature provided" });
      }

      // Verify webhook signature
      const isValid = await this.octokitApp.webhooks.verify(
        JSON.stringify(req.body),
        signature as string
      );

      if (!isValid) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Store the event in MongoDB
      await this.storeEvent(eventName as string, req.body);

      // Handle different GitHub events
      switch (eventName) {
        case "installation":
          await this.handleInstallation(req.body);
          break;
        case "push":
          await this.handlePush(req.body);
          break;
        default:
          console.log(`Unhandled event type: ${eventName}`);
      }

      res.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  private async storeEvent(eventType: string, payload: any) {
    try {
      const event = new GitHubEvent({
        eventType,
        payload,
        repository: payload.repository
          ? {
              name: payload.repository.name,
              owner: payload.repository.owner.login,
              fullName: payload.repository.full_name,
            }
          : undefined,
        sender: payload.sender
          ? {
              login: payload.sender.login,
              id: payload.sender.id,
            }
          : undefined,
      });
      await event.save();
    } catch (error) {
      console.error("Error storing event:", error);
    }
  }

  private async handleInstallation(payload: any) {
    console.log("Installation event received:", payload);
    // Handle installation events (e.g., when someone installs your GitHub App)
  }

  private async handlePush(payload: any) {
    console.log("Push event received:", payload);
    // Handle push events (e.g., when code is pushed to a repository)
  }
}

// Export a singleton instance
export const githubController = new GitHubController(MicrofoxAiApp);
