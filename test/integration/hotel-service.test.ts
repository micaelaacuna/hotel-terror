import { describe, it } from '@jest/globals';
import cds from '@sap/cds';

const test = cds.test(__dirname + '/../..');
test.defaults.auth = { username: 'alice', password: '' };
const { GET, POST, PATCH, expect } = test;

const DRACULA = '11111111-1111-1111-1111-000000000001'; // vampire, sun-intolerant
const BISCLAVRET = '11111111-1111-1111-1111-000000000003'; // werewolf, full-moon sensitive, riskLevel 4
const SIR_SIMON = '11111111-1111-1111-1111-000000000004'; // ghost, tolerant, no temp limit, riskLevel 2
const MIGOU = '11111111-1111-1111-1111-000000000015'; // yeti, maxRoomTemp 0

const Bookings = '/hotel/Bookings';
const activatePath = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=false)/HotelService.draftActivate`;
const editPath = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=true)/HotelService.draftEdit`;
const draftRow = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=false)`;
const activeRow = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=true)`;
const actionPath = (id: string, name: string) => `${activeRow(id)}/HotelService.${name}`;

async function draftCreate(data: Record<string, unknown>): Promise<string> {
  const res = await POST(Bookings, data);
  return res.data.ID;
}

async function book(data: Record<string, unknown>) {
  const id = await draftCreate(data);
  return POST(activatePath(id), {});
}

const succeeded = (res: { status: number }) => expect(res.status < 300).to.equal(true);

describe('Booking validation on draft activation', () => {
  it('R2: rejects a sun-intolerant guest in a full-sun room', async () => {
    const id = await draftCreate({ guest_ID: DRACULA, room_number: '104', checkIn: '2027-04-10', checkOut: '2027-04-13' });
    await expect(POST(activatePath(id), {})).to.be.rejectedWith(/400 - Room 104 has full sun/);
  });

  it('R2: allows a sun-intolerant guest in a partial room with a warning', async () => {
    const res = await book({ guest_ID: DRACULA, room_number: '105', checkIn: '2027-04-01', checkOut: '2027-04-04' });
    succeeded(res);
    expect(/partial daylight/.test(String(res.headers['sap-messages']))).to.equal(true);
  });

  it('R3: rejects a guest in a room warmer than its species tolerates', async () => {
    const id = await draftCreate({ guest_ID: MIGOU, room_number: '207', checkIn: '2027-05-10', checkOut: '2027-05-13' });
    await expect(POST(activatePath(id), {})).to.be.rejectedWith(/400 - Room 207 is too warm/);
  });

  it('R3: allows a guest in a room at or below its temperature limit', async () => {
    const res = await book({ guest_ID: MIGOU, room_number: 'ICE-1', checkIn: '2027-05-01', checkOut: '2027-05-04' });
    succeeded(res);
  });

  it('R4: rejects a booking that overlaps an existing one on the same room', async () => {
    succeeded(await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-03-01', checkOut: '2027-03-04' }));

    const clashId = await draftCreate({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-03-03', checkOut: '2027-03-06' });
    await expect(POST(activatePath(clashId), {})).to.be.rejectedWith(/409 - Room 13 is already booked/);

    succeeded(await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-03-04', checkOut: '2027-03-06' }));
  });

  it('R4: does not flag a booking against itself when its dates are updated', async () => {
    const res = await book({ guest_ID: SIR_SIMON, room_number: 'P-B', checkIn: '2027-08-01', checkOut: '2027-08-04' });
    succeeded(res);
    const id = res.data.ID;

    await POST(editPath(id), {});
    await PATCH(draftRow(id), { checkOut: '2027-08-05' });
    succeeded(await POST(activatePath(id), {}));
  });

  it('R1: rejects a check-out on or before check-in', async () => {
    const id = await draftCreate({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-09-05', checkOut: '2027-09-05' });
    await expect(POST(activatePath(id), {})).to.be.rejectedWith(/400 - A stay must run/);
  });

  it('R1: rejects a stay longer than 30 nights', async () => {
    const id = await draftCreate({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-09-01', checkOut: '2027-10-11' });
    await expect(POST(activatePath(id), {})).to.be.rejectedWith(/400 - A stay must run/);
  });
});

describe('Booking pricing on draft activation', () => {
  it('R5: prices a full-moon-sensitive stay with the surcharge and deposit', async () => {
    const res = await book({ guest_ID: BISCLAVRET, room_number: 'C-1', checkIn: '2026-10-25', checkOut: '2026-10-28' });
    succeeded(res);

    const { data } = await GET(activeRow(res.data.ID));
    expect(data.nights).to.equal(3);
    expect(data.fullMoonNights).to.equal(1);
    expect(Number(data.roomAmount)).to.equal(240);
    expect(Number(data.surchargeAmount)).to.equal(28);
    expect(Number(data.depositAmount)).to.equal(200);
    expect(Number(data.totalAmount)).to.equal(268);
    expect(data.period).to.equal('2026-10');
  });

  it('R5: applies no surcharge for a guest that is not full-moon sensitive', async () => {
    const res = await book({ guest_ID: SIR_SIMON, room_number: 'C-2', checkIn: '2026-10-25', checkOut: '2026-10-28' });
    succeeded(res);

    const { data } = await GET(activeRow(res.data.ID));
    expect(data.fullMoonNights).to.equal(1);
    expect(Number(data.surchargeAmount)).to.equal(0);
    expect(Number(data.depositAmount)).to.equal(100);
    expect(Number(data.totalAmount)).to.equal(240);
  });
});

describe('Booking lifecycle actions', () => {
  const status = async (id: string) => (await GET(activeRow(id))).data.status_code;

  it('checkIn: moves a confirmed booking to checked in, and rejects a second check-in', async () => {
    const { data } = await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-11-01', checkOut: '2027-11-04' });
    await POST(actionPath(data.ID, 'checkIn'), {});
    expect(await status(data.ID)).to.equal('checkedIn');

    await expect(POST(actionPath(data.ID, 'checkIn'), {})).to.be.rejectedWith(/409 - Only a confirmed booking/);
  });

  it('checkOut: folds charges and incidents into the total', async () => {
    const { data } = await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-11-10', checkOut: '2027-11-13' });
    const id = data.ID;

    await INSERT.into('hotel.Charges').entries({ booking_ID: id, extra_code: 'swampSpa', quantity: 1, amount: 45 });
    await INSERT.into('hotel.Incidents').entries({ booking_ID: id, type_code: 'damage', severity: 2, cost: 30 });

    await POST(actionPath(id, 'checkIn'), {});
    await POST(actionPath(id, 'checkOut'), {});

    const { data: after } = await GET(activeRow(id));
    expect(after.status_code).to.equal('checkedOut');
    expect(Number(after.totalAmount)).to.equal(285); // 210 base + 45 charge + 30 incident
  });

  it('checkOut: rejects a booking that has not checked in', async () => {
    const { data } = await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-11-20', checkOut: '2027-11-23' });
    await expect(POST(actionPath(data.ID, 'checkOut'), {})).to.be.rejectedWith(/409 - Only a checked-in guest/);
  });

  it('cancel: cancels a confirmed booking', async () => {
    const { data } = await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-12-01', checkOut: '2027-12-04' });
    await POST(actionPath(data.ID, 'cancel'), {});
    expect(await status(data.ID)).to.equal('cancelled');
  });

  it('cancel: rejects a booking that is already checked in', async () => {
    const { data } = await book({ guest_ID: SIR_SIMON, room_number: '13', checkIn: '2027-12-10', checkOut: '2027-12-13' });
    await POST(actionPath(data.ID, 'checkIn'), {});
    await expect(POST(actionPath(data.ID, 'cancel'), {})).to.be.rejectedWith(/409 - This booking can no longer/);
  });
});
