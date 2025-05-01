import { prisma } from "@/prisma/prisma";
import { ClientSecretPackageType, ClientSecretVariable } from "@/server/types";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// TODO: also insert UPSTASH envs if this taskInstanceMeta.taskStructure.templateType === "upstash"
// TODO: also insert MONGODB envs if this taskInstanceMeta.taskStructure.templateType === "mongodb"
export async function GET(req: NextRequest) {
  try {
    // Check for the microfox-api-key in the request headers
    const apiKey = req.headers.get("microfox-api-key");
    const origin = req.nextUrl.origin;

    if (apiKey !== process.env.MICROFOX_API_KEY) {
      console.log("apiKey", apiKey);
      console.log("MICROFOX_API_KEY", process.env.MICROFOX_API_KEY);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        let _botVariables = (bot.variables as any[]).filter(
          (variable: ClientSecretVariable) => variable.key !== "SCOPES"
        );
        let _botConfig: any[] = [];
        if (bot.packageType === ClientSecretPackageType.APIKEY) {
          _botConfig = (bot.botConfig as any[]).map(
            (config: ClientSecretVariable) => ({
              key: config.key,
              value: config.value,
            })
          );
        }
        _botVariables = [..._botVariables, ..._botConfig];
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
