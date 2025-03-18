import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { updateClientRequest } from '@/utils/services/customBots/clientRequests/updateClientRequest';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientRequestId = searchParams.get('requestId');
    if (!clientRequestId)
      return NextResponse.json(
        { error: 'Missing clientRequestId' },
        { status: 400 },
      );

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: clientRequestId },
      include: { chatUIMessages: true },
    });
    if (!clientRequest)
      return NextResponse.json(
        { error: 'Client request not found' },
        { status: 404 },
      );

    // const updatedClientRequest = await updateClientRequest(clientRequest);

    return NextResponse.json(
      {
        chatUIMessages: clientRequest.chatUIMessages,
        requestStatus: clientRequest?.requestStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error updating client request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
