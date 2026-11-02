// Half-open interval test on ISO YYYY-MM-DD strings. Zero-padded ISO dates compare correctly
// lexically, so no Date parsing is needed. Check-out is exclusive: a stay ending the day another
// begins does not overlap.
export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && aOut > bIn;
}
