import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { OctokitWebhook } from "@microfox/webhook-octokit";
import { NextRequest, NextResponse } from "next/server";

/**
 * PackageFox GitHub App webhooks, moved here from apps/gitbot. The path matches the old
 * gitbot route, so the GitHub App only needs its webhook host changed.
 */
export async function POST(req: NextRequest) {
  const octokitWebhook = new OctokitWebhook({
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  });

  octokitWebhook.on("pull_request.opened", async ({ payload }) => {
    const { pull_request } = payload;
    if (!pull_request.title.toLowerCase().includes("version packages")) return;

    await slackBotSdk.sendMessage({
      channel: MySlackChannels.microfox_updates,
      text: `New Packages are awaiting release: Please verify them & merge at link: ${pull_request.html_url}`,
      icon_url: MICROFOX_LOGO,
      username: "PackageFox",
    });
  });

  // Verify the signature against the raw body; re-serialized JSON may not match it.
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature || !(await octokitWebhook.verify(body, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    await octokitWebhook.receive({
      headers: Object.fromEntries(req.headers.entries()),
      body,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PackageFox webhook handler failed:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
