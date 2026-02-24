import { PrismaClient, Status } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const activeTiers = [
    { name: 'Infinite', video_limit: null, status: Status.Active },
    { name: 'Premium', video_limit: 50, status: Status.Active },
    { name: 'Impression', video_limit: 12, status: Status.Active },
  ];

  const retiredTiers = [
    { name: 'Honor', video_limit: null, status: Status.Retired },
    { name: 'Fame', video_limit: 50, status: Status.Retired },
    { name: 'Classic', video_limit: 25, status: Status.Retired },
    { name: 'Archive', video_limit: 12, status: Status.Retired },
    { name: 'Opus', video_limit: 3, status: Status.Retired },
  ];

  for (const tierData of [...activeTiers, ...retiredTiers]) {
    const tier = await prisma.tier.upsert({
      where: { name: tierData.name },
      update: {},
      create: tierData,
    });
    console.log(`Created or found tier: ${tier.name} with id: ${tier.id}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
