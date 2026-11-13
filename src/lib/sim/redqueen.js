// Running to stand still: integrity reviews that move, against procurement schemes that spread.
//
// A development lender finances many projects, and their contracts are bought through tenders.
// Some contracts are rigged, each in one of twelve ways that leaves its own red flag (a contract
// split to stay under the prior-review threshold, a single bid, the same firms taking turns to win,
// a padded variation after award, …). Each month 50 rigged contracts across the portfolio are
// spread over the red flags by the schemes' current mix. The integrity team reviews three red flags
// thoroughly; a rigged contract carrying a reviewed flag is caught nine times in ten, one carrying
// an unreviewed flag gets through. The team learns of every catch and of half the rigged contracts
// that got through (found later, by audits and complaints), and each time it moves its reviews it
// puts them on the three red flags with the most found in the latest month.
//
// Nobody works full time against the lender. The schemes spread the way habits do: what got
// through is used again on the next tender and copied by others on other projects, and what was
// caught is dropped (a replicator step on next month's mix), while a small share always tries
// something new. Because the copying waits for the next tender, it is slower than a full-time
// fraudster's would be: left alone, the reviews lose most of their catch within a year, not a month.
//
// Two loops race: the schemes' turns every month, the lender's each time the reviews move.
//
// Variants: the reviews moved never, every year, quarter or month (the chapter offers never,
// yearly and monthly); one of the three reviews drawn at random each month (two follow the
// findings); and the growing chain, where each move adds the worst unreviewed flag and never drops one.
//
// The code keeps the general words: a pattern is a red flag, a check is a review, an attempt is a
// rigged contract, and a review (in `review`, `EVERY`) is a move of the reviews.
import { makeRng } from './rng.js';

/** The twelve red flags (names for the figure's rows), the three seen most at the start first. */
export const PATTERNS = [
  'Single bid',
  'Split contract',
  'Bid rotation',
  'Shared address',
  'Short deadline',
  'Late spec change',
  'Rival excluded',
  'Padded variation',
  'Official’s cousin',
  'Ghost supplier',
  'Direct award',
  'Identical bids',
];
export const P = PATTERNS.length;
export const CHECKS = 3;
/** A review catches this share of the rigged contracts carrying its red flag. */
export const CATCH = 0.9;
export const ATTEMPTS = 50;
export const MONTHS = 36;
/** How fast what got through is copied (a scheme is reused when the next tender comes up, so a
 *  quarter of the way to the payoff each month); the share that tries something new each month;
 *  the share of rigged contracts that got through that the lender finds out about later; the share
 *  of rigged contracts on the three red flags seen most at the start. */
export const PARAMS = { learn: 0.25, innovate: 0.03, seen: 0.5, start: 0.8 };
/** Months between moves of the reviews (0: never). */
export const EVERY = { never: 0, yearly: 12, quarterly: 3, monthly: 1 };
/** The run in the figure (close to the average run in every setting), and the runs behind the averages the text quotes. */
export const SEED = 108;
export const RUNS = 400;

/** What the reviews do between moves: all three follow the findings; one of them is drawn at random each month; or
 *  each move adds a review and none is dropped (the growing chain). */
export const MODES = ['review', 'random', 'grow'];
/** The setting's name in CURVES (with no reviews, nothing is ever added, so 'never-grow' is 'never'). */
export const curveKey = (review = 'yearly', mode = 'review') => (mode === 'review' || (mode === 'grow' && review === 'never') ? review : `${review}-${mode}`);

/**
 * The share of the month's rigged contracts caught, in per cent to two decimals, month by month, averaged over RUNS
 * runs of every setting the chapter offers: worked out once by `average()` and checked against it in
 * test/redqueen.test.js, so the page does not rerun 3,200 runs. Every number the chapter quotes about the catch comes
 * from these.
 */
export const CURVES = {
  never: [72.21, 59.36, 47.32, 37.54, 29.02, 22.64, 17.7, 14.5, 11.29, 9.39, 7.73, 6.67, 5.79, 5.13, 4.15, 3.84, 3.66, 3.24, 3.19, 3.08, 2.99, 2.87, 2.9, 2.72, 2.85, 2.87, 2.83, 2.7, 2.79, 2.8, 2.78, 2.65, 2.68, 2.69, 2.75, 2.78],
  'never-random': [52.45, 43.06, 35.44, 29.24, 25.3, 21.52, 18.76, 16.92, 16.16, 14.79, 13.33, 12.03, 11.94, 11.79, 11.95, 10.53, 11.21, 11.79, 10.78, 10.85, 9.98, 11.21, 10.75, 11.3, 10.45, 11.41, 10.49, 11, 10.45, 10.48, 10.47, 10.93, 10.89, 10.55, 10.69, 10.63],
  yearly: [72.21, 59.36, 47.32, 37.54, 29.02, 22.64, 17.7, 14.5, 11.29, 9.39, 7.73, 6.67, 27.33, 21.39, 16.61, 13.91, 10.98, 8.65, 7.34, 6.25, 5.46, 4.42, 4.32, 3.84, 35.46, 27.66, 21.99, 17.33, 13.53, 11.13, 8.65, 7.36, 6.25, 5.22, 4.54, 4.37],
  'yearly-random': [52.45, 43.06, 35.44, 29.24, 25.3, 21.52, 18.76, 16.92, 16.16, 14.79, 13.33, 12.03, 43.12, 35.8, 30.84, 25.37, 21.99, 19.88, 17.36, 15.47, 13.89, 13.79, 12.55, 12.78, 28.8, 24.08, 21.68, 18.51, 16.34, 14.79, 13.95, 13.12, 12.47, 12.08, 11.82, 11.2],
  'yearly-grow': [72.21, 59.36, 47.32, 37.54, 29.02, 22.64, 17.7, 14.5, 11.29, 9.39, 7.73, 6.67, 15.26, 12.68, 9.91, 8.37, 7.34, 6.16, 5.85, 5.49, 4.68, 4.5, 4.27, 4.03, 14.67, 12.25, 10.17, 8.91, 7.96, 7.46, 6.22, 5.92, 5.56, 5.13, 5.02, 5.15],
  monthly: [72.21, 59.03, 47.3, 37.24, 28.81, 22.66, 21.44, 20.17, 21.73, 22.19, 23.3, 23.64, 23.89, 25.22, 25.14, 25.02, 24.57, 24.82, 24.31, 24.26, 23.32, 24.34, 24.7, 24.15, 24.1, 24.29, 24.56, 23.81, 24.17, 24.31, 24.36, 23.8, 24.32, 24.25, 24.3, 24.59],
  'monthly-random': [52.45, 43.85, 43.27, 44.3, 39.62, 36.16, 33.24, 29.07, 26.81, 23.61, 22.98, 22.79, 23.32, 23.1, 23.36, 23.41, 24.26, 23.78, 24.66, 24.02, 23.53, 23.79, 24.37, 23.81, 23.17, 23.66, 24.56, 23.49, 24.97, 24.84, 23.65, 23.69, 24.3, 24.06, 23.77, 24.15],
  'monthly-grow': [72.21, 62.87, 55.44, 51.68, 49.16, 49.61, 52.71, 58.96, 69.31, 89.94, 89.89, 89.73, 89.7, 90.13, 89.68, 90.09, 89.9, 90.09, 90.2, 90.27, 89.7, 90.02, 90.27, 89.69, 89.99, 90.06, 90.09, 90.27, 89.94, 90.18, 89.89, 90.39, 90.09, 90.03, 89.83, 90.1],
};
/** The averaged month-by-month catch of one setting, in per cent. */
export const curveOf = (review, mode) => CURVES[curveKey(review, mode)];
/** A year's catch (0, 1, 2) from a month-by-month curve: every month has the same fifty rigged contracts, so it is the mean. */
export const yearOf = (curve, y) => curve.slice(12 * y, 12 * y + 12).reduce((a, b) => a + b, 0) / 12;

/** The other figure the text quotes, in whole per cent over RUNS runs (checked in test/redqueen.test.js). */
export const NUMBERS = {
  onFirstThree: { 1: 80, 12: 7 }, // share of rigged contracts on the three red flags reviewed first, reviews never moved
  onReviewedYear3: { monthly: 27 }, // share of year three's rigged contracts carrying a reviewed flag, reviews moved monthly
};

const startMix = () => Array.from({ length: P }, (_, i) => (i < CHECKS ? PARAMS.start / CHECKS : (1 - PARAMS.start) / (P - CHECKS)));

/**
 * One run of 36 months.
 * @param {object} o
 * @param {string|number} [o.review] how often the reviews move: 'never' | 'yearly' | 'quarterly' | 'monthly', or months
 *   between moves
 * @param {boolean} [o.random] one of the three reviews drawn at random each month from the other red flags
 * @param {boolean} [o.grow] each move adds a review on the worst unreviewed red flag and never drops one
 * @returns {{ n: number[], checked: number[], caught: number, lost: number }[]} one entry a month: rigged contracts by
 *   red flag, the red flags reviewed, and the rigged contracts caught and let through
 */
export function simulate({ review = 'yearly', random = false, grow = false, seed = SEED, months = MONTHS } = {}) {
  const every = typeof review === 'number' ? review : EVERY[review];
  const { learn, innovate, seen } = PARAMS;
  const rng = makeRng(seed);
  let mix = startMix();
  let known = Array(P).fill(0);
  // The team starts with the red flags seen most (with a random review, the two seen most).
  let checked = random ? [0, 1] : [0, 1, 2];
  const out = [];
  for (let m = 0; m < months; m++) {
    if (every && m > 0 && m % every === 0) {
      if (grow) {
        const worst = known
          .map((v, i) => [v, i])
          .filter(([, i]) => !checked.includes(i))
          .sort((a, b) => b[0] - a[0]);
        if (worst.length) checked = [...checked, worst[0][1]];
      } else {
        // The latest month's findings, worst first (a tiny random nudge breaks ties).
        const order = known
          .map((v, i) => [v + rng() * 1e-6, i])
          .sort((a, b) => b[0] - a[0])
          .map((x) => x[1]);
        checked = order.slice(0, random ? CHECKS - 1 : CHECKS);
      }
    }
    known = Array(P).fill(0);
    const thisMonth = [...checked];
    if (random) {
      const rest = [...Array(P).keys()].filter((i) => !thisMonth.includes(i));
      thisMonth.push(rest[Math.floor(rng() * rest.length)]);
    }
    const isChecked = Array(P).fill(false);
    thisMonth.forEach((c) => (isChecked[c] = true));
    // The month's rigged contracts, spread over the red flags by the schemes' current mix.
    const n = Array(P).fill(0);
    for (let a = 0; a < ATTEMPTS; a++) {
      let r = rng();
      let i = 0;
      while (i < P - 1 && r > mix[i]) {
        r -= mix[i];
        i++;
      }
      n[i]++;
    }
    let caught = 0;
    let lost = 0;
    for (let i = 0; i < P; i++)
      for (let k = 0; k < n[i]; k++) {
        if (isChecked[i] && rng() < CATCH) {
          caught++;
          known[i]++;
        } else {
          lost++;
          known[i] += seen;
        }
      }
    // What got through is used again and copied on other projects, what was caught is dropped, and a few try
    // something new.
    const success = isChecked.map((c) => (c ? 1 - CATCH : 1));
    const avg = mix.reduce((s, w, i) => s + w * success[i], 0);
    mix = mix.map((w, i) => w * (1 + (learn * (success[i] - avg)) / Math.max(avg, 1e-9)));
    const total = mix.reduce((a, b) => a + b, 0);
    mix = mix.map((w) => (1 - innovate) * (w / total) + innovate / P);
    out.push({ n, checked: thisMonth.sort((a, b) => a - b), caught, lost });
  }
  return out;
}

/** Share of rigged contracts caught over months [from, to) of a run. */
export function caughtShare(run, from = 0, to = run.length) {
  let c = 0;
  let a = 0;
  for (let m = from; m < to; m++) {
    c += run[m].caught;
    a += run[m].caught + run[m].lost;
  }
  return a ? c / a : 0;
}

/** First month, each year, and the whole three years, for one run. */
export function summary(run) {
  return {
    first: caughtShare(run, 0, 1),
    years: [0, 1, 2].map((y) => caughtShare(run, 12 * y, 12 * y + 12)),
    all: caughtShare(run),
    caughtFirst: run[0].caught,
    caughtYear3: run.slice(24, 36).reduce((s, m) => s + m.caught, 0),
  };
}

/** Averages over many runs (seeds 1 … runs) of one setting, with the month-by-month catch. */
export function average(opts = {}, runs = RUNS) {
  const curve = Array(MONTHS).fill(0);
  let first = 0;
  const years = [0, 0, 0];
  let all = 0;
  let checks = 0;
  for (let s = 1; s <= runs; s++) {
    const run = simulate({ ...opts, seed: s });
    const r = summary(run);
    first += r.first / runs;
    r.years.forEach((v, y) => (years[y] += v / runs));
    all += r.all / runs;
    checks += run[MONTHS - 1].checked.length / runs;
    run.forEach((m, i) => (curve[i] += m.caught / (m.caught + m.lost) / runs));
  }
  return { first, years, all, checks, curve };
}

/** Share of the month's rigged contracts on the three red flags seen most at the start. */
export const onFirstThree = (month) => (month.n[0] + month.n[1] + month.n[2]) / ATTEMPTS;

/** Share of the rigged contracts over months [from, to) of a run that carry a red flag reviewed that month. */
export function onReviewed(run, from = 0, to = run.length) {
  let met = 0;
  for (let m = from; m < to; m++) met += run[m].checked.reduce((s, p) => s + run[m].n[p], 0);
  return met / ((to - from) * ATTEMPTS);
}

/** The month (1–36) from which every red flag is reviewed in the growing chain, or 0 if that never happens. */
export function allCheckedFrom(review) {
  const run = simulate({ review, grow: true });
  return run.findIndex((m) => m.checked.length === P) + 1;
}

/** Everything the chapter quotes, averaged over RUNS runs: every setting in CURVES, and where the schemes drift. */
export function study(runs = RUNS) {
  const out = {};
  for (const review of ['never', 'yearly', 'monthly'])
    for (const mode of MODES) {
      const key = curveKey(review, mode);
      if (!out[key]) out[key] = average({ review, random: mode === 'random', grow: mode === 'grow' }, runs);
    }
  // Where the rigged contracts sit, month by month, when the reviews never move.
  const drift = Array(MONTHS).fill(0);
  for (let s = 1; s <= runs; s++) simulate({ review: 'never', seed: s }).forEach((m, i) => (drift[i] += onFirstThree(m) / runs));
  out.drift = drift;
  // How much of year three's rigged contracts the reviews even meet, moved monthly: the chase spreads the schemes thin.
  let met = 0;
  for (let s = 1; s <= runs; s++) met += onReviewed(simulate({ review: 'monthly', seed: s }), 24, 36) / runs;
  out.onReviewedMonthly = met;
  return out;
}
