import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { accessCode } = await request.json();

    if (!accessCode) {
      return NextResponse.json(
        { message: "Access code is required" },
        { status: 400 }
      );
    }

    // Here you would validate the access code against your database or external service
    // For now, we'll use a simple example where we check if the code exists in the database
    const validAccessCode = await prisma.accessCode.findUnique({
      where: {
        code: accessCode,
        isActive: true,
      },
    });

    if (!validAccessCode) {
      return NextResponse.json(
        { message: "Invalid access code" },
        { status: 400 }
      );
    }

    // Update user to grant access
    await prisma.user.update({
      where: { email: validAccessCode.email! },
      data: {
        isBetaAccess: true,
        accessCodeId: validAccessCode.id,
      },
    });

    // Optionally, mark the access code as used
    await prisma.accessCode.update({
      where: { id: validAccessCode.id },
      data: {
        isActive: false,
        usedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Access granted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying access code:", error);
    return NextResponse.json(
      { message: "Failed to verify access code" },
      { status: 500 }
    );
  }
}
