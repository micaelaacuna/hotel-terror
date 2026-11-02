import cds from '@sap/cds';
import { validateBooking } from './handlers/Bookings/Bookings.validate';
import { checkIn, checkOut, cancel } from './handlers/Bookings/Bookings.actions';

// register the booking validation and lifecycle handlers
export default class HotelService extends cds.ApplicationService {
  async init() {
    const { Bookings } = this.entities;

    this.before(['CREATE', 'UPDATE'], Bookings, validateBooking);

    this.on('checkIn', Bookings, checkIn);
    this.on('checkOut', Bookings, checkOut);
    this.on('cancel', Bookings, cancel);

    return super.init();
  }
}
