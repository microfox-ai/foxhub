import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { fetchAuthSecrets } from "@/server/toolfox/helpers/fetchVariables";
import { ClientRequest } from "@prisma/client";
import { AuthOptions } from "@microfox/tool-kit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authOptions, clientRequestId, userId } = body as {
      authOptions: AuthOptions;
      clientRequestId?: string;
      userId?: string;
    };

    let clientRequest: ClientRequest | null = null;
    if (clientRequestId) {
      clientRequest = await prisma.clientRequest.findUnique({
        where: {
          id: clientRequestId,
        },
      });
    }

    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 }
      );
    }

    const hitlAuthObject = await fetchAuthSecrets(authOptions, {
      clientRequest,
      userId,
      fillEncryptionKey: true,
      fillVariables: false,
    });

    return NextResponse.json(hitlAuthObject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
