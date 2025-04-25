import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientRequestId = searchParams.get("clientRequestId");

    if (clientRequestId) {
      const clientDeployment = await prisma.clientDeployment.findFirst({
        where: {
          originClientRequestId: clientRequestId,
        },
      });

      if (clientDeployment) {
        return NextResponse.json({
          success: true,
          message: "Deployment found",
          clientDeployment,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "Deployment not found",
        });
      }
    }
  } catch (error) {
    console.error("Error checking deployment:", error);
    return NextResponse.json(
      { error: "Error checking deployment" },
      { status: 500 }
    );
  }
}
