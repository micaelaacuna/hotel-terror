import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { priceBooking } from '../srv/lib/pricing';

// The seeded booking amounts and the live pricing must never drift; recompute every row to prove it.

const EXPECTED_BOOKINGS = 37;

interface Row {
  [column: string]: string;
}

function readCsv(...segments: string[]): Row[] {
  const text = readFileSync(join(__dirname, ...segments), 'utf8');
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 0);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
  });
}

describe('seeded booking amounts', () => {
  it('match priceBooking for every mock booking', () => {
    const rooms = readCsv('data', 'hotel-Rooms.csv');
    const guests = readCsv('data', 'hotel-Guests.csv');
    const species = readCsv('..', 'db', 'data', 'hotel-Species.csv');
    const bookings = readCsv('data', 'hotel-Bookings.csv');

    const rateByRoom = new Map(rooms.map((r) => [r.number, Number(r.nightlyRate)]));
    const speciesByGuest = new Map(guests.map((g) => [g.ID, g.species_code]));
    const speciesByCode = new Map(
      species.map((s) => [s.code, {
        fullMoonSensitive: s.fullMoonSensitive === 'true',
        riskLevel: Number(s.riskLevel),
      }]),
    );

    let checked = 0;
    for (const booking of bookings) {
      const rate = rateByRoom.get(booking.room_number);
      const code = speciesByGuest.get(booking.guest_ID);
      const traits = code ? speciesByCode.get(code) : undefined;
      expect(rate).toBeDefined();
      expect(traits).toBeDefined();

      const priced = priceBooking({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nightlyRate: rate!,
        fullMoonSensitive: traits!.fullMoonSensitive,
        riskLevel: traits!.riskLevel,
      });

      expect(priced.period).toBe(booking.period);
      expect(priced.nights).toBe(Number(booking.nights));
      expect(priced.fullMoonNights).toBe(Number(booking.fullMoonNights));
      expect(priced.roomAmount.toFixed(2)).toBe(booking.roomAmount);
      expect(priced.surchargeAmount.toFixed(2)).toBe(booking.surchargeAmount);
      expect(priced.depositAmount.toFixed(2)).toBe(booking.depositAmount);
      expect(priced.totalAmount.toFixed(2)).toBe(booking.totalAmount);
      checked++;
    }

    expect(checked).toBe(EXPECTED_BOOKINGS);
  });
});
