import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status, Tier } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  const actress = await prisma.actress.findUnique({
    where: { id },
  });
  if (actress) {
    return NextResponse.json(actress);
  } else {
    return NextResponse.json({ error: "Actress not found" }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  const body = await request.json();
  const { name, status, tierId, video_count, external_id } = body;

  try {
    const updatedActress = await prisma.actress.update({
      where: { id },
      data: { name, status, tierId, video_count, external_id },
    });
    return NextResponse.json(updatedActress);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update actress" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  try {
    await prisma.actress.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete actress" }, { status: 500 });
  }
}
