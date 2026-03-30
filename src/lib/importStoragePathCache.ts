const LS_KEY = 'jatlas:import-actress-storage-paths';

function getLocalStorage(): Storage | null {
  if (typeof globalThis === 'undefined') return null;
  try {
    return (globalThis as unknown as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function readMap(): Record<string, string> {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(LS_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as unknown;
    return map && typeof map === 'object' && !Array.isArray(map)
      ? (map as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>): void {
  const ls = getLocalStorage();
  if (!ls) return;
  ls.setItem(LS_KEY, JSON.stringify(map));
}

/** 读取本梯队上次保存的存储路径（仅当前浏览器）。 */
export function getImportStoragePathForTier(tierId: number): string | null {
  const v = readMap()[String(tierId)];
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

/**
 * 写入本梯队的存储路径；传空字符串则清除该梯队记录。
 * 按梯队分别保存，只保留各自最后一次非空路径。
 */
export function setImportStoragePathForTier(tierId: number, path: string): void {
  const trimmed = path.trim();
  const map = readMap();
  const id = String(tierId);
  if (!trimmed) {
    delete map[id];
  } else {
    map[id] = trimmed;
  }
  writeMap(map);
}
