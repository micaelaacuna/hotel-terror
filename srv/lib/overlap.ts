// do two date ranges clash? ISO YYYY-MM-DD strings sort the same lexically as chronologically,
// so a direct string compare works. check-out is exclusive, so a stay ending the day another
// begins does not count as an overlap.
export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && aOut > bIn;
}

// does a stay cover a single night? Same ISO-string compare, check-out exclusive, so the night
// starting on the check-out day is no longer covered.
export function coversDate(checkIn: string, checkOut: string, date: string): boolean {
  return checkIn <= date && date < checkOut;
}
