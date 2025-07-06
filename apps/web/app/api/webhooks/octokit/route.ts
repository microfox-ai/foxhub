import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { prisma } from "@/prisma/prisma";
import { OctokitWebhook } from "@microfox/webhook-octokit";
import { WebhookResponse } from "@microfox/webhook-kit";
import { NextRequest, NextResponse } from "next/server";

/** FOR INTERNAL USE ONLY  - for syncing deployments & update steps from github */
export async function POST(req: NextRequest) {
  //const body = await req.json();
  const octokitWebhook = new OctokitWebhook({
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  });
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  if (!event.body) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }
  octokitWebhook.onAny(async (event) => {
    console.log("octokit event", event.name);
    if (event.name === "push") {
      //console.log("push event", event.payload);
      const { repository, ref, head_commit } = event.payload;
      const branch = ref.replace("refs/heads/", "");
      const repoName = repository.name;
      const commitMessage = head_commit.message;
      const ownerName = repository.owner.name;
      const sha = head_commit.id;
      const clientRequest = await prisma.clientRequest.findFirst({
        where: {
          repoName,
          prBranch: branch,
        },
      });
      if (!clientRequest) {
        console.log("no client request found");
        return;
      }
      console.log("client request found", clientRequest.id);
      if (commitMessage.includes("deployfox")) {
        const stageMatch = commitMessage.match(/^(.*?): deployfox:/);
        let stage = stageMatch ? stageMatch[1] : null;
        console.log(`Detected stage from commit message: ${stage}`);

        // const deleteSls = commitMessage.includes("DELETE");
        // console.log(`Detected deleteSls from commit message: ${deleteSls}`);

        // if (deleteSls) {
        //   const response = await fetch(
        //     `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployments/delete?clientRequestId=${clientRequest.id}${sha ? `&sha=${sha}` : ""}${stage ? `&stage=${stage}` : ""}`,
        //   {
        //     method: "DELETE",
        //     headers: {
        //       "Content-Type": "application/json",
        //     },
        //   }
        //   );
        //   if (response.ok) {
        //     console.log("lambda deployments deletion triggered");
        //   } else {
        //     console.log("lambda deployments deletion failed");
        //   }
        //   return;
        // }

        if (!stage) {
          stage = "STAGING";
        }

        const isLocal = commitMessage.includes("LOCAL");
        console.log(`Detected isLocal from commit message: ${isLocal}`);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_CICD_BASE_URL}/api/deployments/new?clientRequestId=${clientRequest.id}&sha=${sha}&stage=${stage}&isLocal=${isLocal}`
        );
        if (response.ok) {
          console.log(
            isLocal ? "local deployment triggered" : "deployment triggered"
          );
        } else {
          console.log("deployment failed");
        }
        // await prisma.webhookEvent.create({
        //   data: {
        //     status: "pending",
        //     provider: "octokit",
        //     event_id: event.id,
        //     event_name: event.name,
        //     payload: event.payload,
        //     originClientRequestId: clientRequest.id,
        //     triggerRoute: {
        //       path: `${process.env.CICD_BASE_URL}/api/deployments/new`,
        //       method: "GET",
        //       params: {
        //         clientRequestId: clientRequest.id,
        //         stage,
        //       },
        //     },
        //   },
        // });
      }
      if (commitMessage.includes("updatefox")) {
        console.log("updatefox commit", commitMessage);
        await prisma.webhookEvent.create({
          data: {
            status: "pending",
            provider: "octokit",
            event_id: event.id,
            event_name: event.name,
            payload: event.payload,
            originClientRequestId: clientRequest.id,
            triggerRoute: {
              path: "/task-instance-meta/files-changed",
              method: "POST",
              timeout: 60_000,
              body: {
                clientRequestId: clientRequest.id,
                commitSha: sha,
              },
            },
          },
        });
      }
    }
  });
  //console.log("octokit event triggered", event.body.length);
  const response: WebhookResponse | void = await octokitWebhook.receive({
    headers: event.headers,
    body: event.body,
  });
  if (response && "statusCode" in response) {
    return ApiGatewayAdapter.toNextResponse(response);
  } else {
    return NextResponse.json({ error: "No response" }, { status: 500 });
  }
}
