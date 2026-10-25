// Many short chains: one big programme against small pilots first.
//
// A development lender has a budget of 100 for a new kind of programme. There are many possible
// approaches, and nobody can tell in advance how well any of them will work. Each approach's
// value per unit of money is lognormal with a median of 1 (a typical approach returns what it
// costs) and a spread sigma: how unpredictable results are.
//
// One big programme puts all 100 into one approach. With n pilots (n ≥ 2), each pilot costs 2 and
// earns nothing itself; it reads its approach's value roughly (a lognormal error with spread
// 0.5), and the remaining 100 − 2n goes into the approach whose pilot read best.
//
// The same 1,000 futures serve every setting: each holds thirty approaches and thirty pilot
// readings, and n pilots try the first n of them, so moving the slider changes the plan, never
// the world. Each column of draws is spread evenly over the normal distribution and shuffled
// (Latin hypercube sampling), so one big programme's typical result is 100 to within a thousandth.

import { makeRng, quantile, median } from './rng.js';

export const BUDGET = 100;
export const PILOT = 2;
export const READ = 0.5;
export const FUTURES = 1000;
export const MAX_PILOTS = 30;
export const SEED = 468;
export const TARGET = { typical: 200, worst: 100 };

export const WORLDS = [
  { id: 'predictable', label: 'Predictable', sigma: 0.15 },
  { id: 'unpredictable', label: 'Unpredictable', sigma: 0.8 },
  { id: 'wild', label: 'Wild', sigma: 1.4 },
];
export const PUZZLE_WORLD = 'unpredictable';
// The future the card opens: one of the 1,000, the same at every setting. In it, from ten pilots on, a pilot
// whose approach is worth less than another's reads best.
export const OPENED = 1;

/** The inverse of the standard normal distribution (Acklam's approximation, error below 1e-9). */
export function invNorm(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const tail = (q) => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function shuffle(values, rng) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/** The futures: quality[i][f] is approach i's value in future f, in standard units; error[i][f] its pilot's misreading. */
export function futures(seed = SEED, count = FUTURES, approaches = MAX_PILOTS) {
  const rng = makeRng(seed);
  const even = Array.from({ length: count }, (_, k) => invNorm((k + 0.5) / count));
  const column = () => Float64Array.from(shuffle(even.slice(), rng));
  const quality = Array.from({ length: approaches }, column);
  const error = Array.from({ length: approaches }, column);
  return { quality, error, count, approaches };
}

/** What the budget returns in every future, with n pilots first (n = 1: one big programme, no pilots). */
export function results(world, n, sigma, { budget = BUDGET, pilot = PILOT, read = READ } = {}) {
  const { quality, error, count } = world;
  const out = new Float64Array(count);
  for (let f = 0; f < count; f++) {
    if (n <= 1) {
      out[f] = budget * Math.exp(sigma * quality[0][f]);
      continue;
    }
    let seenBest = -Infinity;
    let best = 0;
    for (let i = 0; i < n; i++) {
      const seen = sigma * quality[i][f] + read * error[i][f];
      if (seen > seenBest) {
        seenBest = seen;
        best = quality[i][f];
      }
    }
    out[f] = (budget - pilot * n) * Math.exp(sigma * best);
  }
  return out;
}

/** Typical (median), worst one in ten, best one in ten, average, and the share below the budget. */
export function summarize(values, budget = BUDGET) {
  let below = 0;
  let sum = 0;
  for (const v of values) {
    if (v < budget) below++;
    sum += v;
  }
  return {
    typical: median(values),
    worst: quantile(values, 0.1),
    best: quantile(values, 0.9),
    mean: sum / values.length,
    below: below / values.length,
  };
}

/** Every setting of one kind of world, worked out once: runs[n] for n = 1 … 30 (runs[0] unused). */
export function scene(sigma, world = futures()) {
  const runs = [null];
  for (let n = 1; n <= MAX_PILOTS; n++) {
    const values = results(world, n, sigma);
    runs.push({ n, values, ...summarize(values) });
  }
  let bestN = 1;
  for (let n = 2; n <= MAX_PILOTS; n++) if (runs[n].typical > runs[bestN].typical) bestN = n;
  return { sigma, runs, bestN };
}

/**
 * One future opened: what each pilot read of its approach and what the approach is really worth, per unit of
 * money (1 = returns what it costs); the pilot that read best, the approach truly worth most, what is left to
 * put behind the pick, and what the budget returns. n = 1 is one big programme on the first approach, untried.
 */
export function openFuture(n, sigma, f = OPENED, world = sharedFutures(), { budget = BUDGET, pilot = PILOT, read = READ } = {}) {
  const big = n <= 1;
  const pilots = Array.from({ length: big ? 1 : n }, (_, i) => ({
    n: i + 1,
    worth: Math.exp(sigma * world.quality[i][f]),
    read: big ? null : Math.exp(sigma * world.quality[i][f] + read * world.error[i][f]),
  }));
  const pick = big ? pilots[0] : pilots.reduce((a, b) => (b.read > a.read ? b : a));
  const best = pilots.reduce((a, b) => (b.worth > a.worth ? b : a));
  const rest = big ? budget : budget - pilot * n;
  return { n: big ? 1 : n, pilots, pick, best, rest, result: rest * pick.worth, spent: big ? 0 : pilot * n };
}

/** Which settings meet both checks of the puzzle. */
export const meets = (run) => run.typical >= TARGET.typical && run.worst >= TARGET.worst;

// The 1,000 futures every setting meets, made once.
let shared = null;
export function sharedFutures() {
  return (shared ??= futures());
}

// The chapter's three worlds, from the same 1,000 futures, computed on first use (a few milliseconds).
let cache = null;
export function scenes() {
  if (cache) return cache;
  const world = sharedFutures();
  cache = Object.fromEntries(WORLDS.map((w) => [w.id, scene(w.sigma, world)]));
  return cache;
}
