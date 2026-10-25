// Running to stand still: checks that are reviewed, against attempts that learn.
//
// Twelve patterns (ways round a development lender's payment checks). Each month 50 attempts are
// spread over the patterns by the other side's current mix. The compliance team checks three
// patterns; an attempt on a checked pattern is stopped nine times in ten, one on an unchecked
// pattern gets through. The team learns of every catch and of half the attempts that got
// through (found later), and at each review moves its checks to the three patterns with the most
// found in the latest month. The other side copies what works: next month's mix moves towards
// the patterns that paid (a replicator step), and a small share always tries something new.
//
// Two loops race: the other side's turns every month, the bank's at each review.
//
// Variants: the checks reviewed never, every year, quarter or month (the chapter offers never,
// yearly and monthly); one of the three checks drawn at random each month (two follow the review);
// and the growing chain, where each review adds the worst unchecked pattern and never drops a check.
import { makeRng } from './rng.js';

/** The twelve patterns, the three in use most first. */
export const PATTERNS = [
  'Changed account',
  'Lookalike invoice',
  'Split payment',
  'Third country',
  'New intermediary',
  'Inflated invoice',
  'Duplicate invoice',
  'Shell supplier',
  'Hidden owner',
  'Fake guarantee',
  'False origin',
  'Spoofed approver',
];
export const P = PATTERNS.length;
export const CHECKS = 3;
/** A check stops this share of the attempts on its pattern. */
export const CATCH = 0.9;
export const ATTEMPTS = 50;
export const MONTHS = 36;
/** How fast the other side copies what works; the share that tries something new each month;
 *  the share of attempts that got through that the bank finds out about; the share of attempts
 *  on the three patterns in use most at the start. */
export const PARAMS = { learn: 0.5, innovate: 0.03, seen: 0.5, start: 0.8 };
/** Months between reviews (0: never). */
export const EVERY = { never: 0, yearly: 12, quarterly: 3, monthly: 1 };
/** The run in the figure (close to the average run in every setting), and the runs behind the averages the text quotes. */
export const SEED = 159;
export const RUNS = 400;

/** What the checks do between reviews: all three follow the review; one of them is drawn at random each month; or
 *  each review adds a check and none is dropped (the growing chain). */
export const MODES = ['review', 'random', 'grow'];
/** The setting's name in CURVES (with no reviews, nothing is ever added, so 'never-grow' is 'never'). */
export const curveKey = (review = 'yearly', mode = 'review') => (mode === 'review' || (mode === 'grow' && review === 'never') ? review : `${review}-${mode}`);

/**
 * The share of the month's attempts caught, in per cent to one decimal, month by month, averaged over RUNS runs of
 * every setting the chapter offers: worked out once by `average()` and checked against it in test/redqueen.test.js,
 * so the page does not rerun 3,200 runs. Every number the chapter quotes about the catch comes from these.
 */
export const CURVES = {
  never: [72.2, 48.4, 28.5, 16.5, 9.9, 5.9, 4, 2.7, 2, 1.7, 1.6, 1.6, 1.5, 1.5, 1.5, 1.5, 1.4, 1.5, 1.5, 1.4, 1.5, 1.4, 1.5, 1.4, 1.4, 1.5, 1.5, 1.5, 1.4, 1.4, 1.6, 1.5, 1.4, 1.5, 1.4, 1.5],
  'never-random': [52.4, 34.5, 23.2, 17.7, 15.2, 11.1, 10.8, 9.3, 10, 10.3, 9.8, 11.3, 10.2, 9.9, 10.5, 10.1, 10.4, 9.8, 9.8, 9.8, 10.5, 10.2, 10, 10.3, 10, 9.9, 9.3, 9.5, 10, 10.6, 10.7, 9.9, 9.4, 10, 9.7, 9.6],
  yearly: [72.2, 48.4, 28.5, 16.5, 9.9, 5.9, 4, 2.7, 2, 1.7, 1.6, 1.6, 29.3, 16.6, 9.8, 6.4, 3.9, 2.9, 2.2, 1.7, 1.6, 1.5, 1.6, 1.4, 39.9, 23.3, 13.4, 8.2, 5.2, 3.4, 2.3, 2.2, 1.7, 1.6, 1.4, 1.5],
  'yearly-random': [52.4, 34.5, 23.2, 17.7, 15.2, 11.1, 10.8, 9.3, 10, 10.3, 9.8, 11.3, 44.8, 29.9, 21.4, 15.4, 12.7, 11.2, 10.6, 10.7, 10, 10.2, 10, 10.2, 37.2, 25.4, 18, 14.1, 12.4, 11.7, 10.3, 10.3, 10.1, 10.4, 10.1, 10],
  'yearly-grow': [72.2, 48.4, 28.5, 16.5, 9.9, 5.9, 4, 2.7, 2, 1.7, 1.6, 1.6, 11.1, 7, 4.7, 3.6, 2.7, 2.5, 2.1, 2, 2, 2, 1.9, 1.8, 13.1, 8.1, 5.4, 4.2, 3.2, 2.9, 2.7, 2.6, 2.5, 2.4, 2.4, 2.5],
  monthly: [72.2, 47.9, 28.6, 18.7, 18.9, 22.4, 24.2, 25.7, 28.9, 30.5, 29.6, 27.3, 26.4, 25.9, 26.6, 26.4, 27.7, 28, 28.3, 27.1, 27.1, 27.5, 26.7, 27.2, 26.8, 27.7, 27.4, 26.9, 27, 26.9, 27.3, 26.9, 27, 27.1, 27.6, 27.6],
  'monthly-random': [52.4, 36, 47, 36, 28.6, 24.7, 23.1, 25, 25.2, 26.9, 27.4, 28.3, 26.9, 26.7, 26.7, 26.9, 26, 25.8, 27.6, 26.9, 26.3, 27.9, 26.8, 27.4, 26.4, 26.1, 27, 26.7, 26.7, 26.6, 26.6, 26.7, 27.7, 25.9, 26.4, 26.4],
  'monthly-grow': [72.2, 52.9, 39.3, 33.2, 31.4, 33.3, 37.2, 46, 58.8, 90, 89.6, 89.9, 90, 89.7, 90, 90.1, 90.3, 90, 90.1, 90.4, 90.2, 89.5, 90.1, 89.7, 90.2, 89.8, 90.1, 90.2, 89.9, 89.7, 90.2, 90, 90.1, 89.9, 90.1, 89.8],
};
/** The averaged month-by-month catch of one setting, in per cent. */
export const curveOf = (review, mode) => CURVES[curveKey(review, mode)];
/** A year's catch (0, 1, 2) from a month-by-month curve: every month has the same fifty attempts, so it is the mean. */
export const yearOf = (curve, y) => curve.slice(12 * y, 12 * y + 12).reduce((a, b) => a + b, 0) / 12;

/** The other figure the text quotes, in whole per cent over RUNS runs (checked in test/redqueen.test.js). */
export const NUMBERS = {
  onFirstThree: { 1: 80, 6: 7 }, // share of attempts on the three patterns checked first, checks never moved
};

const startMix = () => Array.from({ length: P }, (_, i) => (i < CHECKS ? PARAMS.start / CHECKS : (1 - PARAMS.start) / (P - CHECKS)));

/**
 * One run of 36 months.
 * @param {object} o
 * @param {string|number} [o.review] 'never' | 'yearly' | 'quarterly' | 'monthly', or months between reviews
 * @param {boolean} [o.random] one of the three checks drawn at random each month from the other patterns
 * @param {boolean} [o.grow] each review adds a check on the worst unchecked pattern and never drops one
 * @returns {{ n: number[], checked: number[], caught: number, lost: number }[]} one entry a month
 */
export function simulate({ review = 'yearly', random = false, grow = false, seed = SEED, months = MONTHS } = {}) {
  const every = typeof review === 'number' ? review : EVERY[review];
  const { learn, innovate, seen } = PARAMS;
  const rng = makeRng(seed);
  let mix = startMix();
  let known = Array(P).fill(0);
  // The team starts with the patterns in use most (with a random check, the two in use most).
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
    // The month's attempts, spread over the patterns by the current mix.
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
    // The other side copies what works, and a few try something new.
    const success = isChecked.map((c) => (c ? 1 - CATCH : 1));
    const avg = mix.reduce((s, w, i) => s + w * success[i], 0);
    mix = mix.map((w, i) => w * (1 + (learn * (success[i] - avg)) / Math.max(avg, 1e-9)));
    const total = mix.reduce((a, b) => a + b, 0);
    mix = mix.map((w) => (1 - innovate) * (w / total) + innovate / P);
    out.push({ n, checked: thisMonth.sort((a, b) => a - b), caught, lost });
  }
  return out;
}

/** Share of attempts caught over months [from, to) of a run. */
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

/** Share of the month's attempts on the three patterns in use most at the start. */
export const onFirstThree = (month) => (month.n[0] + month.n[1] + month.n[2]) / ATTEMPTS;

/** The month (1–36) from which every pattern is checked in the growing chain, or 0 if that never happens. */
export function allCheckedFrom(review) {
  const run = simulate({ review, grow: true });
  return run.findIndex((m) => m.checked.length === P) + 1;
}

/** Everything the chapter quotes, averaged over RUNS runs: every setting in CURVES, and where the attempts drift. */
export function study(runs = RUNS) {
  const out = {};
  for (const review of ['never', 'yearly', 'monthly'])
    for (const mode of MODES) {
      const key = curveKey(review, mode);
      if (!out[key]) out[key] = average({ review, random: mode === 'random', grow: mode === 'grow' }, runs);
    }
  // Where the attempts sit, month by month, when the checks never move.
  const drift = Array(MONTHS).fill(0);
  for (let s = 1; s <= runs; s++) simulate({ review: 'never', seed: s }).forEach((m, i) => (drift[i] += onFirstThree(m) / runs));
  out.drift = drift;
  return out;
}
