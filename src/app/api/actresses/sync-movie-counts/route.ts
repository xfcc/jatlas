import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { tasks } from '@/lib/tasks';

const prisma = new PrismaClient();

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
        // Simulate updating movie count
        const newVideoCount = Math.floor(Math.random() * 100);
        await prisma.actress.update({
          where: { id: actressId },
          data: { video_count: newVideoCount },
        });
        successful_count++;
      } catch (e) {
        console.error(`Failed to update movie count for actress ${actressId}`, e);
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
