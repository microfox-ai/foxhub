import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const projectId = searchParams.get("projectId");
  const userId = searchParams.get("userId");

  const project = await prisma.clientSecret.findMany({
    where: {
      ...(id && { id }),
      ...(projectId && { botProjectId: projectId }),
      ...(userId && { userId }),
    },
  });

  const thisSecret = project[0];
  if (!thisSecret) {
    return NextResponse.json(
      { error: "Secret not found for " + id },
      { status: 404 }
    );
  }
  let newSecret = { ...thisSecret };

  const publicKeys = ["WHATSAPP_BUSINESS_PHONE_NUMBER", "WHATSAPP_ICON_URL"];

  const variables = thisSecret?.variables.filter((variable: any) =>
    publicKeys.includes(variable.key)
  );
  const botConfig = thisSecret?.botConfig.filter((config: any) =>
    publicKeys.includes(config.key)
  );

  thisSecret.variables = variables;
  thisSecret.botConfig = botConfig;

  return NextResponse.json(thisSecret, { status: 200 });
}
