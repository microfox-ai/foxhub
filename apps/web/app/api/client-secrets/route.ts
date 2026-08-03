// api/client-secrets/route.ts
import { prisma } from "@/prisma/prisma";
import { ClientSecretPackageType } from "@/server/types";
import {
  addClientSecretToClientRequest,
  createNewClientSecret,
  updateClientSecret,
  updateDeploymentsOfClientSecret,
} from "@/utils/services/db_functions/secrets_helper";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
import { AWS_REGION } from "@/utils/services/aws/aws_helper";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
// Create ClientSecret
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      addToClientRequest,
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
      updateDeployments,
      isHidden,
      templateId,
      tokenResponse,
      identityMetadata,
      identityOrgId,
      identityTeamId,
      identityUserId,
    } = body;

    if (!botProjectId || !userId || !variables) {
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
      clientRequestIds: clientRequestId ? [clientRequestId] : [],
      clientDeploymentIds: [],
      packageName,
      packageConstructor,
      packageType,
      botConfig,
      isHidden: isHidden ?? false,
      templateId,
      tokenResponse: tokenResponse ?? undefined,
      identityMetadata: identityMetadata ?? undefined,
      awsRegion: "",
    });

    if (addToClientRequest) {
      await addClientSecretToClientRequest(clientSecret.id, clientRequestId);
    }

    try {
      if (updateDeployments) {
        await updateDeploymentsOfClientSecret(clientSecret);
      }
    } catch (error) {
      console.error("Error Trying to update Deployments:", error);
    }

    return NextResponse.json(clientSecret, { status: 200 });
  } catch (error) {
    console.error("Error creating ClientSecret:", error);
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
    const packageName = searchParams.get("packageName");
    const packageConstructor = searchParams.get("packageConstructor");
    const withPackageInfos = searchParams.get("withPackageInfos");
    const packageTypes = searchParams.get("packageTypes");
    const status = searchParams.get("status");
    const includeTemplateSecrets = searchParams.get("includeTemplateSecrets");

    const whereClause = {
      ...(id ? { id } : {}),
      ...(userId ? { userId } : {}),
      ...(botProjectId ? { botProjectId } : {}),
      ...(clientRequestId
        ? { clientRequestIds: { has: clientRequestId } }
        : {}),
      ...(type ? { type } : {}),
      ...(packageType ? { packageType } : {}),
      ...(packageName ? { packageName } : {}),
      ...(packageConstructor ? { packageConstructor } : {}),
      ...(packageTypes ? { packageType: { in: packageTypes.split(",") } } : {}),
      ...(status ? { status: status as CLIENTSECRETSTATUS } : {}),
    };

    const clientSecrets = await prisma.clientSecret.findMany({
      where: whereClause,
    });
    let finalClientSecrets = [];
    let finalTemplateSecrets = [];

    if (includeTemplateSecrets === "true") {
      const templateSecrets = await prisma.clientSecretTemplate.findMany({
        where: {
          packageName,
        },
      });
      //console.log("templateSecrets", templateSecrets);
      for (const templateSecret of templateSecrets) {
        let packageInfo = null;
        if (
          withPackageInfos === "true" &&
          templateSecret.packageName &&
          (templateSecret.packageType === ClientSecretPackageType.APIKEY ||
            templateSecret.packageType === ClientSecretPackageType.OAUTH2)
        ) {
          try {
            packageInfo = await PackageInfoHelper.getPackageInfo(
              templateSecret.packageName
            );
          } catch (error) {
            // A package lookup failing shouldn't drop the whole list — return the
            // secret without its package metadata instead.
            console.error(
              "Error fetching package info for template secret",
              templateSecret.id,
              templateSecret.packageName,
              error
            );
          }
        }
        finalTemplateSecrets.push({
          ...templateSecret,
          packageInfo,
        });
      }
    }

    for (const clientSecret of clientSecrets) {
      let packageInfo = null;
      if (
        withPackageInfos === "true" &&
        clientSecret.packageName &&
        (clientSecret.packageType === ClientSecretPackageType.APIKEY ||
          clientSecret.packageType === ClientSecretPackageType.OAUTH2)
      ) {
        try {
          packageInfo = await PackageInfoHelper.getPackageInfo(
            clientSecret.packageName
          );
        } catch (error) {
          console.error(
            "Error fetching package info for client secret",
            clientSecret.id,
            clientSecret.packageName,
            error
          );
        }
      }
      finalClientSecrets.push({
        ...clientSecret,
        packageInfo,
      });
    }

    return NextResponse.json(
      {
        clientSecrets: finalClientSecrets,
        clientSecretTemplates: finalTemplateSecrets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching ClientSecret:", error);
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
    const {
      id,
      clientRequestId,
      updateDeployments,
      botProjectId,
      addToClientRequest,
      ...secretData
    } = body;

    console.log(
      "secretData",
      secretData,
      id,
      clientRequestId,
      updateDeployments
    );
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    let updatedSecret = await updateClientSecret(id, secretData);

    console.log("updatedSecret", updatedSecret);

    if (
      clientRequestId &&
      !updatedSecret.clientRequestIds.includes(clientRequestId)
      //&& addToClientRequest
    ) {
      const updates = await addClientSecretToClientRequest(id, clientRequestId);
      if (updates.clientSecret) {
        updatedSecret = updates.clientSecret;
      }
    }

    if (updateDeployments) {
      await updateDeploymentsOfClientSecret(updatedSecret);
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

    // for (const clientRequestId of clientSecret.clientRequestIds) {
    //   await removeClientSecretFromClientRequest(id, clientRequestId);
    // }

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
