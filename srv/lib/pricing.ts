import { isFullMoonNight } from './lunar';

const FULL_MOON_SURCHARGE_RATE = 0.35;
const DEPOSIT_PER_RISK_LEVEL = 50;
const MS_PER_DAY = 86_400_000;

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

// Round to cents; the seeded amounts are stored to 2 decimals, so float drift must not leak in.
const round2 = (value: number): number => Math.round(value * 100) / 100;

const atMidnightUTC = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

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
