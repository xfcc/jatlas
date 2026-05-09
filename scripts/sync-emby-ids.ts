import prisma from '../src/lib/db';
import { fetchEmbyIdsByName } from '../src/lib/emby';
import { updateActressCore } from '../src/core/services/actressService';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function main() {
  console.log('开始同步女优 Emby ID...');

  const actresses = await prisma.actress.findMany();
  const actressesWithoutEmbyId = actresses.filter((actress) => {
    const raw = actress.emby_id;
    if (typeof raw !== 'string' || raw.trim() === '' || raw === '[]') {
      return true;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      return !Array.isArray(parsed) || parsed.length === 0;
    } catch {
      return true;
    }
  });

  console.log(`发现 ${actressesWithoutEmbyId.length} 名未绑定 Emby ID 的女优。`);

  for (const actress of actressesWithoutEmbyId) {
    console.log(`正在为 ${actress.name} 搜索 Emby ID...`);
    try {
      const embyIds = await fetchEmbyIdsByName(actress.name);
      if (embyIds.length > 0) {
        console.log(`为 ${actress.name} 找到 ${embyIds.length} 个 Emby ID: ${embyIds.join(', ')}`);
        await updateActressCore({ id: actress.id, emby_id: embyIds });
        console.log(`已成功为 ${actress.name} 更新 Emby ID。`);
      } else {
        console.log(`未能在 Emby 中找到 ${actress.name}。`);
      }
    } catch (error) {
      console.error(`为 ${actress.name} 同步 Emby ID 时出错:`, error);
    }
  }

  console.log('Emby ID 同步完成。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
