import cds from '@sap/cds';
import { Bookings, BookingStatusCode } from '#cds-models/hotel';
import { activeId } from './Bookings.actions';

// a checked-out or cancelled booking is frozen for good
const LOCKED: BookingStatusCode[] = [BookingStatusCode.checkedOut, BookingStatusCode.cancelled];

// keep finished bookings tamper-proof: no edit or delete once checked out or cancelled, and a
// guest who is still in the hotel must be checked out before the booking can be deleted.
export async function guardBookingChange(req: cds.Request): Promise<void> {
  const ID = activeId(req);
  const booking = await SELECT.one.from(Bookings).columns('status_code').where({ ID });
  if (!booking) return;
  const status = booking.status_code as BookingStatusCode;

  if (LOCKED.includes(status)) {
    return req.reject(409, 'BOOKING_LOCKED');
  }
  if (req.event === 'DELETE' && status === BookingStatusCode.checkedIn) {
    return req.reject(409, 'BOOKING_IN_HOUSE_DELETE');
  }
}
