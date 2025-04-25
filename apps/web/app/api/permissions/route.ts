import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: "Project ID and User ID are required" },
        { status: 400 }
      );
    }

    // Check if user has access to this project
    const userPermission = await prisma.projectPermission.findFirst({
      where: {
        botProjectId: projectId,
        userId: userId,
      },
    });

    if (!userPermission) {
      return NextResponse.json(
        { error: "You don't have access to this project" },
        { status: 403 }
      );
    }

    const permissions = await prisma.projectPermission.findMany({
      where: {
        botProjectId: projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, email, role, userId } = body;

    if (!projectId || !email || !role || !userId) {
      return NextResponse.json(
        { error: "Project ID, email, role and user ID are required" },
        { status: 400 }
      );
    }

    // Check if user has admin access to this project
    const userPermission = await prisma.projectPermission.findFirst({
      where: {
        botProjectId: projectId,
        userId: userId,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    if (!userPermission) {
      return NextResponse.json(
        { error: "You don't have permission to manage project members" },
        { status: 403 }
      );
    }

    // Find the user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    console.log("Target User:", targetUser);

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. They need to sign up first." },
        { status: 404 }
      );
    }

    // Check if permission already exists
    const existingPermission = await prisma.projectPermission.findUnique({
      where: {
        botProjectId_userId: {
          botProjectId: projectId,
          userId: targetUser.id,
        },
      },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: "User already has access to this project" },
        { status: 400 }
      );
    }

    const newPermission = await prisma.projectPermission.create({
      data: {
        botProjectId: projectId,
        userId: targetUser.id,
        role: role,
        accessType: role === "VIEWER" ? "READ" : "WRITE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(newPermission);
  } catch (error) {
    console.error("Error creating permission:", error);
    return NextResponse.json(
      { error: "Failed to create permission" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const targetUserId = searchParams.get("targetUserId");
    const userId = searchParams.get("userId");

    if (!projectId || !targetUserId || !userId) {
      return NextResponse.json(
        { error: "Project ID, target user ID and user ID are required" },
        { status: 400 }
      );
    }

    // Check if user has admin access to this project
    const userPermission = await prisma.projectPermission.findFirst({
      where: {
        botProjectId: projectId,
        userId: userId,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    if (!userPermission) {
      return NextResponse.json(
        { error: "You don't have permission to manage project members" },
        { status: 403 }
      );
    }

    // Prevent removing the owner
    const targetPermission = await prisma.projectPermission.findUnique({
      where: {
        botProjectId_userId: {
          botProjectId: projectId,
          userId: targetUserId,
        },
      },
    });

    if (targetPermission?.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    await prisma.projectPermission.delete({
      where: {
        botProjectId_userId: {
          botProjectId: projectId,
          userId: targetUserId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { error: "Failed to delete permission" },
      { status: 500 }
    );
  }
}
