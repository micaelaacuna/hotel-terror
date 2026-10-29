import { describe, it, expect } from '@jest/globals';
import { fullMoonDates, isFullMoonNight, nextFullMoon } from '../srv/lib/lunar';

const FULL_MOONS_2026 = [
  '2026-01-03', '2026-02-01', '2026-03-03', '2026-04-02', '2026-05-01',
  '2026-05-31', '2026-06-29', '2026-07-29', '2026-08-28', '2026-09-26',
  '2026-10-26', '2026-11-24', '2026-12-24',
];

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

describe('fullMoonDates', () => {
  it('reproduces the 13 published 2026 full moons', () => {
    expect(fullMoonDates(2026)).toEqual(FULL_MOONS_2026);
  });

  it('computes other years from the algorithm, not a hard-coded table', () => {
    const dates = fullMoonDates(2030);
    expect(dates.length).toBeGreaterThanOrEqual(12);
    expect(dates.every((d) => d.startsWith('2030-'))).toBe(true);
  });
});

describe('isFullMoonNight', () => {
  it('is true on a full-moon date', () => {
    expect(isFullMoonNight('2026-07-29')).toBe(true);
  });

  it('is false on the night before a full moon', () => {
    expect(isFullMoonNight('2026-07-28')).toBe(false);
  });

  it('accepts a Date and reads it in UTC', () => {
    expect(isFullMoonNight(new Date('2026-10-26T00:00:00Z'))).toBe(true);
  });
});

describe('nextFullMoon', () => {
  it('finds the next full moon after a plain date', () => {
    expect(isoDate(nextFullMoon(new Date('2026-10-01T00:00:00Z')))).toBe('2026-10-26');
  });

  it('returns the same date when asked on a full moon', () => {
    expect(isoDate(nextFullMoon(new Date('2026-10-26T00:00:00Z')))).toBe('2026-10-26');
  });

  it('rolls into the next year when none remain', () => {
    expect(isoDate(nextFullMoon(new Date('2026-12-25T00:00:00Z')))).toBe('2027-01-22');
  });
});
