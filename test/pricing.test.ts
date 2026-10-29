import { describe, it, expect } from '@jest/globals';
import { priceBooking } from '../srv/lib/pricing';

describe('priceBooking', () => {
  it('charges the full-moon surcharge for a sensitive species', () => {
    const result = priceBooking({
      checkIn: '2026-07-28',
      checkOut: '2026-07-31',
      nightlyRate: 100,
      fullMoonSensitive: true,
      riskLevel: 4,
    });
    expect(result).toEqual({
      period: '2026-07',
      nights: 3,
      fullMoonNights: 1,
      roomAmount: 300,
      surchargeAmount: 35,
      depositAmount: 200,
      totalAmount: 335,
    });
  });

  it('skips the surcharge for a non-sensitive species even on a full moon', () => {
    const result = priceBooking({
      checkIn: '2026-12-20',
      checkOut: '2026-12-26',
      nightlyRate: 140,
      fullMoonSensitive: false,
      riskLevel: 3,
    });
    expect(result.fullMoonNights).toBe(1);
    expect(result.surchargeAmount).toBe(0);
    expect(result.nights).toBe(6);
    expect(result.depositAmount).toBe(150);
    expect(result.totalAmount).toBe(840);
  });

  it('has no surcharge when the stay misses every full moon', () => {
    const result = priceBooking({
      checkIn: '2026-07-10',
      checkOut: '2026-07-14',
      nightlyRate: 80,
      fullMoonSensitive: false,
      riskLevel: 4,
    });
    expect(result.fullMoonNights).toBe(0);
    expect(result.surchargeAmount).toBe(0);
    expect(result.totalAmount).toBe(320);
  });
});
