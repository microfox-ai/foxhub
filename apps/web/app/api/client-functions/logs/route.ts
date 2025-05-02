import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { getLambdaLogs } from "@/utils/services/db_functions/aws_helper";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientDeploymentId, endpointLink } = body;
    const clientDeployment = await prisma.clientDeployment.findUnique({
      where: {
        id: clientDeploymentId,
      },
    });

    if (!clientDeployment) {
      return NextResponse.json(
        { error: "Client deployment not found" },
        { status: 404 }
      );
    }

    const serverlessConfig = (
      clientDeployment.metadata as any as ClientDeploymentMetadata
    ).serverless;
    const thisFunction = serverlessConfig.functions.find(
      (f: any) => f.endpointLink === endpointLink
    );
    if (!thisFunction) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }
    const functionName =
      serverlessConfig.functionBase + "-" + thisFunction.functionName;
    const logs = await getLambdaLogs({
      functionName: functionName,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
}
