import { NextRequest } from "next/server";
import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";
import {
  addClientSecretToClientRequest,
  removeClientSecretFromClientRequest,
  updateDeploymentsOfClientSecret,
  removeDeploymentsOfClientSecret,
} from "@/utils/services/db_functions/secrets_helper";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, clientRequestIdToAdd, clientRequestIdToRemove, ...rest } = body;

  console.log("body", body);

  try {
    if (clientRequestIdToAdd) {
      const response = await addClientSecretToClientRequest(
        id,
        clientRequestIdToAdd
      );
      await updateDeploymentsOfClientSecret(response.clientSecret, [
        clientRequestIdToAdd,
      ]);
      return NextResponse.json(response);
    } else if (clientRequestIdToRemove) {
      const response = await removeClientSecretFromClientRequest(
        id,
        clientRequestIdToRemove
      );
      await removeDeploymentsOfClientSecret(response.clientSecret, [
        clientRequestIdToRemove,
      ]);
      return NextResponse.json(response);
    } else {
      return NextResponse.json(
        { error: "Client request ID is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error creating client secret" },
      { status: 500 }
    );
  }
}
