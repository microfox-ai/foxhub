import { prisma } from "@/prisma/prisma";
import {
  updateClientSecret,
  updateDeploymentsOfClientSecret,
} from "@/utils/services/db_functions/secrets_helper";
import { NextRequest, NextResponse } from "next/server";

// Create ClientSecretTemplate
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      templateId,
      name,
      type,
      variables,
      botConfig,
      packageName,
      packageConstructor,
      packageType,
      templateType,
      metadata,
    } = body;

    if (!templateId || !name || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const clientSecretTemplate = await prisma.clientSecretTemplate.create({
      data: {
        templateId,
        name,
        type,
        variables: variables || [],
        botConfig: botConfig || [],
        packageName,
        packageConstructor,
        packageType,
        templateType,
        metadata,
      },
    });

    return NextResponse.json(clientSecretTemplate, { status: 200 });
  } catch (error) {
    console.error("Error creating ClientSecretTemplate:", error);
    return NextResponse.json(
      { error: "Error creating ClientSecretTemplate" },
      { status: 500 }
    );
  }
}

// Get ClientSecretTemplate
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const templateId = searchParams.get("templateId");
    const type = searchParams.get("type");
    const packageType = searchParams.get("packageType");
    const packageName = searchParams.get("packageName");
    const packageConstructor = searchParams.get("packageConstructor");

    const whereClause = {
      ...(id ? { id } : {}),
      ...(templateId ? { templateId } : {}),
      ...(type ? { type } : {}),
      ...(packageType ? { packageType } : {}),
      ...(packageName ? { packageName } : {}),
      ...(packageConstructor ? { packageConstructor } : {}),
    };

    const clientSecretTemplates = await prisma.clientSecretTemplate.findMany({
      where: whereClause,
    });

    return NextResponse.json({ clientSecretTemplates }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ClientSecretTemplate:", error);
    return NextResponse.json(
      { error: "Error fetching ClientSecretTemplate" },
      { status: 500 }
    );
  }
}

// Update ClientSecretTemplate
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...templateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updatedTemplate = await prisma.clientSecretTemplate.update({
      where: { id },
      data: templateData,
    });

    const clientSecrets = await prisma.clientSecret.findMany({
      where: {
        templateId: id,
      },
    });

    if (clientSecrets.length > 10) {
      return NextResponse.json(
        {
          error:
            "You have too many secrets for this template. Please Ask Admin to perform action.",
        },
        { status: 500 }
      );
    }

    for (const clientSecret of clientSecrets) {
      await updateClientSecret(clientSecret.id, {
        variables: updatedTemplate.variables,
        botConfig: updatedTemplate.botConfig,
      });
      if (clientSecret.clientRequestIds.length > 0) {
        await updateDeploymentsOfClientSecret(
          clientSecret,
          clientSecret.clientRequestIds
        );
      }
    }

    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    console.error("Error updating ClientSecretTemplate:", error);
    return NextResponse.json(
      { error: "Error updating ClientSecretTemplate" },
      { status: 500 }
    );
  }
}

// Delete ClientSecretTemplate
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const template = await prisma.clientSecretTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "ClientSecretTemplate not found" },
        { status: 404 }
      );
    }

    await prisma.clientSecretTemplate.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "ClientSecretTemplate deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting ClientSecretTemplate:", error);
    return NextResponse.json(
      { error: "Error deleting ClientSecretTemplate" },
      { status: 500 }
    );
  }
}
