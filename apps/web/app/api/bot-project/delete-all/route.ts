import { prisma } from "@/prisma/prisma";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { deleteRepository } from "@/utils/services/github_functions/deleteRepo";
import { DEPLOY_STAGE } from "@prisma/client";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Delete the bot workspace and all its tasks.
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    console.log("id", id);
    if (!id) {
      return NextResponse.json(
        { error: "Missing function ID" },
        { status: 400 }
      );
    }

    const botProject = await prisma.botProject.findUnique({
      where: { id: id },
    });

    const deleteResponse: any = {};

    // 1. Delete all client requests
    try {
      const clientRequests = await prisma.clientRequest.findMany({
        where: { botProjectId: id },
      });

      const requestDeletes = clientRequests.map(async (request) => {
        await fetch(
          `${APP_BASE_URL}/api/client-requests/delete-all?id=${request.id}`,
          {
            method: "DELETE",
          }
        );
      });

      const allDeleted = await Promise.all(requestDeletes);
      deleteResponse.clientRequests = allDeleted;
    } catch (error) {
      console.error("Error deleting ClientDeployment:", error);
      return NextResponse.json(
        { error: "Error deleting ClientDeployment" },
        { status: 500 }
      );
    }

    if (botProject?.githubRepoName) {
      //2. delete the githubRepo.
      try {
        const deleteGithubResponse = await deleteRepository(
          botProject?.githubRepoName ?? ""
        );
        deleteResponse.githubRepo = deleteGithubResponse;
      } catch (error) {
        console.error("Error deleting githubRepo:", error);
      }
    }

    //3. Mark botProject as archived.
    try {
      await prisma.botProject.update({
        where: { id: id },
        data: { archiveStatus: "archived" },
      });
    } catch (error) {
      console.error("Error archiving botProject:", error);
      return NextResponse.json(
        { error: "Error archiving botProject" },
        { status: 500 }
      );
    }

    //4. linked files
    // Delete all client secrets
    try {
      const allClientSecrets = await prisma.clientSecret.findMany({
        where: { botProjectId: id },
      });
      const clientSecretDeletes = allClientSecrets.map(async (secret) => {
        await prisma.clientSecret.delete({
          where: { id: secret.id },
        });
      });
      const whatsAppDeletes = allClientSecrets.map(async (secret) => {
        await prisma.whatsAppVerification.deleteMany({
          where: { clientSecretId: secret.id },
        });
      });
      await Promise.all(clientSecretDeletes);
      await Promise.all(whatsAppDeletes);
      deleteResponse.clientSecrets = "deleted";
      deleteResponse.whatsAppVerifications = "deleted";
    } catch (error) {
      console.error("Error deleting ClientSecrets:", error);
      // Continue execution even if this fails
    }

    // Delete all project permissions
    try {
      await prisma.projectPermission.deleteMany({
        where: { botProjectId: id },
      });
      deleteResponse.projectPermissions = "deleted";
    } catch (error) {
      console.error("Error deleting ProjectPermissions:", error);
      // Continue execution even if this fails
    }

    // Delete all webhook events
    try {
      await prisma.webhookEvent.deleteMany({
        where: { originBotProjectId: id },
      });
      deleteResponse.webhookEvents = "deleted";
    } catch (error) {
      console.error("Error deleting WebhookEvents:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Deletion triggered. We will delete the function in a few minutes.",
        deleteResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error deleting ClientDeployment" },
      { status: 500 }
    );
  }
}
