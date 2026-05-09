export function normalizeEmbyIdList(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

export function toEmbyIdJson(ids: string[] | undefined): string {
  return JSON.stringify(normalizeEmbyIdList(ids ?? []));
}
