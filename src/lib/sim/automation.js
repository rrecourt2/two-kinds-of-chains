// The irony of the reliable machine (chapter “The irony of the reliable machine”).
//
// A development lender screens about 200 payments a working day. A system screens a share of them and gets 1 in
// 1,000 wrong; people screen the rest and, in practice, get 1 in 100 wrong. A few days a year the system fails, and
// people screen every payment that day by hand. Their skill s (0 to 1) sets their mistakes on such a day:
// 1% + 9% × (1 − s) of the payments. A whole day by hand — a failure, or a practice day on which the system screens
// behind them — brings s back to 1. After it, s fades (time constant two months) toward a floor that the share
// they screen every day keeps up: full practice at 30% or more, proportionally less below. Day 0 is go-live; until
// then people screened everything, so they start in full practice. Mistakes are expected numbers.
import { makeRng, exponential } from './rng.js';

export const PARAMS = {
  perDay: 200,
  monthDays: 21,
  months: 36,
  errSystem: 0.001,
  errPractised: 0.01,
  errRusty: 0.1,
  fullShare: 0.3, // screening this share by hand every day keeps people in full practice
  fadeMonths: 2, // time constant of the fade after a whole day by hand
  failsPerYear: 3,
  seed: 157, // seven failures in three years, the first a month after go-live
};
/** The board's limit for a day the system fails, and the share the system must screen. */
export const LIMIT = 10;
export const TARGET = 0.9;
/** Working days between practice days. */
export const PRACTICE = { none: 0, quarter: 3 * PARAMS.monthDays, month: PARAMS.monthDays };
export const DAYS = PARAMS.months * PARAMS.monthDays;
export const YEAR = 12 * PARAMS.monthDays;
const EPS = 1e-9;

/** The working days on which the system fails: a seeded Poisson process, about three a year. */
export function failureDays(seed = PARAMS.seed, p = PARAMS) {
  const rng = makeRng(seed);
  const days = p.months * p.monthDays;
  const mean = (12 * p.monthDays) / p.failsPerYear;
  const out = [];
  for (let t = exponential(rng, mean); t < days; t += exponential(rng, mean)) {
    const d = Math.floor(t);
    if (!out.includes(d)) out.push(d);
  }
  return out;
}
export const FAILS = failureDays();

/** The skill that the daily share by hand keeps up on its own. */
export const floorSkill = (auto, p = PARAMS) => Math.min(1, (1 - auto) / p.fullShare);

/** People's share of mistakes on a day they screen everything, at skill s. */
export const errorRate = (s, p = PARAMS) => p.errPractised + (p.errRusty - p.errPractised) * (1 - s);

/** Expected mistakes on a normal day (practice days included: the system screens behind people). */
export const normalDay = (auto, p = PARAMS) => p.perDay * (auto * p.errSystem + (1 - auto) * p.errPractised);

/**
 * Three years from go-live. `auto` is the share the system screens (0 to 0.99); `practice` is 'none', 'quarter'
 * or 'month'. Returns, for every working day, the mistakes people would make if the system failed that morning
 * (`curve`), the days it did fail with their mistakes, the practice days, and the totals the chapter quotes.
 */
export function run(auto, practice = 'none', fails = FAILS, p = PARAMS) {
  const days = p.months * p.monthDays;
  const floor = floorSkill(auto, p);
  const every = PRACTICE[practice] ?? 0;
  const failSet = new Set(fails);
  const curve = new Float64Array(days);
  const failed = [];
  const practiceDays = [];
  let last = 0; // the last whole day by hand: go-live, a failure or a practice day
  for (let d = 0; d < days; d++) {
    const s = floor + (1 - floor) * Math.exp(-(d - last) / (p.fadeMonths * p.monthDays));
    curve[d] = p.perDay * errorRate(s, p);
    const practising = every > 0 && d > 0 && d % every === 0;
    if (practising) practiceDays.push(d);
    // With nothing automated there is no system to fail.
    if (failSet.has(d) && auto > 0) failed.push({ day: d, mistakes: curve[d] });
    if (practising || (failSet.has(d) && auto > 0)) last = d;
  }
  const perNormalDay = normalDay(auto, p);
  const failTotal = failed.reduce((a, f) => a + f.mistakes, 0);
  const worstAny = auto > 0 ? Math.max(...curve) : 0;
  const worstFailed = failed.length ? Math.max(...failed.map((f) => f.mistakes)) : 0;
  return {
    auto,
    practice,
    curve,
    failed,
    practiceDays,
    perNormalDay,
    normalYear: perNormalDay * 12 * p.monthDays,
    normalTotal: perNormalDay * (days - failed.length),
    failTotal,
    worstAny,
    worstFailed,
    floor,
  };
}

/** The puzzle's two checks. */
export const automatedEnough = (auto) => auto >= TARGET - EPS;
export const failureDayOk = (r) => r.worstAny < LIMIT;
export const solves = (auto, practice) => automatedEnough(auto) && failureDayOk(run(auto, practice));
