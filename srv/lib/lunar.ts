import { SearchMoonQuarter, NextMoonQuarter } from 'astronomy-engine';
import { FULL_MOON_QUARTER } from './constants';

const pad2 = (n: number): string => String(n).padStart(2, '0');

const toISO = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

const toISOInput = (date: Date | string): string =>
  typeof date === 'string' ? date.slice(0, 10) : toISO(date);

const datesByYear = new Map<number, string[]>();

// walk the moon quarters and collect the full-moon dates (ISO YYYY-MM-DD, UTC) that land
// in the given year, ascending. Results are cached per year since the scan is not free.
export function fullMoonDates(year: number): string[] {
  const cached = datesByYear.get(year);
  if (cached) return cached;

  const dates: string[] = [];
  let mq = SearchMoonQuarter(new Date(Date.UTC(year - 1, 11, 1)));
  for (;;) {
    const date = mq.time.date;
    const mqYear = date.getUTCFullYear();
    if (mqYear > year) break;
    if (mqYear === year && mq.quarter === FULL_MOON_QUARTER) dates.push(toISO(date));
    mq = NextMoonQuarter(mq);
  }

  datesByYear.set(year, dates);
  return dates;
}

// a night counts as a full-moon night when its start date is a computed full-moon date
export function isFullMoonNight(date: Date | string): boolean {
  const iso = toISOInput(date);
  const year = Number(iso.slice(0, 4));
  return fullMoonDates(year).includes(iso);
}

// the first full-moon date on or after fromDate, as a UTC-midnight Date
export function nextFullMoon(fromDate: Date): Date {
  const fromISO = toISOInput(fromDate);
  const startYear = Number(fromISO.slice(0, 4));
  for (let year = startYear; year <= startYear + 1; year++) {
    for (const iso of fullMoonDates(year)) {
      if (iso >= fromISO) return new Date(`${iso}T00:00:00Z`);
    }
  }
  throw new Error(`no full moon found on or after ${fromISO}`);
}
