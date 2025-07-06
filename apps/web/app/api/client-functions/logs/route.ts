import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { AWS_REGION, getLambdaLogs } from "@/utils/services/aws/aws_helper";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientDeploymentId, functionName, endpointLink } = body;
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
    )?.serverless;

    if (!serverlessConfig) {
      return NextResponse.json(
        { error: "Serverless config not found" },
        { status: 404 }
      );
    }
    const thisFunction = serverlessConfig.functions.find(
      (f: any) =>
        f.functionName === functionName ||
        endpointLink.includes(f.endpointLink) ||
        f.path === endpointLink ||
        f.endpointLink === endpointLink
    );

    // console.log(
    //   thisFunction,
    //   "thisFunction",
    //   endpointLink,
    //   serverlessConfig.functionBase
    // );
    if (!thisFunction) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }
    const fullFunctionName =
      serverlessConfig.functionBase + "-" + thisFunction.functionName;

    //console.log(functionName, "functionName");
    const logs = await getLambdaLogs({
      functionName: fullFunctionName,
      region: clientDeployment.awsRegion ?? AWS_REGION.US_EAST_1,
      streamLimit: 1,
      limit: 20,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
}
