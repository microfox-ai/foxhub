import { s3FileUploadSdk } from "@/utils/services/s3FileUploadSdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const userId = formData.get("userId")?.toString();
    const folderName =
      formData.get("folderName")?.toString() || "customBots/clientMessages";

    if (!userId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    let mediaPayload: {
      mediaName: string;
      mediaType: string;
      mediaFormat: string;
      mediaUrl: string;
    }[] = [];

    if (files.length > 0) {
      mediaPayload = await Promise.all(
        files.map(async (file) => {
          const uniqueName = `${Date.now()}-${file.name}`;
          const newFile = new File([file], uniqueName, { type: file.type });

          const s3Response = await s3FileUploadSdk.uploadFile({
            file: newFile,
            userId: userId,
            folder: folderName,
          });

          if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
            throw new Error("Failed to upload file");
          }

          const fileUrl = s3FileUploadSdk.getPublicFileUrl({
            userId: userId,
            file: newFile,
            folder: folderName,
          });

          return {
            mediaName: file.name,
            mediaType: file.type,
            mediaFormat: file.name.split(".").pop() || "file",
            mediaUrl: fileUrl,
          };
        })
      );
    }

    return NextResponse.json(
      { success: true, media: mediaPayload },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");
    const userId = searchParams.get("userId");
    const folderName =
      searchParams.get("folderName") || "customBots/clientMessages";

    if (!fileName || !userId) {
      return NextResponse.json(
        { error: "File name and user ID are required" },
        { status: 400 }
      );
    }

    const deleteResponse = await s3FileUploadSdk.deleteFile({
      fileName,
      userId,
      folder: folderName,
    });

    if (!deleteResponse || deleteResponse.$metadata.httpStatusCode !== 204) {
      throw new Error("Failed to delete file");
    }

    return NextResponse.json(
      { success: true, message: "File deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
