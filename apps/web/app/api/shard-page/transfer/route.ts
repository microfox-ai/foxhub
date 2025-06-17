import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, slug, email, clientRequestId, ...updateData } = body;

    if (!slug || !email) {
      return NextResponse.json(
        { error: "Shard ID and creator email are required" },
        { status: 400 }
      );
    }

    // Find the user by email
    const creator = await prisma.user.findUnique({
      where: { email },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found with the provided email" },
        { status: 404 }
      );
    }

    // Check if shard exists
    const existingShard = await prisma.shardPage.findUnique({
      where: { slug },
    });

    if (existingShard) {
      // Update existing shard
      const updatedShard = await prisma.shardPage.update({
        where: { slug },
        data: {
          ...updateData,
          ...(clientRequestId && { clientRequestId }),
          creatorId: creator.id,
        },
      });

      return NextResponse.json(updatedShard);
    } else {
      // Create new shard
      const newShard = await prisma.shardPage.create({
        data: {
          slug,
          creatorId: creator.id,
          taskInstanceMeta: updateData.taskInstanceMeta || {},
          clientRequestMeta: updateData.clientRequestMeta || {},
          repoDir: updateData.repoDir || "",
          title: updateData.title || "",
          description: updateData.description || "",
          miniDescription: updateData.miniDescription || "",
          video_url: updateData.video_url || "",
          thumbnail_url: updateData.thumbnail_url || "",
          banner_url: updateData.banner_url || "",
          version: updateData.version || "1.0.0",
          versionNumber: updateData.versionNumber || "1",
          category: updateData.category || [],
          status: updateData.status || "UNPUBLISHED",
          ...(clientRequestId && { clientRequestId }),
        },
      });

      return NextResponse.json(newShard);
    }
  } catch (error) {
    console.error("Error managing shard:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { slug, clientRequestId } = body;

    if (!slug || !clientRequestId) {
      return NextResponse.json(
        { error: "Shard ID and clientRequestId are required" },
        { status: 400 }
      );
    }

    // Check if shard exists
    const existingShard = await prisma.shardPage.findUnique({
      where: { slug },
    });

    if (!existingShard) {
      return NextResponse.json({ error: "Shard not found" }, { status: 404 });
    }

    // Update the clientRequestId
    const updatedShard = await prisma.shardPage.update({
      where: { slug },
      data: {
        clientRequestId,
      },
    });

    return NextResponse.json(updatedShard);
  } catch (error) {
    console.error("Error updating shard clientRequestId:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
