import cds from '@sap/cds';
import { Bookings, Charges, Incidents, BookingStatusCode } from '#cds-models/hotel';
import { round2 } from '../../lib/pricing';

// statuses each lifecycle step may run from
const CHECK_IN_FROM = [BookingStatusCode.confirmed];
const CANCEL_FROM = [BookingStatusCode.requested, BookingStatusCode.confirmed];

// sum a numeric column over a set of rows. Decimal columns come back as strings from the
// driver, so coerce each value before adding.
const sum = (rows: Record<string, unknown>[], field: string): number =>
  rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);

// the active booking id. Actions run on the active row, so take the last param to skip the
// draft IsActiveEntity key.
export const activeId = (req: cds.Request): string => (req.params.at(-1) as { ID: string }).ID;

// move a booking to nextStatus only if it is currently in one of allowedFrom, else 409.
// The write goes straight to the DB layer so it does not re-trigger the Booking validation
// handler or get stripped as a read-only service field.
async function transition(
  req: cds.Request,
  allowedFrom: BookingStatusCode[],
  nextStatus: BookingStatusCode,
  badStateKey: string,
): Promise<void> {
  const ID = activeId(req);
  const booking = await SELECT.one.from(Bookings).columns('status_code').where({ ID });
  if (!booking || !allowedFrom.includes(booking.status_code as BookingStatusCode)) {
    return req.reject(409, badStateKey);
  }
  await UPDATE(Bookings).set({ status_code: nextStatus }).where({ ID });
}

// a confirmed booking checks in
export function checkIn(req: cds.Request): Promise<void> {
  return transition(req, CHECK_IN_FROM, BookingStatusCode.checkedIn, 'CHECKIN_BAD_STATE');
}

// a requested or confirmed booking cancels
export function cancel(req: cds.Request): Promise<void> {
  return transition(req, CANCEL_FROM, BookingStatusCode.cancelled, 'CANCEL_BAD_STATE');
}

// check out a staying guest: fold any charges and incidents onto the room+surcharge base,
// then store the final total and flip the status.
export async function checkOut(req: cds.Request): Promise<void> {
  const ID = activeId(req);
  const booking = await SELECT.one.from(Bookings).columns('status_code', 'roomAmount', 'surchargeAmount').where({ ID });
  if (!booking || booking.status_code !== BookingStatusCode.checkedIn) {
    return req.reject(409, 'CHECKOUT_BAD_STATE');
  }

  const charges = (await SELECT.from(Charges).columns('amount').where({ booking_ID: ID })) as Record<string, unknown>[];
  const incidents = (await SELECT.from(Incidents).columns('cost').where({ booking_ID: ID })) as Record<string, unknown>[];
  const extras = round2(sum(charges, 'amount') + sum(incidents, 'cost'));
  const totalAmount = round2(Number(booking.roomAmount ?? 0) + Number(booking.surchargeAmount ?? 0) + extras);

  await UPDATE(Bookings).set({ status_code: BookingStatusCode.checkedOut, totalAmount }).where({ ID });
}
