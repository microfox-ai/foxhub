import { prisma } from "@/prisma/prisma";
import { updateSession } from "@/utils/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const redirects = await prisma.subdomainRedirect.findMany();
  return NextResponse.json({ redirects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    subdomain,
    rewritePath,
    rewriteType,
    hostedOn,
    description,
    enabled,
  } = body;

  const newRedirect = await prisma.subdomainRedirect.create({
    data: {
      subdomain,
      rewritePath,
      rewriteType,
      hostedOn,
      description,
      enabled,
    },
  });

  return NextResponse.json(newRedirect, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const body = await request.json();
  const {
    subdomain,
    rewritePath,
    rewriteType,
    hostedOn,
    description,
    enabled,
  } = body;

  const updatedRedirect = await prisma.subdomainRedirect.update({
    where: { id },
    data: {
      subdomain,
      rewritePath,
      rewriteType,
      hostedOn,
      description,
      enabled,
    },
  });

  return NextResponse.json(updatedRedirect);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.subdomainRedirect.delete({
    where: { id },
  });

  return NextResponse.json(
    { message: "Redirect deleted successfully" },
    { status: 200 }
  );
}
