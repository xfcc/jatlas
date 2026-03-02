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

  const tiers = await prisma.tier.findMany();
  const tierIds = tiers.map((tier) => tier.id);

  if (tierIds.length > 0) {
    const actressesToSeed = [
        { name: '楪カレン', video_count: 302 },
        { name: '鷲尾芽衣', video_count: 259 },
        { name: '明里つむぎ', video_count: 350 },
        { name: '藤森里穂', video_count: 272 },
        { name: '弥生みづき', video_count: 255 },
    ];

    for (const actressData of actressesToSeed) {
        const randomTierId = tierIds[Math.floor(Math.random() * tierIds.length)];
        const actress = await prisma.actress.upsert({
            where: { name: actressData.name },
            update: {
                video_count: actressData.video_count,
            },
            create: {
                name: actressData.name,
                video_count: actressData.video_count,
                tierId: randomTierId,
            },
        });
        console.log(`Created or updated actress: ${actress.name} with id: ${actress.id}`);
    }
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
