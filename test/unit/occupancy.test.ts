import { describe, it, expect } from '@jest/globals';
import { computeOccupancy } from '../../srv/lib/occupancy';
import { daysInMonth } from '../../srv/lib/dates';

describe('computeOccupancy', () => {
  it('sums room-nights and rates them against the month capacity', () => {
    const result = computeOccupancy([4, 3, 5, 3], 14, 31, 55);
    expect(result.occupiedRoomNights).toBe(15);
    expect(result.availableRoomNights).toBe(434);
    expect(result.rate).toBe(3.46);
    expect(result.target).toBe(55);
  });

  it('returns a 0 rate when there are no rooms', () => {
    const result = computeOccupancy([4, 3], 0, 31, 50);
    expect(result.availableRoomNights).toBe(0);
    expect(result.rate).toBe(0);
  });

  it('returns a 0 rate and no occupancy when nothing is booked', () => {
    const result = computeOccupancy([], 10, 30, 60);
    expect(result.occupiedRoomNights).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.target).toBe(60);
  });

  it('passes a missing target through as 0', () => {
    expect(computeOccupancy([5], 10, 30, 0).target).toBe(0);
  });
});

describe('daysInMonth', () => {
  it('counts the days of a 31- and 30-day month', () => {
    expect(daysInMonth('2026-07')).toBe(31);
    expect(daysInMonth('2026-11')).toBe(30);
  });

  it('handles February in common and leap years', () => {
    expect(daysInMonth('2025-02')).toBe(28);
    expect(daysInMonth('2024-02')).toBe(29);
  });
});
