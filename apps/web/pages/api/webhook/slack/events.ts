import { SlackWebhookSdk } from "@microfox/webhook-slack";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    console.log("body", body);
    const slackWebhook = new SlackWebhookSdk(
      process.env.SLACK_SIGNING_SECRET!,
      undefined,
      "nextjs"
    );

    slackWebhook.onMessage(async ({ message }) => {
      console.log("message", message);
      return;
    });

    await slackWebhook.handleNextJs(req, res);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
