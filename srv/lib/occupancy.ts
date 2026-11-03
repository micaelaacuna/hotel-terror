import { round2 } from './pricing';

export interface OccupancyResult {
  occupiedRoomNights: number;
  availableRoomNights: number;
  rate: number;
  target: number;
}

// monthly occupancy: booked room-nights against the full rooms-times-days capacity, as a percent.
// one room counts as one unit per night, capacity is ignored. empty capacity gives a 0 rate.
export function computeOccupancy(
  nights: number[],
  roomCount: number,
  days: number,
  target: number,
): OccupancyResult {
  const occupiedRoomNights = nights.reduce((total, n) => total + n, 0);
  const availableRoomNights = roomCount * days;
  const rate = availableRoomNights > 0 ? round2((occupiedRoomNights / availableRoomNights) * 100) : 0;
  return { occupiedRoomNights, availableRoomNights, rate, target };
}
