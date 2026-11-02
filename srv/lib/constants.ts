// numeric constants the booking rules and pricing use

// milliseconds in a day, turns a date range into a night count
export const MS_PER_DAY = 86_400_000;

// a stay runs at least one night and at most a month
export const MIN_NIGHTS = 1;
export const MAX_NIGHTS = 30;

// full-moon-sensitive guests pay this share of the nightly rate extra per full-moon night
export const FULL_MOON_SURCHARGE_RATE = 0.35;

// the refundable deposit scales with the species risk level (1 to 5)
export const DEPOSIT_PER_RISK_LEVEL = 50;

// astronomy-engine tags each moon quarter 0 to 3; 2 is the full moon
export const FULL_MOON_QUARTER = 2;
