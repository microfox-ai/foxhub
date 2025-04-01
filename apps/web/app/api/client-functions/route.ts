import { prisma } from "@/prisma/prisma";
import { FUNCTIONTYPE, DEPLOY_STAGE } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Create ClientDeployment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originClientRequestId,
      name,
      baseUrl,
      stage,
      type,
      metadata,
      endpoints,
    } = body;

    if (!originClientRequestId || !name || !baseUrl || !type || !stage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get userId and botProjectId from ClientRequest
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: originClientRequestId },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "ClientRequest not found" },
        { status: 404 }
      );
    }

    const { userId, botProjectId } = clientRequest;

    // Create the ClientDeployment
    const clientFunction = await prisma.clientDeployment.upsert({
      where: { id: originClientRequestId },
      update: {
        id: originClientRequestId,
        userId,
        botProjectId,
        originClientRequestId,
        name,
        baseUrl,
        stage: stage as DEPLOY_STAGE,
        type: type as FUNCTIONTYPE,
        metadata,
        endpoints:
          typeof endpoints === "string" ? JSON.parse(endpoints) : endpoints,
      },
      create: {
        id: originClientRequestId,
        userId,
        botProjectId,
        originClientRequestId,
        name,
        baseUrl,
        stage: stage as DEPLOY_STAGE,
        type: type as FUNCTIONTYPE,
        metadata,
        endpoints:
          typeof endpoints === "string" ? JSON.parse(endpoints) : endpoints,
      },
    });

    // Add notification in chat if needed
    // TODO: VISHWAJEET - send not only a message, but also an email to the user.
    // await prisma.chatUIMessage.create({
    //   data: {
    //     originClientRequestId,
    //     userId,
    //     content: `A new ${type.toLowerCase()} function "${name}" has been deployed to ${mode} mode`,
    //     context: `server`,
    //     role: `assistant`,
    //     minionType: `other`,
    //     createdAt: new Date(),
    //   },
    // });

    return NextResponse.json(clientFunction, { status: 201 });
  } catch (error) {
    console.error("Error creating ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error creating ClientDeployment" },
      { status: 500 }
    );
  }
}

// Get ClientDeployment(s)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const mode = searchParams.get("mode");
    const name = searchParams.get("name");
    const userId = searchParams.get("userId");
    const botProjectId = searchParams.get("botProjectId");
    const clientRequestId = searchParams.get("clientRequestId");

    if (!id && !userId && !botProjectId && !clientRequestId && !name) {
      return NextResponse.json(
        {
          error:
            "Missing id, name, userId, botProjectId, or clientRequestId parameter",
        },
        { status: 400 }
      );
    }

    const clientFunctions = await prisma.clientDeployment.findMany({
      where: {
        ...(id && { id }),
        ...(name && { name }),
        ...(userId && { userId }),
        ...(botProjectId && { botProjectId }),
        ...(clientRequestId && { originClientRequestId: clientRequestId }),
      },
      include: {
        originClientRequest: true,
      },
    });

    return NextResponse.json({ clientFunctions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error fetching ClientDeployment" },
      { status: 500 }
    );
  }
}

// Update ClientDeployment
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, type, mode, baseUrl, endpoints, schedules, metadata } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing function ID" },
        { status: 400 }
      );
    }

    const clientFunction = await prisma.clientDeployment.findUnique({
      where: { id },
    });

    if (!clientFunction) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }

    // Only update fields that are provided
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type as FUNCTIONTYPE;
    if (mode !== undefined) updateData.mode = mode as DEPLOY_STAGE;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updatedFunction = await prisma.clientDeployment.update({
      where: { id },
      data: updateData,
    });

    // Notify in chat about the update
    if (Object.keys(updateData).length > 0) {
      await prisma.chatUIMessage.create({
        data: {
          originClientRequestId: clientFunction.originClientRequestId,
          userId: clientFunction.userId,
          content: `Function "${updatedFunction.name}" has been updated.`,
          context: `server`,
          role: `assistant`,
          minionType: `other`,
          createdAt: new Date(),
        },
      });
    }

    return NextResponse.json(updatedFunction, { status: 200 });
  } catch (error) {
    console.error("Error updating ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error updating ClientDeployment" },
      { status: 500 }
    );
  }
}

// Delete ClientDeployment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing function ID" },
        { status: 400 }
      );
    }

    const clientFunction = await prisma.clientDeployment.findUnique({
      where: { id },
    });

    if (!clientFunction) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }

    // Store data before deletion for notifications
    const { name, originClientRequestId, userId, stage } = clientFunction;

    // Delete the function
    await prisma.clientDeployment.delete({
      where: { id },
    });

    // Notify in chat about deletion
    // TODO: VISHWAJEET - no need to send a mesaage i think, but will have to take a look later
    // await prisma.chatUIMessage.create({
    //   data: {
    //     originClientRequestId,
    //     userId,
    //     content: `Function "${name}" has been removed from ${mode} mode`,
    //     context: `server`,
    //     role: `assistant`,
    //     minionType: `other`,
    //     createdAt: new Date(),
    //   },
    // });

    return NextResponse.json(
      { message: "Function deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error deleting ClientDeployment" },
      { status: 500 }
    );
  }
}
