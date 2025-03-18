import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const configs = await prisma.configData.findUnique({
      where: { configId: 'customBotsConfigKeys' },
    });

    if (!configs) {
      return new NextResponse(
        JSON.stringify({ error: 'Configurations not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new NextResponse(JSON.stringify(configs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error retrieving configurations:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
