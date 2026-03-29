import { NextResponse } from 'next/server';
import { tasks } from '@/lib/tasks';

export async function GET(_request: Request, { params }: { params: { taskId: string } }) {
  const task = tasks.get(params.taskId);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(task);
}
