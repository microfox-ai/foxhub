import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("MicrofoxTemplateApiKey");

  if (apiKey !== process.env.MICROFOX_TEMPLATE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { packageName, templateType, templateId } = await req.json();

    if (templateId) {
      const templates = await prisma.clientSecretTemplate.findMany({
        where: {
          templateId,
        },
      });

      return NextResponse.json(templates);
    }

    if (!packageName || !templateType) {
      return NextResponse.json(
        { error: "Missing packageName or templateType" },
        { status: 400 }
      );
    }

    if (templateType != "testing") {
      return NextResponse.json(
        { error: "Invalid templateType - only testing is supported" },
        { status: 400 }
      );
    }

    const templates = await prisma.clientSecretTemplate.findMany({
      where: {
        packageName,
        templateType,
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching client secret templates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
