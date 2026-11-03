import cds from '@sap/cds';
import { Bookings, Rooms } from '#cds-models/hotel';

// the room key is its number. deletes run on the active row, so take the last param past the
// draft IsActiveEntity key.
const roomNumber = (req: cds.Request): string => (req.params.at(-1) as { number: string }).number;

// don't delete a room that still has bookings. a plain delete would blow up on the database
// foreign key, so answer with a clear 409 naming the room instead.
export async function guardRoomDelete(req: cds.Request): Promise<void> {
  const number = roomNumber(req);
  const [{ count }] = (await SELECT.from(Bookings)
    .columns('count(*) as count')
    .where({ room_number: number })) as { count: number }[];

  if (Number(count ?? 0) > 0) {
    return req.reject(409, 'ROOM_HAS_BOOKINGS', undefined, [number]);
  }
}
