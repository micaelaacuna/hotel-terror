export type SunExposure = 'none' | 'partial' | 'full';
export type SunVerdict = 'ok' | 'warn' | 'reject';

const MS_PER_DAY = 86_400_000;

const atMidnightUTC = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

// A sun-intolerant guest cannot survive a full-sun room; a partial room is survivable with care.
export function sunCompatibility(sunTolerant: boolean, sunExposure: SunExposure): SunVerdict {
  if (sunTolerant) return 'ok';
  if (sunExposure === 'full') return 'reject';
  if (sunExposure === 'partial') return 'warn';
  return 'ok';
}

// A null/undefined maxRoomTemp means the species has no upper limit.
export function temperatureOk(roomTemp: number, maxRoomTemp: number | null | undefined): boolean {
  if (maxRoomTemp == null) return true;
  return roomTemp <= maxRoomTemp;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((atMidnightUTC(checkOut) - atMidnightUTC(checkIn)) / MS_PER_DAY);
}
