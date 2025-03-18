import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientRequestId = searchParams.get('clientRequestId');
    const mode = searchParams.get('mode');

    if (!clientRequestId || !mode) {
      return NextResponse.json(
        { error: 'Missing clientRequestId or mode parameter' },
        { status: 400 },
      );
    }

    // Get the client request
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: clientRequestId },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: 'Client request not found' },
        { status: 404 },
      );
    }

    // Get all mentioned client bots
    const clientSecrets = await Promise.all(
      clientRequest.mentionedClientSecretIds.map((id) =>
        prisma.clientSecret.findUnique({ where: { id } }),
      ),
    );

    // Filter out null values and extract variables with matching mode
    const variables = clientSecrets
      .filter((bot) => bot !== null)
      .flatMap((bot) => {
        return (bot?.variables as any[])
          .filter((variable) => {
            return (
              variable.mode &&
              Array.isArray(variable.mode) &&
              variable.mode.includes(mode)
            );
          })
          .map((variable) => ({
            key: variable.key,
            value: variable.value,
            isOptional: variable.isOptional,
          }));
      });

    return NextResponse.json({ variables }, { status: 200 });
  } catch (error) {
    console.error('Error fetching variables:', error);
    return NextResponse.json(
      { error: 'Error fetching variables' },
      { status: 500 },
    );
  }
}
