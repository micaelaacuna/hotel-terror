import cds from '@sap/cds';
import { Bookings, Rooms, MonthlyTargets, BookingStatusCode } from '#cds-models/hotel';
import { computeOccupancy, OccupancyResult } from '../../lib/occupancy';
import { daysInMonth } from '../../lib/dates';
import { coversDate } from '../../lib/overlap';
import { round2 } from '../../lib/pricing';
import { nextFullMoon as nextFullMoonDate } from '../../lib/lunar';
import { FULL_MOON_SURCHARGE_RATE } from '../../lib/constants';

interface FullMoonResult {
  date: string;
  sensitiveGuestsBooked: number;
  surchargePct: number;
}

// a UTC-midnight Date back to its ISO day string
const iso = (d: Date): string => d.toISOString().slice(0, 10);

// occupancy for a 'YYYY-MM' period: non-cancelled room-nights booked vs. the month's total
// room capacity, plus the period's occupancy target. an unknown period returns zeros.
export async function occupancy(req: cds.Request): Promise<OccupancyResult> {
  const { period } = req.data as { period: string };

  const bookings = (await SELECT.from(Bookings)
    .columns('nights')
    .where({ period, status_code: { '!=': BookingStatusCode.cancelled } })) as { nights: number }[];
  const nights = bookings.map(b => Number(b.nights ?? 0));

  const [rooms] = (await SELECT.from(Rooms).columns('count(*) as count')) as { count: number }[];
  const target = await SELECT.one.from(MonthlyTargets).columns('occupancyTarget').where({ period });

  return computeOccupancy(nights, Number(rooms?.count ?? 0), daysInMonth(period), Number(target?.occupancyTarget ?? 0));
}

// the next full moon from server "now", and how many full-moon-sensitive guests have a
// non-cancelled stay covering that night. surchargePct is the fixed full-moon rate as a percent.
export async function nextFullMoon(): Promise<FullMoonResult> {
  const date = iso(nextFullMoonDate(new Date()));

  const bookings = (await SELECT.from(Bookings)
    .columns('checkIn', 'checkOut')
    .where({ status_code: { '!=': BookingStatusCode.cancelled }, 'guest.species.fullMoonSensitive': true })) as {
    checkIn: string;
    checkOut: string;
  }[];
  const sensitiveGuestsBooked = bookings.filter(b => coversDate(b.checkIn, b.checkOut, date)).length;

  return { date, sensitiveGuestsBooked, surchargePct: round2(FULL_MOON_SURCHARGE_RATE * 100) };
}
