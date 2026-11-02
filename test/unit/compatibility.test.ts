import { describe, it, expect } from '@jest/globals';
import { sunCompatibility, temperatureOk } from '../../srv/lib/compatibility';
import { nightsBetween } from '../../srv/lib/dates';

describe('sunCompatibility', () => {
  it('clears a sun-tolerant guest in any room', () => {
    expect(sunCompatibility(true, 'none')).toBe('ok');
    expect(sunCompatibility(true, 'partial')).toBe('ok');
    expect(sunCompatibility(true, 'full')).toBe('ok');
  });

  it('rejects a sun-intolerant guest only in full sun', () => {
    expect(sunCompatibility(false, 'full')).toBe('reject');
  });

  it('warns a sun-intolerant guest in partial daylight', () => {
    expect(sunCompatibility(false, 'partial')).toBe('warn');
  });

  it('clears a sun-intolerant guest in a dark room', () => {
    expect(sunCompatibility(false, 'none')).toBe('ok');
  });
});

describe('temperatureOk', () => {
  it('allows any temperature when the species has no limit', () => {
    expect(temperatureOk(30, null)).toBe(true);
    expect(temperatureOk(30, undefined)).toBe(true);
  });

  it('allows a room at or below the limit', () => {
    expect(temperatureOk(0, 0)).toBe(true);
    expect(temperatureOk(-5, 0)).toBe(true);
  });

  it('rejects a room above the limit', () => {
    expect(temperatureOk(1, 0)).toBe(false);
    expect(temperatureOk(16, 0)).toBe(false);
  });
});

describe('nightsBetween', () => {
  it('counts whole nights between two ISO dates', () => {
    expect(nightsBetween('2026-07-10', '2026-07-14')).toBe(4);
    expect(nightsBetween('2026-07-10', '2026-07-11')).toBe(1);
  });

  it('returns zero for equal dates and negative for a reversed range', () => {
    expect(nightsBetween('2026-07-10', '2026-07-10')).toBe(0);
    expect(nightsBetween('2026-07-14', '2026-07-10')).toBe(-4);
  });
});
