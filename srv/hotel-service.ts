import cds from '@sap/cds';
import { sunCompatibility, temperatureOk, nightsBetween, type SunExposure } from './lib/compatibility';
import { overlaps } from './lib/overlap';

const MIN_NIGHTS = 1;
const MAX_NIGHTS = 30;

interface BookingData {
  ID?: string;
  checkIn?: string;
  checkOut?: string;
  room_number?: string;
  guest_ID?: string;
  status_code?: string;
}

export default class HotelService extends cds.ApplicationService {
  async init() {
    const { Bookings, Rooms, Guests, Species } = this.entities;

    this.before(['CREATE', 'UPDATE'], Bookings, async req => {
      const data = req.data as BookingData;
      let { checkIn, checkOut, room_number, guest_ID } = data;
      const ID = data.ID;

      // UPDATE sends only the changed fields, so pull the rest from the stored row.
      if (ID != null && (checkIn == null || checkOut == null || room_number == null || guest_ID == null)) {
        const stored = await SELECT.one.from(Bookings).where({ ID });
        if (stored) {
          checkIn ??= stored.checkIn;
          checkOut ??= stored.checkOut;
          room_number ??= stored.room_number;
          guest_ID ??= stored.guest_ID;
        }
      }

      if (!checkIn || !checkOut || !room_number || !guest_ID) return;

      // R1 - stay sanity
      const nights = nightsBetween(checkIn, checkOut);
      if (nights < MIN_NIGHTS || nights > MAX_NIGHTS) {
        return req.reject(400, 'STAY_LENGTH', 'checkOut');
      }

      const room = await SELECT.one.from(Rooms).columns('sunExposure', 'temperature').where({ number: room_number });
      const guest = await SELECT.one.from(Guests).columns('species_code').where({ ID: guest_ID });
      const species = guest?.species_code
        ? await SELECT.one.from(Species).columns('sunTolerant', 'maxRoomTemp').where({ code: guest.species_code })
        : undefined;

      if (room && species) {
        // R2 - sun compatibility
        const verdict = sunCompatibility(species.sunTolerant, room.sunExposure as SunExposure);
        if (verdict === 'reject') {
          return req.reject(400, 'SUN_INCOMPATIBLE', 'room', [room_number]);
        }
        if (verdict === 'warn') {
          req.warn({ message: 'SUN_PARTIAL_WARNING', args: [room_number] });
        }

        // R3 - temperature
        if (!temperatureOk(room.temperature, species.maxRoomTemp)) {
          return req.reject(400, 'TEMP_TOO_WARM', 'room', [room_number]);
        }
      }

      // R4 - booking overlap on the same room
      const where: Record<string, unknown> = { room_number, status_code: { '!=': 'cancelled' } };
      if (ID != null) where.ID = { '!=': ID };
      const others = await SELECT.from(Bookings).columns('ID', 'checkIn', 'checkOut').where(where);
      const clash = others.some((other: { checkIn: string; checkOut: string }) =>
        overlaps(other.checkIn, other.checkOut, checkIn!, checkOut!),
      );
      if (clash) {
        return req.reject(409, 'ROOM_OVERLAP', undefined, [room_number]);
      }
    });

    return super.init();
  }
}
