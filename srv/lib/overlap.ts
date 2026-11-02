// do two date ranges clash? We compare ISO YYYY-MM-DD strings directly: zero-padded dates sort
// the same lexically as chronologically, so no Date parsing is needed. Check-out is exclusive,
// so a stay ending the day another begins does not count as an overlap.
export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && aOut > bIn;
}
