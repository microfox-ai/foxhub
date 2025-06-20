import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ providerId: string }> }
) {
  const params = await segmentData.params;
  const { providerId } = params;
  console.log("providerId", providerId);
  return NextResponse.json(
    { message: "Webhook received for provider " + providerId },
    { status: 200 }
  );
}
