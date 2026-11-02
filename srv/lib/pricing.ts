import { isFullMoonNight } from './lunar';
import { FULL_MOON_SURCHARGE_RATE, DEPOSIT_PER_RISK_LEVEL, MS_PER_DAY } from './constants';
import { atMidnightUTC } from './dates';

export interface PriceInput {
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD, exclusive
  nightlyRate: number;
  fullMoonSensitive: boolean;
  riskLevel: number;
}

export interface PriceResult {
  period: string;
  nights: number;
  fullMoonNights: number;
  roomAmount: number;
  surchargeAmount: number;
  depositAmount: number;
  totalAmount: number;
}

// round to cents. Amounts are stored to 2 decimals, so keep float drift from leaking in.
export const round2 = (value: number): number => Math.round(value * 100) / 100;

export function priceBooking(input: PriceInput): PriceResult {
  const checkInMs = atMidnightUTC(input.checkIn);
  const checkOutMs = atMidnightUTC(input.checkOut);
  const nights = Math.round((checkOutMs - checkInMs) / MS_PER_DAY);

  let fullMoonNights = 0;
  for (let ms = checkInMs; ms < checkOutMs; ms += MS_PER_DAY) {
    if (isFullMoonNight(new Date(ms))) fullMoonNights++;
  }

  const roomAmount = round2(nights * input.nightlyRate);
  const surchargeAmount = input.fullMoonSensitive
    ? round2(fullMoonNights * input.nightlyRate * FULL_MOON_SURCHARGE_RATE)
    : 0;
  const depositAmount = round2(input.riskLevel * DEPOSIT_PER_RISK_LEVEL);
  const totalAmount = round2(roomAmount + surchargeAmount);

  return {
    period: input.checkIn.slice(0, 7),
    nights,
    fullMoonNights,
    roomAmount,
    surchargeAmount,
    depositAmount,
    totalAmount,
  };
}
