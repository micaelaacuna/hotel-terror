import { describe, it } from '@jest/globals';
import cds from '@sap/cds';

const test = cds.test(__dirname + '/..');
test.defaults.auth = { username: 'alice', password: '' };
const { POST, PATCH, expect } = test;

const DRACULA = '11111111-1111-1111-1111-000000000001'; // vampire, sun-intolerant
const SIR_SIMON = '11111111-1111-1111-1111-000000000004'; // ghost, tolerant, no temp limit
const MIGOU = '11111111-1111-1111-1111-000000000015'; // yeti, maxRoomTemp 0

const Bookings = '/hotel/Bookings';
const activatePath = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=false)/HotelService.draftActivate`;
const editPath = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=true)/HotelService.draftEdit`;
const draftRow = (id: string) => `${Bookings}(ID=${id},IsActiveEntity=false)`;

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
