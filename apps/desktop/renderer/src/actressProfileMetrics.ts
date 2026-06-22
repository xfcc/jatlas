type ParsedProfileDate = {
  year: number;
  month: number | null;
  day: number | null;
};

export function parseProfileYear(value: string): number | null {
  const match = /(\d{4})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

function parseProfileDate(value: string): ParsedProfileDate | null {
  const normalized = value.trim();
  const year = parseProfileYear(normalized);
  if (year === null) return null;

  const monthDayMatch = /(?:\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/.exec(normalized);
  if (!monthDayMatch) {
    return { year, month: null, day: null };
  }

  const month = Number(monthDayMatch[1]);
  const day = monthDayMatch[2] === undefined ? null : Number(monthDayMatch[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { year, month: null, day: null };
  }
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
    return { year, month: null, day: null };
  }
  return { year, month, day };
}

export function formatActressAge(birthday: string, now = new Date()): string {
  const parsed = parseProfileDate(birthday);
  if (!parsed) return '-';
  let age = now.getFullYear() - parsed.year;
  if (parsed.month !== null && parsed.day !== null) {
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    if (currentMonth < parsed.month || (currentMonth === parsed.month && currentDay < parsed.day)) {
      age -= 1;
    }
  }
  return age >= 0 ? `${age}岁` : '-';
}

export function formatActressCareerDuration(careerFrom: string, now = new Date()): string {
  const year = parseProfileYear(careerFrom);
  if (year === null) return '-';
  const duration = now.getFullYear() - year;
  return duration >= 0 ? `${duration}年` : '-';
}
