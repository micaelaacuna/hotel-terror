import { MS_PER_DAY } from './constants';

// snap an ISO date (or datetime) to UTC midnight and return it as a timestamp, so date math
// ignores any time part and never drifts with the local timezone.
export const atMidnightUTC = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

// how many whole nights sit between two ISO dates. Check-out is exclusive, so a same-day
// pair is zero and a reversed range comes back negative.
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((atMidnightUTC(checkOut) - atMidnightUTC(checkIn)) / MS_PER_DAY);
}

// how many days the calendar month of a 'YYYY-MM' period has. Day 0 of the next month is the
// last day of this one, so its date number is the day count (handles leap Februaries).
export function daysInMonth(period: string): number {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
