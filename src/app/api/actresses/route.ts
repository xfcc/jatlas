import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as Status | null;
  const tierId = searchParams.get("tierId");
  const sortBy = searchParams.get("sortBy") || 'updated_at';
  const order = searchParams.get("order") || 'desc';

  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (tierId) {
    where.tierId = parseInt(tierId, 10);
  }

  let orderBy: any;
  if (sortBy === 'tier') {
    orderBy = { tier: { name: order } };
  } else {
    orderBy = { [sortBy]: order };
  }

  const actresses = await prisma.actress.findMany({
    where,
    orderBy,
  });

  return NextResponse.json(actresses);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, status, tierId, video_count, external_id } = body;

  if (!name || !status || !tierId || video_count === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const newActress = await prisma.actress.create({
      data: {
        name,
        status,
        tierId,
        video_count,
        external_id,
      },
    });
    return NextResponse.json(newActress, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create actress" }, { status: 500 });
  }
}
