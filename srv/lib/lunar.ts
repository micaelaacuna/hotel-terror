import { SearchMoonQuarter, NextMoonQuarter } from 'astronomy-engine';

const FULL_MOON = 2;

const pad2 = (n: number): string => String(n).padStart(2, '0');

const toISO = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

const toISOInput = (date: Date | string): string =>
  typeof date === 'string' ? date.slice(0, 10) : toISO(date);

const datesByYear = new Map<number, string[]>();

/** ISO `YYYY-MM-DD` full-moon dates (UTC) that fall in the given year, ascending. */
export function fullMoonDates(year: number): string[] {
  const cached = datesByYear.get(year);
  if (cached) return cached;

  const dates: string[] = [];
  let mq = SearchMoonQuarter(new Date(Date.UTC(year - 1, 11, 1)));
  for (;;) {
    const date = mq.time.date;
    const mqYear = date.getUTCFullYear();
    if (mqYear > year) break;
    if (mqYear === year && mq.quarter === FULL_MOON) dates.push(toISO(date));
    mq = NextMoonQuarter(mq);
  }

  datesByYear.set(year, dates);
  return dates;
}

/**
 * A night starting on date `D` counts as a full-moon night when `D` is one of the
 * computed full-moon dates. The brief models the window as `[D 12:00 UTC, D+1 12:00 UTC)`;
 * collapsing it to the calendar date reproduces the published UTC full-moon dates and the
 * seeded booking amounts, and is all the surcharge rule needs.
 */
export function isFullMoonNight(date: Date | string): boolean {
  const iso = toISOInput(date);
  const year = Number(iso.slice(0, 4));
  return fullMoonDates(year).includes(iso);
}

/** First full-moon date on or after `fromDate`, as a UTC-midnight Date. */
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
