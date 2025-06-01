import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata } from "@/server/types";
import { NextRequest, NextResponse } from "next/server";
import { fetchLambdaUsage } from "@/utils/services/billing/lambda-usage";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clientRequestId = searchParams.get("clientRequestId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "30");

    if (!clientRequestId) {
      return NextResponse.json(
        { error: "clientRequestId is required" },
        { status: 400 }
      );
    }

    // Get client deployment from client request
    const clientDeployment = await prisma.clientDeployment.findFirst({
      where: {
        originClientRequestId: clientRequestId,
      },
    });

    if (!clientDeployment) {
      return NextResponse.json(
        { error: "Client deployment not found" },
        { status: 404 }
      );
    }
    // Fetch Lambda usage data
    const { invocations } = await fetchLambdaUsage(
      clientRequestId,
      clientDeployment,
      {
        pageSize: pageSize * 3,
        streamLimit: 20,
      }
    );

    // Sort invocations by timestamp in descending order
    invocations.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInvocations = invocations.slice(startIndex, endIndex);

    return NextResponse.json({
      results: paginatedInvocations,
      total: invocations.length,
      page,
      pageSize,
      totalPages: Math.ceil(invocations.length / pageSize),
    });
  } catch (error) {
    console.error("Error fetching Lambda history:", error);
    return NextResponse.json(
      { error: "Failed to fetch Lambda history" },
      { status: 500 }
    );
  }
}
