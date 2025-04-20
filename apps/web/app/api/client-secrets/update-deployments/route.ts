import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { updateLambdaEnvironmentVariables } from "@/utils/services/db_functions/aws_helper";
import { updateClientSecret } from "@/utils/services/db_functions/secrets_helper";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Get ClientSecret
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...secretData } = body;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    let updatedSecret = await updateClientSecret(id, secretData);

    if (
      updatedSecret.variables.length > 0 &&
      updatedSecret.status === CLIENTSECRETSTATUS.FILLED
    ) {
      const clientDeployments = await prisma.clientDeployment.findMany({
        where: {
          originClientRequestId: {
            in: updatedSecret.clientRequestIds,
          },
        },
      });

      for (const deployment of clientDeployments) {
        for (const functionInfo of (
          deployment?.metadata as unknown as ClientDeploymentMetadata
        )?.serverless?.functions) {
          await updateLambdaEnvironmentVariables({
            functionName:
              "u-1745054734317-omega-staging-" + functionInfo.functionName,
            region: "us-east-1",
            environmentVariables: updatedSecret.variables.reduce(
              (acc: Record<string, string>, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
              },
              {}
            ),
          });
        }
      }
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
