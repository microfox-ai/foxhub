import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { APP_BASE_FOR_SITES } from "@/utils/constants/appInfo";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { ClientSecretVariable } from "@/server/types";

// TODO: also insert UPSTASH envs if this taskInstanceMeta.taskStructure.templateType === "upstash"
// TODO: also insert MONGODB envs if this taskInstanceMeta.taskStructure.templateType === "mongodb"
export async function GET(req: NextRequest) {
  try {
    // Check for the microfox-api-key in the request headers
    const apiKey = req.headers.get("microfox-api-key");
    const origin = req.nextUrl.origin;

    //console.log("lambda function triggers", origin, apiKey);
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
    const stage = searchParams.get("stage");

    if (!clientRequestId || !stage) {
      return NextResponse.json(
        { error: "Missing clientRequestId or mode parameter" },
        { status: 400 }
      );
    }

    // Get all mentioned client bots
    const clientSecrets = await prisma.clientSecret.findMany({
      where: {
        clientRequestIds: {
          has: clientRequestId,
        },
      },
    });

    // Filter out null values and extract variables with matching mode
    const variables = clientSecrets
      .filter((bot) => bot !== null)
      .filter((bot) => bot.status === CLIENTSECRETSTATUS.FILLED)
      .flatMap((bot) => {
        let _botVariables =
          typeof bot.variables === "string"
            ? JSON.parse(bot.variables)
            : bot.variables;
        return (_botVariables as ClientSecretVariable[]).filter(
          (variable) => variable.stage === stage || !variable.stage
        );
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
