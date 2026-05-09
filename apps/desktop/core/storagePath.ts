import fs from 'fs/promises';
import path from 'path';
import { normalizeComparableName } from './textNormalize';

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

export function resolveStoragePath(input: string): string {
  const trimmed = stripQuotes(input);
  if (!trimmed) {
    throw new Error('路径不能为空');
  }

  if (trimmed.startsWith('smb://')) {
    let u: URL;
    try {
      u = new URL(trimmed);
    } catch {
      throw new Error('无效的 SMB 地址格式');
    }
    const host = u.hostname;
    const segments = u.pathname.split('/').filter(Boolean);
    if (!host || segments.length === 0) {
      throw new Error('SMB 地址缺少主机或共享名');
    }
    if (process.platform === 'win32') {
      return path.win32.join('\\\\', host, ...segments);
    }
    return path.join('/Volumes', host, ...segments);
  }

  if (trimmed.startsWith('afp://')) {
    let u: URL;
    try {
      u = new URL(trimmed);
    } catch {
      throw new Error('无效的 AFP 地址格式');
    }
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      throw new Error('AFP 地址缺少共享名与路径');
    }
    const [share, ...rest] = segments;
    return path.join('/Volumes', share, ...rest);
  }

  if (process.platform === 'win32') {
    return path.win32.normalize(trimmed.replace(/\//g, '\\'));
  }
  return path.normalize(trimmed);
}

export async function listChildDirectoryNames(resolvedPath: string): Promise<string[]> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(resolvedPath);
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
    if (code === 'ENOENT') {
      throw new Error('路径不存在，请确认 NAS 已挂载且路径正确');
    }
    if (code === 'EACCES') {
      throw new Error('无权限读取该路径');
    }
    throw new Error(e instanceof Error ? e.message : '无法访问路径');
  }

  if (!stat.isDirectory()) {
    throw new Error('该路径不是文件夹');
  }

  const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
  const names = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => normalizeComparableName(e.name));

  names.sort((a, b) => a.localeCompare(b, 'ja'));
  return names;
}
