import { prisma } from "@/prisma/prisma";
import { publishShard } from "@/utils/services/db_functions/publishShard";
import { SHARD_PAGE_STATUS } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET all shard pages
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const userId = request.nextUrl.searchParams.get("userId");
  const slug = request.nextUrl.searchParams.get("slug");
  const clientRequestId = request.nextUrl.searchParams.get("clientRequestId");
  const status = request.nextUrl.searchParams.get(
    "status"
  ) as SHARD_PAGE_STATUS;
  if (status && !(status === "PUBLISHED" || status === "UNPUBLISHED")) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const shardPages = await prisma.shardPage.findMany({
      where: {
        ...(id ? { id } : {}),
        ...(userId ? { creatorId: userId } : {}),
        ...(status && { status }),
        ...(clientRequestId ? { clientRequestId } : {}),
        ...(slug ? { slug } : {}),
      },
      include: {
        creator: true,
      },
    });

    return NextResponse.json(shardPages);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST create shard page
export async function POST(request: Request) {
  const { clientRequestId, ...body } = await request.json();
  const clientRequest = await prisma.clientRequest.findUnique({
    where: {
      id: clientRequestId,
    },
  });
  if (!clientRequest) {
    return NextResponse.json(
      { error: "Client request not found" },
      { status: 404 }
    );
  }
  const taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
    where: {
      originClientRequestId: clientRequest.id,
    },
  });
  if (!taskInstanceMeta) {
    return NextResponse.json(
      { error: "Task instance meta not found" },
      { status: 404 }
    );
  }

  const { shardPage, updated } = await publishShard(
    clientRequest,
    taskInstanceMeta,
    body
  );

  if (updated) {
    return NextResponse.json(shardPage);
  }

  return NextResponse.json(shardPage);
}

// PUT update shard page
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    let inShardPage = await prisma.shardPage.findUnique({
      where: {
        id,
      },
    });
    if (!inShardPage) {
      return NextResponse.json(
        { error: "Shard page not found" },
        { status: 404 }
      );
    }

    const clientRequest = await prisma.clientRequest.findUnique({
      where: {
        id: inShardPage.clientRequestId,
      },
    });
    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 }
      );
    }
    const taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
      where: {
        originClientRequestId: clientRequest.id,
      },
    });
    if (!taskInstanceMeta) {
      return NextResponse.json(
        { error: "Task instance meta not found" },
        { status: 404 }
      );
    }

    const { shardPage, updated } = await publishShard(
      clientRequest,
      taskInstanceMeta,
      {
        ...data,
      }
    );

    return NextResponse.json(shardPage);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE shard page
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.shardPage.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Shard page deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
