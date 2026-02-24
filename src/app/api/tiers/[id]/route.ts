import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tier = await prisma.tier.findUnique({
      where: { id: parseInt(params.id, 10) },
    });
    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }
    return NextResponse.json(tier);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tier' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, video_limit, status } = body;

    const processedLimit = (video_limit === null || video_limit === undefined || video_limit === '') 
      ? null 
      : Number(video_limit);

    if (processedLimit !== null && isNaN(processedLimit)) {
        return NextResponse.json({ error: "Invalid video_limit: must be a number." }, { status: 400 });
    }

    const updatedTier = await prisma.tier.update({
      where: { id: parseInt(params.id, 10) },
      data: {
        name,
        video_limit: processedLimit,
        status,
      },
    });
    return NextResponse.json(updatedTier);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.tier.delete({
      where: { id: parseInt(params.id, 10) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
  }
}
