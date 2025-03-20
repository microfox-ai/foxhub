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
    const templates = await prisma.clientSecretTemplate.findMany({
      where: filters,
    });
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error fetching templates" },
      { status: 500 },
    );
  }
}

// Create a new BotTemplate (custom or predefined)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, name, requiredKeys } = body;

    const newTemplate = await prisma.clientSecretTemplate.create({
      data: { userId, type, name, requiredKeys },
    });
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating template" },
      { status: 500 },
    );
  }
}

// Update an existing BotTemplate
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, requiredKeys } = body;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const updatedTemplate = await prisma.clientSecretTemplate.update({
      where: { id },
      data: { requiredKeys },
    });
    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating template" },
      { status: 500 },
    );
  }
}

// Delete a BotTemplate
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.clientSecretTemplate.delete({ where: { id } });
    return NextResponse.json(
      { message: "Deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting template" },
      { status: 500 },
    );
  }
}
