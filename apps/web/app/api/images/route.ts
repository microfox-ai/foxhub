import { s3FileUploadSdk } from "@/utils/services/s3FileUploadSdk";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: "File and userId are required" },
        { status: 400 }
      );
    }

    const fileInfoWithFileBuffer = {
      fileName: file.name,
      fileType: file.type,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    };

    const s3Response = await s3FileUploadSdk.uploadFile({
      fileInfoWithFileBuffer,
      userId,
      folder: "user-images",
    });

    if (!s3Response) {
      return NextResponse.json(
        { error: "Failed to upload file to S3" },
        { status: 500 }
      );
    }

    const fileUrl = s3FileUploadSdk.getPublicFileUrl({
      userId,
      file: { fileName: file.name },
      folder: "user-images",
    });

    const newImage = await prisma.userImageSourcemap.create({
      data: {
        userId,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
      },
    });

    return NextResponse.json(newImage, { status: 201 });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const images = await prisma.userImageSourcemap.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
    }

    const image = await prisma.userImageSourcemap.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from S3
    await s3FileUploadSdk.deleteFile({
      userId: image.userId,
      fileName: image.fileName,
      folder: "user-images",
    });

    // Delete from database
    await prisma.userImageSourcemap.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 