import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, avatar, code, source } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    let validAccessCode = null;

    if (code && source) {
      validAccessCode = await prisma.accessCode.findUnique({
        where: {
          code: code,
          isActive: true,
        },
      });
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
          source: source ? source : "unknown",
          isBetaAccess: validAccessCode ? true : false,
          accessCodeId: validAccessCode ? validAccessCode.id : null,
        },
      });
    } else if (validAccessCode) {
      user = await prisma.user.update({
        where: { email },
        data: { isBetaAccess: true, accessCodeId: validAccessCode.id },
      });
    }

    if (validAccessCode) {
      await prisma.accessCode.update({
        where: { id: validAccessCode.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error managing user:", error);
    return NextResponse.json(
      { error: "Failed to manage user" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, email, ...rest } = body;

    if (!id && !email) {
      return NextResponse.json(
        { error: "User ID or email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { ...(id && { id: id as string }), ...(email && { email }) },
      data: rest,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
