import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status, Tier } from "@prisma/client";

const activeTiers = [Tier.Infinite, Tier.Premium, Tier.Impression];
const retiredTiers = [Tier.Honor, Tier.Fame, Tier.Classic, Tier.Archive, Tier.Opus];

function isValidTierForStatus(status: Status, tier: Tier): boolean {
  if (status === Status.Active) {
    return activeTiers.includes(tier);
  }
  if (status === Status.Retired) {
    return retiredTiers.includes(tier);
  }
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as Status | null;
  const tier = searchParams.get("tier") as Tier | null;
  const sortBy = searchParams.get("sortBy") || 'updated_at';
  const order = searchParams.get("order") || 'desc';

  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (tier) {
    where.tier = tier;
  }

  const actresses = await prisma.actress.findMany({
    where,
    orderBy: {
      [sortBy]: order,
    },
  });

  return NextResponse.json(actresses);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, status, tier, video_count, external_id } = body;

  if (!name || !status || !tier || video_count === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidTierForStatus(status, tier)) {
    return NextResponse.json({ error: "Invalid tier for the given status" }, { status: 400 });
  }

  try {
    const newActress = await prisma.actress.create({
      data: {
        name,
        status,
        tier,
        video_count,
        external_id,
      },
    });
    return NextResponse.json(newActress, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create actress" }, { status: 500 });
  }
}
