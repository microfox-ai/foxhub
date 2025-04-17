// api/client-secrets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import {
  TEMPLATE_REPO_OWNER,
  GITHUB_TOKEN,
} from "@/utils/constants/githubInfo";
import { GithubSdk } from "@/utils/services/githubSdk";
import {
  addClientSecretToClientRequest,
  createNewClientSecret,
  createOrUpdateClientSecret,
  removeClientSecretFromClientRequest,
  removeClientSecretFromClientDeployment,
  updateClientSecret,
} from "@/utils/services/db_functions/secrets_helper";

// Create ClientSecret
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      botProjectId,
      userId,
      type,
      variables,
      clientRequestId,
      name,
      status,
      packageName,
      packageConstructor,
      packageType,
      botConfig,
    } = body;

    console.log("body", body);

    if (!botProjectId || !userId || !type || !variables || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const clientSecret = await createNewClientSecret({
      botProjectId,
      userId,
      variables,
      name,
      status,
      clientRequestIds: [clientRequestId],
      clientDeploymentIds: [],
      packageName,
      packageConstructor,
      packageType,
      botConfig,
    });
    return NextResponse.json(clientSecret, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating ClientSecret" },
      { status: 500 }
    );
  }
}

// Get ClientSecret
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const botProjectId = searchParams.get("botProjectId");
    const clientRequestId = searchParams.get("clientRequestId");
    const type = searchParams.get("type");
    const packageType = searchParams.get("packageType");

    const whereClause = {
      ...(id ? { id } : {}),
      ...(userId ? { userId } : {}),
      ...(botProjectId ? { botProjectId } : {}),
      ...(clientRequestId
        ? { clientRequestIds: { has: clientRequestId } }
        : {}),
      ...(type ? { type } : {}),
      ...(packageType ? { packageType } : {}),
    };

    const clientSecrets = await prisma.clientSecret.findMany({
      where: whereClause,
    });

    return NextResponse.json({ clientSecrets }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching ClientSecret" },
      { status: 500 }
    );
  }
}

// Update ClientSecret
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, clientRequestId, ...secretData } = body;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    let updatedSecret = await updateClientSecret(id, secretData);

    if (
      clientRequestId &&
      !updatedSecret.clientRequestIds.includes(clientRequestId)
    ) {
      const updates = await addClientSecretToClientRequest(id, clientRequestId);
      updatedSecret = updates.clientSecret!;
    }

    return NextResponse.json(updatedSecret, { status: 200 });
  } catch (error) {
    console.error("Error updating ClientSecret:", error);
    return NextResponse.json(
      { error: "Error updating ClientSecret" },
      { status: 500 }
    );
  }
}

// Delete ClientSecret or remove bot from client request
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const clientSecret = await prisma.clientSecret.findUnique({
      where: { id },
    });

    if (!clientSecret)
      return NextResponse.json(
        { error: "ClientSecret not found" },
        { status: 404 }
      );

    for (const clientRequestId of clientSecret.clientRequestIds) {
      await removeClientSecretFromClientRequest(id, clientRequestId);
    }

    for (const clientDeploymentId of clientSecret.clientDeploymentIds) {
      await removeClientSecretFromClientDeployment(id, clientDeploymentId);
    }

    await prisma.clientSecret.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Bot deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error handling ClientSecret deletion:", error);
    return NextResponse.json(
      { error: "Error processing delete operation" },
      { status: 500 }
    );
  }
}
