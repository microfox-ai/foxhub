import { prisma } from '@/prisma/prisma';
import { FUNCTIONTYPE, SECRETMODE } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Create ClientRequestFunction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originClientRequestId,
      name,
      baseUrl,
      mode,
      type,
      endpoints,
      schedules,
      metadata,
    } = body;

    if (!originClientRequestId || !name || !baseUrl || !type || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Get userId and botProjectId from ClientRequest
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: originClientRequestId },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: 'ClientRequest not found' },
        { status: 404 },
      );
    }

    const { userId, botProjectId } = clientRequest;

    // Create the ClientRequestFunction
    const clientFunction = await prisma.clientRequestFunction.create({
      data: {
        userId,
        botProjectId,
        originClientRequestId,
        name,
        baseUrl,
        mode: mode as SECRETMODE,
        type: type as FUNCTIONTYPE,
        endpoints,
        schedules,
        metadata,
      },
    });

    // Add notification in chat if needed
    await prisma.chatUIMessage.create({
      data: {
        originClientRequestId,
        userId,
        content: `A new ${type.toLowerCase()} function "${name}" has been deployed to ${mode} mode`,
        context: `server`,
        role: `assistant`,
        minionType: `other`,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(clientFunction, { status: 201 });
  } catch (error) {
    console.error('Error creating ClientRequestFunction:', error);
    return NextResponse.json(
      { error: 'Error creating ClientRequestFunction' },
      { status: 500 },
    );
  }
}

// Get ClientRequestFunction(s)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const mode = searchParams.get('mode');
    const name = searchParams.get('name');
    const userId = searchParams.get('userId');
    const botProjectId = searchParams.get('botProjectId');
    const clientRequestId = searchParams.get('clientRequestId');

    if (!id && !userId && !botProjectId && !clientRequestId && !name) {
      return NextResponse.json(
        {
          error:
            'Missing id, name, userId, botProjectId, or clientRequestId parameter',
        },
        { status: 400 },
      );
    }

    const clientFunctions = await prisma.clientRequestFunction.findMany({
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
    console.error('Error fetching ClientRequestFunction:', error);
    return NextResponse.json(
      { error: 'Error fetching ClientRequestFunction' },
      { status: 500 },
    );
  }
}

// Update ClientRequestFunction
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, type, mode, baseUrl, endpoints, schedules, metadata } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing function ID' },
        { status: 400 },
      );
    }

    const clientFunction = await prisma.clientRequestFunction.findUnique({
      where: { id },
    });

    if (!clientFunction) {
      return NextResponse.json(
        { error: 'Function not found' },
        { status: 404 },
      );
    }

    // Only update fields that are provided
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type as FUNCTIONTYPE;
    if (mode !== undefined) updateData.mode = mode as SECRETMODE;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (endpoints !== undefined) updateData.endpoints = endpoints;
    if (schedules !== undefined) updateData.schedules = schedules;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updatedFunction = await prisma.clientRequestFunction.update({
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
    console.error('Error updating ClientRequestFunction:', error);
    return NextResponse.json(
      { error: 'Error updating ClientRequestFunction' },
      { status: 500 },
    );
  }
}

// Delete ClientRequestFunction
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing function ID' },
        { status: 400 },
      );
    }

    const clientFunction = await prisma.clientRequestFunction.findUnique({
      where: { id },
    });

    if (!clientFunction) {
      return NextResponse.json(
        { error: 'Function not found' },
        { status: 404 },
      );
    }

    // Store data before deletion for notifications
    const { name, originClientRequestId, userId, mode } = clientFunction;

    // Delete the function
    await prisma.clientRequestFunction.delete({
      where: { id },
    });

    // Notify in chat about deletion
    await prisma.chatUIMessage.create({
      data: {
        originClientRequestId,
        userId,
        content: `Function "${name}" has been removed from ${mode} mode`,
        context: `server`,
        role: `assistant`,
        minionType: `other`,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'Function deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting ClientRequestFunction:', error);
    return NextResponse.json(
      { error: 'Error deleting ClientRequestFunction' },
      { status: 500 },
    );
  }
}
