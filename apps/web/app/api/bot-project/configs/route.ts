import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { JsonObject } from '@prisma/client/runtime/library';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 },
      );
    }

    const project = await prisma.botProject.findUnique({
      where: { id },
      select: {
        previewConfigs: true,
        stagingConfigs: true,
        prodConfigs: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Project configuration fetched successfully',
      previewConfigs: project?.previewConfigs,
      stagingConfigs: project?.stagingConfigs,
      prodConfigs: project?.prodConfigs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

interface PutRequestBody {
  id: string;
  configs: JsonObject;
  type: 'preview' | 'staging' | 'prod';
}

export async function PUT(req: Request) {
  try {
    const { id, configs, type }: PutRequestBody = await req.json();
    const existingProject = await prisma.botProject.findUnique({
      where: { id },
      select: {
        previewConfigs: true,
        stagingConfigs: true,
        prodConfigs: true,
      },
    });

    if (!['preview', 'staging', 'prod'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid environment type' },
        { status: 400 },
      );
    }

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedConfiguration = {
      ...((type === 'prod'
        ? existingProject?.prodConfigs
        : type === 'preview'
          ? existingProject?.previewConfigs
          : existingProject?.stagingConfigs) as JsonObject),
      ...configs,
    };

    const updatedProject = await prisma.botProject.update({
      where: { id },
      data: {
        ...(type === 'prod'
          ? { prodConfigs: updatedConfiguration }
          : type === 'preview'
            ? { previewConfigs: updatedConfiguration }
            : { stagingConfigs: updatedConfiguration }),
      },
    });
    
    return NextResponse.json({
      message: 'Configuration updated successfully',
      updatedProject,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

interface DeleteRequestBody {
  id: string;
  keysToDelete: string[];
  type: 'preview' | 'staging' | 'prod';
}

export async function DELETE(req: Request) {
  try {
    const { id, keysToDelete, type }: DeleteRequestBody = await req.json();

    if (!keysToDelete.length) {
      return NextResponse.json(
        { error: 'Missing keys to delete' },
        { status: 400 },
      );
    }

    if (!['preview', 'staging', 'prod'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid environment type' },
        { status: 400 },
      );
    }

    const existingProject = await prisma.botProject.findUnique({
      where: { id },
      select: {
        previewConfigs: true,
        stagingConfigs: true,
        prodConfigs: true,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedConfiguration = {
      ...((type === 'prod'
        ? existingProject?.prodConfigs
        : type === 'preview'
          ? existingProject?.previewConfigs
          : existingProject?.stagingConfigs) as JsonObject),
    };

    keysToDelete.forEach((key: string) => delete updatedConfiguration[key]);

    const updatedProject = await prisma.botProject.update({
      where: { id },
      data: {
        ...(type === 'prod'
          ? { prodConfigs: updatedConfiguration }
          : type === 'preview'
            ? { previewConfigs: updatedConfiguration }
            : { stagingConfigs: updatedConfiguration }),
      },
    });
    return NextResponse.json({
      message: 'Configuration deleted successfully',
      updatedProject,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
