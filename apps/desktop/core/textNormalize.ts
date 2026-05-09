export function normalizeComparableName(value: string): string {
  return value.trim().normalize('NFC');
}
