import cds from '@sap/cds';
import { Rooms, Guests, Species, Bookings, SunExposure, BookingStatusCode } from '#cds-models/hotel';
import { sunCompatibility, temperatureOk } from '../../lib/compatibility';
import { nightsBetween } from '../../lib/dates';
import { overlaps } from '../../lib/overlap';
import { priceBooking } from '../../lib/pricing';
import { MIN_NIGHTS, MAX_NIGHTS } from '../../lib/constants';

interface BookingData {
  ID?: string;
  checkIn?: string;
  checkOut?: string;
  room_number?: string;
  guest_ID?: string;
  status_code?: string;
}

// the room and species fields the rules below read
interface RoomRow {
  sunExposure: SunExposure;
  temperature: number;
  nightlyRate: number;
}

interface SpeciesRow {
  sunTolerant: boolean;
  maxRoomTemp: number | null;
  fullMoonSensitive: boolean;
  riskLevel: number;
}

// runs before every Booking CREATE/UPDATE. enforces the booking rules and, when the booking
// inputs change, writes the recomputed amounts back onto req.data so they persist.
export async function validateBooking(req: cds.Request): Promise<void> {
  const data = req.data as BookingData;
  let { checkIn, checkOut, room_number, guest_ID } = data;
  const ID = data.ID;

  // only reprice when the booking inputs are part of this change. A status-only update from a
  // lifecycle action must leave the computed amounts alone.
  const pricingInputChanged =
    data.checkIn != null || data.checkOut != null || data.room_number != null || data.guest_ID != null;

  // UPDATE sends only the changed fields, so fill the rest in from the stored row
  if (ID != null && (checkIn == null || checkOut == null || room_number == null || guest_ID == null)) {
    const stored = (await SELECT.one.from(Bookings).where({ ID })) as BookingData | undefined;
    if (stored) {
      checkIn ??= stored.checkIn;
      checkOut ??= stored.checkOut;
      room_number ??= stored.room_number;
      guest_ID ??= stored.guest_ID;
    }
  }

  if (!checkIn || !checkOut || !room_number || !guest_ID) return;

  // stay length, 1 to 30 nights
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < MIN_NIGHTS || nights > MAX_NIGHTS) {
    return req.reject(400, 'STAY_LENGTH', 'checkOut');
  }

  const room = (await SELECT.one.from(Rooms).columns('sunExposure', 'temperature', 'nightlyRate').where({ number: room_number })) as RoomRow | undefined;
  const guest = await SELECT.one.from(Guests).columns('species_code').where({ ID: guest_ID });
  const species = guest?.species_code
    ? ((await SELECT.one.from(Species).columns('sunTolerant', 'maxRoomTemp', 'fullMoonSensitive', 'riskLevel').where({ code: guest.species_code })) as SpeciesRow | undefined)
    : undefined;

  if (room && species) {
    // sun-intolerant guests can't take a full-sun room, partial only warns
    const verdict = sunCompatibility(species.sunTolerant, room.sunExposure);
    if (verdict === 'reject') {
      return req.reject(400, 'SUN_INCOMPATIBLE', 'room', [room_number]);
    }
    if (verdict === 'warn') {
      req.warn({ message: 'SUN_PARTIAL_WARNING', args: [room_number] });
    }

    // room can't be warmer than the species tolerates
    if (!temperatureOk(room.temperature, species.maxRoomTemp)) {
      return req.reject(400, 'TEMP_TOO_WARM', 'room', [room_number]);
    }
  }

  // room must be free, no overlapping live booking
  const where: Record<string, unknown> = { room_number, status_code: { '!=': BookingStatusCode.cancelled } };
  if (ID != null) where.ID = { '!=': ID };
  const others = (await SELECT.from(Bookings).columns('ID', 'checkIn', 'checkOut').where(where)) as { checkIn: string; checkOut: string }[];
  const clash = others.some(other => overlaps(other.checkIn, other.checkOut, checkIn!, checkOut!));
  if (clash) {
    return req.reject(409, 'ROOM_OVERLAP', undefined, [room_number]);
  }

  // price the stay and persist the amounts
  if (pricingInputChanged && room) {
    Object.assign(
      req.data,
      priceBooking({
        checkIn,
        checkOut,
        nightlyRate: room.nightlyRate,
        fullMoonSensitive: species?.fullMoonSensitive ?? false,
        riskLevel: species?.riskLevel ?? 0,
      }),
    );
  }
}
