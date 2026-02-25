import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tiers = await prisma.tier.findMany();
    return NextResponse.json(tiers);
  } catch (error) {
    console.error('Failed to fetch tiers:', error);
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[POST /api/tiers] Received body:', body);

    const { name, video_limit } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing required fields: name" }, { status: 400 });
    }

    // Robust data processing
    const processedLimit = (video_limit === null || video_limit === undefined || video_limit === '') 
      ? null 
      : Number(video_limit);

    if (processedLimit !== null && isNaN(processedLimit)) {
        return NextResponse.json({ error: "Invalid video_limit: must be a number." }, { status: 400 });
    }

    const dataToSave = {
      name,
      video_limit: processedLimit,
    };

    console.log('[POST /api/tiers] Data to save:', dataToSave);

    const newTier = await prisma.tier.create({
      data: dataToSave,
    });
    return NextResponse.json(newTier, { status: 201 });
  } catch (error) {
    console.error('Failed to create tier:', error);
    return NextResponse.json({ error: 'Failed to create tier' }, { status: 500 });
  }
}
