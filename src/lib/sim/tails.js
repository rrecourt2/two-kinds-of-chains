// Thin and fat tails (chapter 8). Both worlds have the same ordinary days: daily
// moves with a standard deviation of 1%. The thin-tailed world draws them from a
// normal distribution; the fat-tailed world from Student's t with 3 degrees of
// freedom (a common simple model of daily market moves), scaled to the same spread.

import { makeRng, normal } from './rng.js';

export const DAYS_PER_YEAR = 250;

function studentT3(rng) {
  const z = normal(rng);
  const a = normal(rng);
  const b = normal(rng);
  const c = normal(rng);
  return z / Math.sqrt((a * a + b * b + c * c) / 3);
}

/** Daily losses in percent (0 on up days) for `years` years in both worlds. */
export function simulateHistory({ years = 40, seed = 3 } = {}) {
  const rng = makeRng(seed);
  const n = years * DAYS_PER_YEAR;
  const thin = new Float64Array(n);
  const fat = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    thin[i] = Math.max(0, -normal(rng));
    fat[i] = Math.max(0, -studentT3(rng) / Math.sqrt(3));
  }
  return { thin, fat, years };
}

export function worst(losses, fromYear, toYear) {
  let w = 0;
  const end = Math.min(losses.length, toYear * DAYS_PER_YEAR);
  for (let i = fromYear * DAYS_PER_YEAR; i < end; i++) if (losses[i] > w) w = losses[i];
  return w;
}

/** Days that set a new record for the worst loss so far, after the first `fromYear` years. */
export function recordsAfter(losses, fromYear) {
  let w = worst(losses, 0, fromYear);
  let count = 0;
  for (let i = fromYear * DAYS_PER_YEAR; i < losses.length; i++) {
    if (losses[i] > w) {
      w = losses[i];
      count++;
    }
  }
  return count;
}

/** The turkey's confidence that tomorrow will be fine, by Laplace's rule of succession. */
export const turkeyConfidence = (goodDays) => (goodDays + 1) / (goodDays + 2);
