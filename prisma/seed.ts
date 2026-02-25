import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const tiersToSeed = [
    { name: 'Infinite', video_limit: null },
    { name: 'Premium', video_limit: 50 },
    { name: 'Impression', video_limit: 12 },
    { name: 'Honor', video_limit: null },
    { name: 'Fame', video_limit: 50 },
    { name: 'Classic', video_limit: 25 },
    { name: 'Archive', video_limit: 12 },
    { name: 'Opus', video_limit: 3 },
  ];

  for (const tierData of tiersToSeed) {
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
