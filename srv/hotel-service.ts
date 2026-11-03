import cds from '@sap/cds';
import { validateBooking } from './handlers/Bookings/Bookings.validate';
import { guardBookingChange } from './handlers/Bookings/Bookings.guard';
import { checkIn, checkOut, cancel } from './handlers/Bookings/Bookings.actions';
import { priceCharge } from './handlers/Charges/Charges.validate';
import { guardRoomDelete } from './handlers/Rooms/Rooms.guard';
import { occupancy, nextFullMoon } from './handlers/analytics/Analytics.functions';

// register the booking validation, guards and lifecycle handlers
export default class HotelService extends cds.ApplicationService {
  async init() {
    const { Bookings, Charges, Rooms } = this.entities;

    // guard runs first so a frozen booking is rejected before any revalidation or repricing
    this.before(['UPDATE', 'DELETE'], Bookings, guardBookingChange);
    this.before(['CREATE', 'UPDATE'], Bookings, validateBooking);

    // charges live under the booking draft, so price them on the draft rows and on any direct
    // write to the active table
    this.before(['CREATE', 'UPDATE'], Charges.drafts!, priceCharge);
    this.before(['CREATE', 'UPDATE'], Charges, priceCharge);

    this.before('DELETE', Rooms, guardRoomDelete);

    this.on('checkIn', Bookings, checkIn);
    this.on('checkOut', Bookings, checkOut);
    this.on('cancel', Bookings, cancel);

    this.on('occupancy', occupancy);
    this.on('nextFullMoon', nextFullMoon);

    return super.init();
  }
}
