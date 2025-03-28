// api/client-secrets/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

// Get all BotTemplates (predefined + custom)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // If a userId is provided, include templates with a null userId (predefined) or matching userId.
    const filters = userId ? { OR: [{ userId: null }, { userId }] } : {};
    // TODO: KSHITIJ - fetch from github directly (check/search getInternalPackages in repo)
    // you will have to manipulate it to extarct the data you require for client secret templates

    // const templates = await prisma.clientSecretTemplate.findMany({
    //   where: filters,
    // });
    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error fetching templates" },
      { status: 500 }
    );
  }
}
