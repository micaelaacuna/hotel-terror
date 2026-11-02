import { SunExposure } from '#cds-models/hotel';

// result of a sun check: ok, warn, or reject
export type SunVerdict = 'ok' | 'warn' | 'reject';

// decide whether a guest can take a room given its daylight. A sun-intolerant guest cannot
// survive full sun (reject); a partial room is survivable but worth a warning.
export function sunCompatibility(sunTolerant: boolean, sunExposure: SunExposure): SunVerdict {
  if (sunTolerant) return 'ok';
  if (sunExposure === SunExposure.full) return 'reject';
  if (sunExposure === SunExposure.partial) return 'warn';
  return 'ok';
}

// check the room is not warmer than the species tolerates. A null/undefined maxRoomTemp means
// the species has no upper limit, so anything passes.
export function temperatureOk(roomTemp: number, maxRoomTemp: number | null | undefined): boolean {
  if (maxRoomTemp == null) return true;
  return roomTemp <= maxRoomTemp;
}
