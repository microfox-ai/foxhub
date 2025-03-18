import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Client ID is required' },
      { status: 400 },
    );
  }

  try {
    const clientRequest = await prisma.clientRequest.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(clientRequest);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 },
    );
  }
}
