import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { listChildDirectoryNames, resolveStoragePath } from '@/lib/storagePath';

export async function POST(
  request: Request,
  { params }: { params: { tierId: string } },
) {
  const tierId = parseInt(params.tierId, 10);
  if (!Number.isFinite(tierId) || tierId < 1) {
    return NextResponse.json({ error: '无效的梯队 ID' }, { status: 400 });
  }

  const tier = await prisma.tier.findUnique({ where: { id: tierId }, select: { id: true } });
  if (!tier) {
    return NextResponse.json({ error: '梯队不存在' }, { status: 404 });
  }

  let body: { path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的 JSON 请求体' }, { status: 400 });
  }

  const rawPath = body.path;
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return NextResponse.json({ error: '请提供 path 字段（存储路径或 AFP 地址）' }, { status: 400 });
  }

  try {
    const resolved = resolveStoragePath(rawPath);
    const folders = await listChildDirectoryNames(resolved);
    return NextResponse.json({
      resolvedPath: resolved,
      folders,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '扫描失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
