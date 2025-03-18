import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { REQUESTSTATUS } from '@prisma/client';
import { updateClientRequest } from '@/utils/services/customBots/clientRequests/updateClientRequest';

export async function POST() {
  try {
    const clientRequests = await prisma.clientRequest.findMany({
      where: {
        requestStatus: { notIn: [REQUESTSTATUS.CLOSED, REQUESTSTATUS.COMPLETED] },
      },
      include: { requestUpdates: true },
    });

    // use promise.all to update all client requests in parallel
    await Promise.all(
      clientRequests.map(async (clientRequest) => {
        await updateClientRequest(clientRequest);
      }),
    );

    return NextResponse.json(
      { message: 'All Requests updated' },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
