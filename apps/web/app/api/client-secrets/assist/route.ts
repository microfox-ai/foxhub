import {
  addClientSecretToClientRequest,
  updateClientSecret,
  updateDeploymentsOfClientSecret,
} from "@/utils/services/db_functions/secrets_helper";
import { NextRequest, NextResponse } from "next/server";

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
      updatedSecret = updates.clientSecret!;
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
