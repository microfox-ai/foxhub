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
    let botProjects = await prisma.botProject.findMany({
      where: { userId },
      include: { clientRequests: true },
    });

    const filteredBotProjects = botProjects.map((project) => {
      const { prodConfigs, previewConfigs, stagingConfigs, metadata, ...rest } =
        project;
      const filteredClientRequests = rest.clientRequests.map((request) => {
        const { metadata, ...rest } = request;
        return rest;
      });
      return { ...rest, clientRequests: filteredClientRequests };
    });

    return NextResponse.json(filteredBotProjects);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 },
    );
  }
}
