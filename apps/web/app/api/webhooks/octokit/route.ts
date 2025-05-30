import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { prisma } from "@/prisma/prisma";
import { OctokitWebhook } from "@microfox/webhook-octokit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  //const body = await req.json();
  const octokitWebhook = new OctokitWebhook({
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  });
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  if (!event.body) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }
  octokitWebhook.onAny((event) => {
    console.log("octokit event", event.name);
    if (event.name === "push") {
      console.log("push event", event.payload);
      const { repository, ref, head_commit } = event.payload;
      const branch = ref.replace("refs/heads/", "");
      const repoName = repository.name;
      const commitMessage = head_commit.message;
      prisma.clientRequest
        .findFirst({
          where: {
            repoName,
            prBranch: branch,
          },
        })
        .then((clientRequest) => {
          if (!clientRequest) {
            console.log("no client request found");
            return;
          }
          console.log("client request found", clientRequest.id);
          if (commitMessage.includes("deployfox")) {
            console.log("deployfox commit", commitMessage);
          }
          if (commitMessage.includes("updatefox")) {
            console.log("buildfox commit", commitMessage);
          }
        });
    }
  });
  //console.log("octokit event triggered", event.body.length);
  await octokitWebhook.verifyAndReceive(event.body, event.headers);
  //console.log("payload", payload.event.type, "team_id", payload.team_id);
  // get botToken from db based on team_id.
  return NextResponse.json({ message: "Webhook received" }, { status: 200 });
}
