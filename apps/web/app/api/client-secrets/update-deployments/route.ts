import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { updateLambdaEnvironmentVariables } from "@/utils/services/aws/aws_helper";
import {
  updateClientSecret,
  updateDeploymentsOfClientSecret,
} from "@/utils/services/db_functions/secrets_helper";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Get ClientSecret
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...secretData } = body;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    let updatedSecret = await updateClientSecret(id, secretData);

    await updateDeploymentsOfClientSecret(updatedSecret);

    return NextResponse.json(updatedSecret, { status: 200 });
  } catch (error) {
    console.error("Error updating ClientSecret:", error);
    return NextResponse.json(
      { error: "Error updating ClientSecret" },
      { status: 500 }
    );
  }
}
