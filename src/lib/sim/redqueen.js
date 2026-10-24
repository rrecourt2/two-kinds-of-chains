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
// Variants: the checks reviewed never, every year, quarter or month; one of the three checks drawn
// at random each month (two follow the review); and the growing chain, where each review adds the
// worst unchecked pattern and never drops a check.
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

/**
 * The averages the chapter's text quotes, in whole per cent, over RUNS runs: worked out once by
 * `study()` and checked against it in test/redqueen.test.js, so the page does not rerun 3,600 runs.
 */
export const NUMBERS = {
  first: 72, // caught in the first month (no review has happened yet)
  firstRandom: 52, // the same with one of the three checks drawn at random
  year3: { never: 1, yearly: 9, quarterly: 24, monthly: 27 },
  year3Random: { never: 10, yearly: 15, monthly: 27 },
  grow: 76, // quarterly reviews that add a check and never drop one
  growChecks: 12, // checks every payment passes by month 36 in the growing chain
  onFirstThree: { 1: 80, 6: 7, 12: 2 }, // share of attempts on the three patterns checked first, checks never moved
  yearlyMonth: { 12: 2, 13: 29, 18: 3, 25: 40, 30: 3 }, // caught by month with yearly reviews (reviews open months 13 and 25)
  monthlyBest: 31, // the best month after the third with monthly reviews
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

/** Everything the chapter's text quotes, averaged over RUNS runs. */
export function study(runs = RUNS) {
  const at = (opts) => average(opts, runs);
  const never = at({ review: 'never' });
  const yearly = at({ review: 'yearly' });
  // Where the attempts sit, month by month, when the checks never move.
  const drift = Array(MONTHS).fill(0);
  for (let s = 1; s <= runs; s++) simulate({ review: 'never', seed: s }).forEach((m, i) => (drift[i] += onFirstThree(m) / runs));
  return {
    never,
    yearly,
    quarterly: at({ review: 'quarterly' }),
    monthly: at({ review: 'monthly' }),
    neverRandom: at({ review: 'never', random: true }),
    yearlyRandom: at({ review: 'yearly', random: true }),
    monthlyRandom: at({ review: 'monthly', random: true }),
    grow: at({ review: 'quarterly', grow: true }),
    drift,
  };
}
