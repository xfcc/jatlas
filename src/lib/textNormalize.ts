/**
 * Trim + Unicode NFC so macOS NFD filenames match DB / IME NFC strings (e.g. つばき).
 */
export function normalizeComparableName(value: string): string {
  return value.trim().normalize('NFC');
}
