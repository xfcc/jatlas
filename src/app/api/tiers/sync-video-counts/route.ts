import { NextResponse } from 'next/server';
import { tasks } from '@/lib/tasks';
import { runTierVideoCountSyncTask } from '@/lib/tierVideoCountSyncWorker';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tierId = typeof body?.tierId === 'number' ? body.tierId : parseInt(String(body?.tierId), 10);

  if (!Number.isFinite(tierId) || tierId < 1) {
    return NextResponse.json({ error: 'Invalid tierId' }, { status: 400 });
  }

  const taskId = Math.random().toString(36).substring(2, 11);
  tasks.set(taskId, { progress: 0, total: 0, status: 'starting' });

  void runTierVideoCountSyncTask(taskId, tierId);

  return NextResponse.json({ taskId });
}
