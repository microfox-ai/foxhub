import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { APP_BASE_FOR_SITES } from "@/utils/constants/appInfo";

// TODO: also insert UPSTASH envs if this taskInstanceMeta.taskStructure.templateType === "upstash"
// TODO: also insert MONGODB envs if this taskInstanceMeta.taskStructure.templateType === "mongodb"
export async function GET(req: NextRequest) {
  try {
    // Check for the microfox-api-key in the request headers
    const apiKey = req.headers.get("microfox-api-key");
    const origin = req.nextUrl.origin;

    console.log(origin);
    // TODO: Need to enable checkers for internal requests & ybgpasss internal requests
    // Skip validation in dev mode or if request is from APP_DOMAIN
    // if (
    //   process.env.NODE_ENV !== "development" &&
    //   !origin.startsWith(APP_BASE_FOR_SITES)
    // ) {
    if (apiKey !== process.env.MICROFOX_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // }

    const { searchParams } = new URL(req.url);
    const clientRequestId = searchParams.get("clientRequestId");
    const mode = searchParams.get("mode");

    if (!clientRequestId || !mode) {
      return NextResponse.json(
        { error: "Missing clientRequestId or mode parameter" },
        { status: 400 }
      );
    }

    // Get the client request
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: clientRequestId },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 }
      );
    }

    // Get all mentioned client bots
    const clientSecrets = await Promise.all(
      clientRequest.mentionedClientSecretIds.map((id) =>
        prisma.clientSecret.findUnique({ where: { id } })
      )
    );

    // Filter out null values and extract variables with matching mode
    const variables = clientSecrets
      .filter((bot) => bot !== null)
      .flatMap((bot) => {
        return (bot?.variables as any[])
          .filter((variable) => {
            return (
              variable.mode &&
              Array.isArray(variable.mode) &&
              variable.mode.includes(mode)
            );
          })
          .map((variable) => ({
            key: variable.key,
            value: variable.value,
            isOptional: variable.isOptional,
          }));
      });

    return NextResponse.json({ variables }, { status: 200 });
  } catch (error) {
    console.error("Error fetching variables:", error);
    return NextResponse.json(
      { error: "Error fetching variables" },
      { status: 500 }
    );
  }
}
