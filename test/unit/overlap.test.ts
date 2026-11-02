import { describe, it, expect } from '@jest/globals';
import { overlaps } from '../../srv/lib/overlap';

describe('overlaps', () => {
  it('does not overlap when one stay ends the day the next begins', () => {
    expect(overlaps('2026-07-10', '2026-07-14', '2026-07-14', '2026-07-16')).toBe(false);
    expect(overlaps('2026-07-14', '2026-07-16', '2026-07-10', '2026-07-14')).toBe(false);
  });

  it('detects a partial overlap', () => {
    expect(overlaps('2026-07-10', '2026-07-14', '2026-07-12', '2026-07-16')).toBe(true);
  });

  it('detects full containment either way', () => {
    expect(overlaps('2026-07-10', '2026-07-20', '2026-07-12', '2026-07-15')).toBe(true);
    expect(overlaps('2026-07-12', '2026-07-15', '2026-07-10', '2026-07-20')).toBe(true);
  });

  it('does not overlap disjoint stays', () => {
    expect(overlaps('2026-07-10', '2026-07-14', '2026-07-20', '2026-07-24')).toBe(false);
  });

  it('detects a same-day single-night clash', () => {
    expect(overlaps('2026-07-10', '2026-07-11', '2026-07-10', '2026-07-11')).toBe(true);
  });
});
