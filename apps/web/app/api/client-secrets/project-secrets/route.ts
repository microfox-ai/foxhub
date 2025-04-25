import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const projectId = searchParams.get("projectId");
  const userId = searchParams.get("userId");

  // if (!projectId) {
  //   return NextResponse.json(
  //     { error: "Project ID is required" },
  //     { status: 400 }
  //   );
  // }

  // if (!userId) {
  //   return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  // }

  const project = await prisma.clientSecret.findMany({
    where: {
      ...(id && { id }),
      ...(projectId && { botProjectId: projectId }),
      ...(userId && { userId }),
    },
  });

  return NextResponse.json(project);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { botProjectId, userId, ...rest } = body;

  if (!botProjectId || !userId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 }
    );
  }

  try {
    const project = await prisma.clientSecret.create({
      data: {
        botProjectId,
        userId,
        ...rest,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating client secret" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, botProjectId, ...rest } = body;

  if (!id || !botProjectId) {
    return NextResponse.json(
      { error: "ID and Project ID are required" },
      { status: 400 }
    );
  }

  try {
    const project = await prisma.clientSecret.update({
      where: { id },
      data: {
        botProjectId,
        ...rest,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating client secret" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const project = await prisma.clientSecret.delete({
      where: { id },
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting client secret" },
      { status: 500 }
    );
  }
}
