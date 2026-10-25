// The toll road: a dollar loan repaid from tolls collected in local currency.
// In a normal year the road collects 100 in tolls and spends 40 on running costs (both in local currency, at the
// starting exchange rate); the year's debt payment is 41.4 in dollars, so the cover is 60 / 41.4 = 1.45.
// A test year cuts the tolls by the traffic fall; running costs stay fixed; what is left is turned into dollars at
// the fallen currency:  cover = (100 × (1 − traffic fall) − 40) × (1 − currency fall) / 41.4.
// Below 1.0 the road misses its payment. Falls are fractions (0.15 = 15%) on a year earlier.
import { makeRng, normal } from './rng.js';

export const REVENUE = 100;
export const COSTS = 40;
export const PAYMENT = 41.4;
export const MONTHS = 96;
/** The record's worst moves: traffic once fell 15% (a recession), the currency once fell 20% (a devaluation). */
export const WORST = { traffic: 0.15, currency: 0.2 };

// Cash equal to the payment counts as paid; the tolerance keeps whole-percent tests off floating-point noise.
const EPS = 1e-9;

/** Cash for the loan per dollar due. */
export function cover(traffic, currency) {
  return ((REVENUE * (1 - traffic) - COSTS) * (1 - currency)) / PAYMENT;
}

/** A reserve of six months' payments, in years of payments: in a bad year it pays up to half the year's debt. */
export const RESERVE = 0.5;

/** Does the road miss its payment in this year? With a reserve (in years of payments), it misses only once the
 *  shortfall is larger than the reserve: the payment comes from the tolls or the reserve. */
export const misses = (traffic, currency, reserve = 0) => cover(traffic, currency) + reserve < 1 - EPS;

/** A year the reserve carries: the tolls alone fall short, the tolls and the reserve together pay. */
export const paidFromReserve = (traffic, currency, reserve = RESERVE) => misses(traffic, currency) && !misses(traffic, currency, reserve);

/** Is the year within the record's worst on both counts (neither fall beyond what the record has seen)? */
export const withinRecord = (traffic, currency) => traffic <= WORST.traffic + EPS && currency <= WORST.currency + EPS;

/** A year that breaks the claim “this road can pay through anything it has seen”. */
export const breaksClaim = (traffic, currency, reserve = 0) => misses(traffic, currency, reserve) && withinRecord(traffic, currency);

/** The cover to two decimals; a year that misses never reads 1.00 (0.9976 reads 0.99). */
export function coverLabel(traffic, currency) {
  const v = Math.round(cover(traffic, currency) * 100) / 100;
  return (misses(traffic, currency) ? Math.min(v, 0.99) : v).toFixed(2);
}

/** For a given traffic fall, the currency fall at which the cover is exactly 1.0 (below 0: it misses even if the
 *  currency rises; Infinity is never returned, since costs cannot exceed tolls in the range used here). */
export function breakingCurrency(traffic, reserve = 0) {
  return 1 - (PAYMENT * (1 - reserve)) / (REVENUE * (1 - traffic) - COSTS);
}

/** How far each fall must go on its own before the road misses: traffic 18.6%, currency 31.0%. */
export const ALONE = {
  traffic: (REVENUE - COSTS - PAYMENT) / REVENUE,
  currency: 1 - PAYMENT / (REVENUE - COSTS),
};

/**
 * The record: 96 months, each the traffic and the currency on a year earlier. Traffic usually grows about 5% a
 * year and the currency slips about 2%. A recession in year three takes traffic down by up to 15% while the
 * currency holds; a devaluation in year six takes the currency down by up to 20% while traffic grows. The two
 * worst months are set to exactly the record's worst, so the text and the box agree.
 */
export function record(seed = 8) {
  const rng = makeRng(seed);
  const out = [];
  for (let m = 0; m < MONTHS; m++) {
    const y = m / 12;
    let t = -0.05 + 0.025 * normal(rng); // a negative fall: traffic grows
    let c = 0.02 + 0.02 * normal(rng);
    if (y >= 2 && y < 3.2) t = Math.max(t, WORST.traffic * Math.sin((Math.PI * (y - 2)) / 1.2)) - 0.005 * rng();
    if (y >= 5 && y < 6.3) c = Math.max(c, WORST.currency * Math.sin((Math.PI * (y - 5)) / 1.3)) - 0.004 * rng();
    out.push({ month: m, traffic: Math.min(WORST.traffic, t), currency: Math.min(WORST.currency, c) });
  }
  const top = (key) => out.reduce((a, p) => (p[key] > a[key] ? p : a));
  top('traffic').traffic = WORST.traffic;
  top('currency').currency = WORST.currency;
  return out.map((p) => ({ ...p, cover: cover(p.traffic, p.currency) }));
}

/** Whole-percent test years inside the record's box (0–15% traffic, 0–20% currency), and those that break the claim. */
export function boxGrid() {
  const points = [];
  for (let t = 0; t <= Math.round(WORST.traffic * 100); t++)
    for (let c = 0; c <= Math.round(WORST.currency * 100); c++) points.push({ t, c, breaks: misses(t / 100, c / 100) });
  return { total: points.length, breaking: points.filter((p) => p.breaks) };
}
