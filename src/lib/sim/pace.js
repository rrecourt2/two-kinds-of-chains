// How fast to forget: twenty countries, forty years, and a lender that sets each country's limit from the losses it
// remembers.
//
// The world: each country's true risk (its long-run loss rate, % of the loan a year) sits on a ladder of 1, 2, 4 and
// 8%. Now and then it changes: a crisis moves it one rung up (the risk doubles), a reform one rung down (it halves).
// How often is the setting "Countries change": about once in 40 years, once a decade, or once in three years. Every
// year's losses are noisy, and one year in ten is a bad year with four times the usual losses: noise, not a change.
// The bad years are part of the risk, so a normal year's losses sit a little below it (a 1% country loses about 0.77%
// in a normal year and about 3.1% in a bad one).
//
// The lender: it remembers the last `memory` years of losses in each country and averages them. The limit it holds
// follows that average: the full limit at 1% or less, nothing at 8% or more, a third of the full limit less for each
// doubling in between (2% -> two thirds, 4% -> one third).
//
// The cost, against the limits it would hold if it knew each country's true risk:
//   - losses: lending more than that, into a country riskier than it believed, loses the country's loss rate on the
//     extra lending;
//   - good lending missed: lending less than that, in a country safer than it believed, gives up what the lending
//     would bring (VALUE, % a year: its margin and its development return), twice as much in the year just after a
//     bad year, when the country needs the money most.
// Each country's full limit is $100m; costs are in $m a year across the twenty countries, averaged over forty years
// and over many histories.
import { makeRng, normal } from './rng.js';

/** The ladder of true risk, % of the loan lost a year in the long run. */
export const RISKS = [1, 2, 4, 8];
/** "Countries change": a change about once in this many years, in each country. */
export const WORLDS = { rarely: 40, sometimes: 10, often: 3 };
/** The slider: years the lender remembers. */
export const MEMORIES = Array.from({ length: 20 }, (_, i) => i + 1);
export const YEARS = 40;
/** Years of history before the forty shown, so every memory starts full. */
export const BURN = 20;
export const COUNTRIES = 20;
/** Yearly noise (log scale), and the bad years: one in `badEvery`, with `badTimes` the usual losses. */
export const PARAMS = { noise: 0.4, badEvery: 10, badTimes: 4 };
/** A country's full limit, $m. */
export const LIMIT = 100;
/** What a year of good lending brings, % of the amount (margin and development return). */
export const VALUE = 4;
/** Lending missed in the year just after a bad year counts this many times. */
export const AFTER_BAD = 2;
/** Histories of twenty countries the tables average over. */
export const HISTORIES = 1000;
/** The puzzle accepts a memory whose total cost is within this share of the lowest. */
export const TOLERANCE = 0.01;

const NORMAL = 1 / (1 - 1 / PARAMS.badEvery + PARAMS.badTimes / PARAMS.badEvery);
const LO = Math.log(RISKS[0]);
const HI = Math.log(RISKS.at(-1));

/** The share of the full limit held for a remembered average loss of `b` % a year. */
export const limit = (b) => Math.max(0, Math.min(1, (HI - Math.log(Math.max(b, 1e-9))) / (HI - LO)));

/** One country's history, BURN + YEARS years, drawn from `rng` (or a seed) in a world where it changes once in `every` years. */
export function country(rng, every = WORLDS.sometimes) {
  if (typeof rng === 'number') rng = makeRng(rng);
  const T = BURN + YEARS;
  const risk = new Float64Array(T);
  const loss = new Float64Array(T);
  const bad = new Uint8Array(T);
  const change = new Int8Array(T);
  let r = Math.floor(rng() * RISKS.length);
  for (let t = 0; t < T; t++) {
    if (t > 0 && rng() < 1 / every) {
      let d = rng() < 0.5 ? -1 : 1;
      if (r + d < 0 || r + d >= RISKS.length) d = -d;
      r += d;
      change[t] = d;
    }
    risk[t] = RISKS[r];
    bad[t] = rng() < 1 / PARAMS.badEvery ? 1 : 0;
    const n = PARAMS.noise;
    loss[t] = risk[t] * NORMAL * Math.exp(n * normal(rng) - (n * n) / 2) * (bad[t] ? PARAMS.badTimes : 1);
  }
  return { risk, loss, bad, change };
}

/**
 * The lender with a given memory, over the forty scored years of one country. `losses`, `missed` and `afterBad` (the
 * part of `missed` in years just after a bad year, counted double) are in $m over the forty years. With `path`, one
 * entry per scored year: the true risk, the year's losses, whether it was a bad year or a change, the average
 * remembered, and the shares of the full limit held and called for by the true risk.
 */
export function lend(c, memory, { path = false } = {}) {
  const T = c.risk.length;
  let sum = memory * c.risk[0]; // before the first year it remembers the country as it was
  let losses = 0;
  let missed = 0;
  let afterBad = 0;
  const out = path ? [] : null;
  for (let t = 0; t < T; t++) {
    const belief = sum / memory;
    const held = limit(belief);
    const right = limit(c.risk[t]);
    if (t >= BURN) {
      if (held > right) losses += (held - right) * LIMIT * (c.risk[t] / 100);
      else if (right > held) {
        const after = c.bad[t - 1] === 1;
        const m = (right - held) * LIMIT * (VALUE / 100) * (after ? AFTER_BAD : 1);
        missed += m;
        if (after) afterBad += m;
      }
      out?.push({ year: t - BURN + 1, risk: c.risk[t], loss: c.loss[t], bad: c.bad[t] === 1, change: c.change[t], belief, held, right });
    }
    sum += c.loss[t] - (t - memory >= 0 ? c.loss[t - memory] : c.risk[0]);
  }
  return { losses, missed, afterBad, total: losses + missed, path: out };
}

/** Averages for every memory in one world: $m a year across twenty countries, over `histories` histories. */
export function table(world = 'sometimes', { histories = HISTORIES, memories = MEMORIES } = {}) {
  const every = WORLDS[world];
  const rows = memories.map((memory) => ({ memory, losses: 0, missed: 0, afterBad: 0 }));
  const scale = 1 / (histories * YEARS);
  for (let s = 1; s <= histories; s++) {
    const rng = makeRng(s * 7919 + every);
    for (let k = 0; k < COUNTRIES; k++) {
      const c = country(rng, every);
      for (const row of rows) {
        const r = lend(c, row.memory);
        row.losses += r.losses * scale;
        row.missed += r.missed * scale;
        row.afterBad += r.afterBad * scale;
      }
    }
  }
  return rows.map((r) => ({ ...r, total: r.losses + r.missed }));
}

// The tables, worked out by table() for each world and rounded to $1,000 (test/pace.test.js recomputes them):
// [losses, good lending missed, of which just after a bad year], $m a year, for memories of 1 to 20 years.
const TABLES = {
  rarely: [
    [11.274, 6.814, 5.472], [8.829, 6.127, 3.781], [7.619, 5.659, 2.902], [6.845, 5.318, 2.39], [6.304, 5.07, 2.065],
    [5.912, 4.894, 1.842], [5.621, 4.771, 1.682], [5.404, 4.693, 1.567], [5.24, 4.644, 1.478], [5.115, 4.622, 1.411],
    [5.021, 4.619, 1.358], [4.953, 4.629, 1.314], [4.905, 4.652, 1.279], [4.872, 4.686, 1.253], [4.852, 4.727, 1.232],
    [4.841, 4.776, 1.216], [4.838, 4.83, 1.203], [4.842, 4.889, 1.194], [4.852, 4.95, 1.186], [4.868, 5.015, 1.183],
  ],
  sometimes: [
    [11.771, 7.389, 5.61], [9.622, 6.973, 3.963], [8.694, 6.792, 3.136], [8.184, 6.737, 2.671], [7.904, 6.78, 2.389],
    [7.757, 6.882, 2.211], [7.696, 7.024, 2.097], [7.696, 7.198, 2.025], [7.737, 7.387, 1.98], [7.802, 7.582, 1.946],
    [7.884, 7.781, 1.926], [7.981, 7.981, 1.916], [8.083, 8.181, 1.912], [8.19, 8.379, 1.915], [8.298, 8.573, 1.923],
    [8.408, 8.766, 1.936], [8.519, 8.953, 1.95], [8.628, 9.136, 1.964], [8.736, 9.314, 1.98], [8.841, 9.49, 1.997],
  ],
  often: [
    [13.951, 8.62, 5.607], [12.216, 8.857, 4.16], [11.677, 9.266, 3.498], [11.503, 9.724, 3.16], [11.49, 10.187, 2.977],
    [11.545, 10.628, 2.876], [11.63, 11.037, 2.817], [11.727, 11.415, 2.785], [11.83, 11.759, 2.769], [11.931, 12.067, 2.759],
    [12.028, 12.346, 2.756], [12.119, 12.602, 2.76], [12.201, 12.833, 2.764], [12.272, 13.042, 2.768], [12.338, 13.234, 2.776],
    [12.398, 13.41, 2.785], [12.451, 13.572, 2.793], [12.499, 13.721, 2.802], [12.539, 13.86, 2.812], [12.573, 13.989, 2.82],
  ],
};

/** The table for one world, as rows. */
export const rows = (world = 'sometimes') =>
  TABLES[world].map(([losses, missed, afterBad], i) => ({ memory: MEMORIES[i], losses, missed, afterBad, total: losses + missed }));

/** The memory with the lowest total cost in a table. */
export const best = (rs) => rs.reduce((a, b) => (b.total < a.total ? b : a));

/** The memories whose total cost is within TOLERANCE of the lowest. */
export const band = (rs) => {
  const low = best(rs).total;
  return rs.filter((r) => r.total <= low * (1 + TOLERANCE)).map((r) => r.memory);
};

/** The country the figure shows in each world (a seed for country()). */
export const FIGURE = { rarely: 50150, sometimes: 175939, often: 37867 };

/** The figure's country in a world, and the lender's path through it at every memory. */
export function figure(world = 'sometimes') {
  const c = country(FIGURE[world], WORLDS[world]);
  return MEMORIES.map((m) => lend(c, m, { path: true }));
}

/** The raw tables, for the test that recomputes them. */
export const TABLE_DATA = TABLES;
