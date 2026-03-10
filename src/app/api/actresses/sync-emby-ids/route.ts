import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory store for task progress
import { tasks } from '@/lib/tasks';

export async function POST(request: Request) {
  const { actressIds } = await request.json();

  if (!actressIds || !Array.isArray(actressIds)) {
    return NextResponse.json({ error: 'Invalid actressIds' }, { status: 400 });
  }

  const taskId = Math.random().toString(36).substr(2, 9);
  tasks.set(taskId, { progress: 0, total: actressIds.length, status: 'processing' });

  // Fire-and-forget background task
  (async () => {
    let successful_count = 0;
    for (let i = 0; i < actressIds.length; i++) {
      const actressId = parseInt(actressIds[i], 10);
      
      try {
        const actress = await prisma.actress.findUnique({
          where: { id: actressId },
        });

        if (actress && (!actress.emby_id || actress.emby_id.length === 0)) {
          const fakeEmbyId = `emby-${Math.random().toString(36).substr(2, 9)}`;
          const updatedEmbyIds = actress.emby_id ? [...actress.emby_id, fakeEmbyId] : [fakeEmbyId];

          await prisma.actress.update({
            where: { id: actressId },
            data: { emby_id: updatedEmbyIds },
          });
          successful_count++;
        }
      } catch (e) {
        console.error(`Failed to process actress ${actressId}`, e);
      }
      
      tasks.set(taskId, { 
          progress: i + 1, 
          total: actressIds.length, 
          status: `processing (${successful_count} successful)` 
      });
    }
    tasks.set(taskId, { 
        progress: actressIds.length, 
        total: actressIds.length, 
        status: `completed (${successful_count} successful)` 
    });
  })();

  return NextResponse.json({ taskId });
}
