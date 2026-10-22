// Time to disbursement (chapter 14): many loans with the same conditions, each with its own luck.
//
// A signed loan cannot disburse until every condition precedent is met: one long AND.
// Each condition is delivered a log-normal number of working days after signing; some
// documents come back for correction and are delivered again; a condition that has an
// alternative can be closed by it after a fixed wait, once the substitute has arrived and
// a waiver has been signed off. The money moves a fixed few days after the last required
// condition is met.
//
// Every simulated loan draws its luck for all twelve conditions in the same order,
// whatever the settings, so a change of settings changes the rules, never the luck.

import { makeRng, normal } from './rng.js';

// Rows in the order they are drawn: the four that never move first, then the rest in
// reverse order of removal, so that the slider moves conditions off the bottom.
// `median`: typical working day of delivery, counted from signing (professional
// estimates, not sourced data). `after`: a condition that must be met first; delivery
// then counts from that day, and `median` includes it.
// `safeguard`: what stays before the money moves when the condition itself moves after it.
// Security registered may follow the money only with its filing package in hand first:
// evidence of filing and a letter from local counsel (or the registration itself, if sooner).
export const CONDITIONS = [
  { id: 'kyc', name: 'KYC checks', median: 7, fixed: true },
  { id: 'board', name: 'Board approval', median: 5, fixed: true, alt: 'a certified copy, originals to follow' },
  { id: 'signed', name: 'Security signed', median: 10, fixed: true },
  { id: 'opinion', name: 'Legal opinion', median: 12, fixed: true, after: 'signed' },
  { id: 'central', name: 'Central bank', median: 20 },
  { id: 'esap', name: 'ESAP actions', median: 15 },
  { id: 'permits', name: 'Permits', median: 30, alt: 'a regulator’s comfort letter, or evidence of a filed renewal' },
  { id: 'equity', name: 'Equity paid in', median: 15, alt: 'the sponsor’s commitment, backed by a bank guarantee or letter of credit' },
  { id: 'insurance', name: 'Insurance', median: 10, alt: 'the broker’s letter of undertaking' },
  { id: 'registered', name: 'Security registered', median: 35, after: 'signed', alt: 'evidence of filing and a letter from local counsel', safeguard: 'Filing evidence' },
  { id: 'hedging', name: 'Hedging', median: 25 },
  { id: 'agent', name: 'Process agent', median: 5 },
];

export const TOTAL = CONDITIONS.length;
export const MIN_BEFORE = CONDITIONS.filter((c) => c.fixed).length;
/** First to last, the order in which the slider moves conditions to after disbursement. */
export const REMOVAL_ORDER = CONDITIONS.filter((c) => !c.fixed)
  .map((c) => c.id)
  .reverse();

export const PARAMS = {
  // Log-normal spread of each delivery around its typical day: eight deliveries in ten
  // within about a fifth of it (predictable), or between half and twice it (unpredictable).
  sigma: { predictable: 0.15, unpredictable: 0.55 },
  returned: 0.15, // share of documents sent back for correction
  redo: 0.5, // a corrected document takes about half as long as the original did
  check: 3, // working days to check a document; for the last one, to check it and release the money
  wait: 20, // working days after signing before an alternative is asked for
  altDays: 5, // typical working days for the alternative to arrive and its waiver to be signed off
  filing: 10, // typical working days from signed security to evidence of filing
  loans: 2000,
  seed: 14,
};

/** The client's promise, and the puzzle's target: nine loans in ten disbursed within this many working days (about three months). */
export const TARGET = 60;
/** Credit policy's floor (an assumption of the model): at least this many conditions stay before the money moves. */
export const POLICY_BEFORE = 8;
/** The loan in the dot timeline: the same loan, with the same luck, under every setting. */
export const SAMPLE_LOAN = 56;

const index = Object.fromEntries(CONDITIONS.map((c, i) => [c.id, i]));
const clampBefore = (before) => Math.max(MIN_BEFORE, Math.min(TOTAL, Math.round(before)));

/** Ids of the conditions still required before the money moves, with `before` of them kept. */
export function requiredIds(before) {
  return CONDITIONS.slice(0, clampBefore(before)).map((c) => c.id);
}

// The luck of every loan, drawn once per seed: for each condition, standard normals for
// the first delivery, the corrected delivery, the alternative and the filing, and whether
// the document comes back.
const luckCache = new Map();
function luck(loans, seed, returned) {
  const key = `${loans}:${seed}:${returned}`;
  if (luckCache.has(key)) return luckCache.get(key);
  const n = loans * TOTAL;
  const L = { z1: new Float64Array(n), z2: new Float64Array(n), z3: new Float64Array(n), z4: new Float64Array(n), back: new Uint8Array(n) };
  for (let l = 0; l < loans; l++) {
    const rng = makeRng(seed * 100003 + l);
    for (let c = 0; c < TOTAL; c++) {
      const k = l * TOTAL + c;
      L.z1[k] = normal(rng);
      L.back[k] = rng() < returned ? 1 : 0;
      L.z2[k] = normal(rng);
      L.z3[k] = normal(rng);
      L.z4[k] = normal(rng);
    }
  }
  if (luckCache.size > 8) luckCache.clear();
  luckCache.set(key, L);
  return L;
}

// A chained condition's own typical time: its median from signing less its predecessor's.
const ownMedian = (c) => (c.after ? c.median - CONDITIONS[index[c.after]].median : c.median);
const draw = (median, sigma, z) => Math.max(1, Math.round(median * Math.exp(sigma * z)));

/**
 * One loan's conditions under the given rules. For every condition: the day the original
 * was first delivered, whether it came back, the day it was delivered in good order
 * (`good`), the day its alternative would be ready (`altReady`, where one exists), the day
 * it was met (`good`, or `altReady` if alternatives are accepted and it is sooner) and
 * whether the alternative closed it. Registration also carries `filed`, the day evidence of
 * filing exists (the security signed, then filed), and `altReady` is its filing package:
 * that evidence plus a letter from local counsel.
 */
function oneLoan(l, L, sigma, alternatives, p) {
  const out = new Array(TOTAL);
  for (let c = 0; c < TOTAL; c++) {
    const cond = CONDITIONS[c];
    const k = l * TOTAL + c;
    const m = ownMedian(cond);
    const start = cond.after ? out[index[cond.after]].met : 0;
    const first = start + draw(m, sigma, L.z1[k]);
    const back = L.back[k] === 1;
    const good = back ? first + p.check + draw(p.redo * m, sigma, L.z2[k]) : first;
    let met = good;
    let alt = false;
    let altReady = null;
    let filed = null;
    if (cond.alt) {
      // After the wait, the alternative is asked for; it arrives and its waiver is signed off
      // a few days later. Evidence of filing exists only once the signed security is filed.
      if (cond.after) filed = start + draw(p.filing, sigma, L.z4[k]);
      altReady = Math.max(p.wait, filed ?? 0) + draw(p.altDays, sigma, L.z3[k]);
      if (alternatives && good > altReady) {
        met = altReady;
        alt = true;
      }
    }
    out[c] = { id: cond.id, first, back, good, met, alt, altReady, filed };
  }
  return out;
}

/** Index used in `setBy` for a safeguard that set the date. */
export const SAFEGUARD = TOTAL;

/**
 * Simulate `loans` loans with the same conditions, each with its own luck.
 * before: conditions kept before the money moves (4–12); the rest become conditions subsequent.
 *   A condition with a safeguard that moves leaves the safeguard before the money moves,
 *   ready at the sooner of the condition itself and its package, whatever `alternatives` says.
 * alternatives: a late condition is met by its alternative where one exists.
 * predictable: the other parties' delivery times vary little (true) or a lot (false).
 * Returns each loan's working days from signing to disbursement, the index of the condition
 * that set each loan's date (SAFEGUARD for a safeguard), and the sample loan's conditions.
 */
export function simulateLoans({ before = TOTAL, alternatives = false, predictable = false, loans = PARAMS.loans, seed = PARAMS.seed, sample = SAMPLE_LOAN, params = {} } = {}) {
  const p = { ...PARAMS, ...params, sigma: { ...PARAMS.sigma, ...(params.sigma ?? {}) } };
  const sigma = predictable ? p.sigma.predictable : p.sigma.unpredictable;
  const L = luck(loans, seed, p.returned);
  const n = clampBefore(before);
  const guarded = CONDITIONS.map((c, i) => (i >= n && c.safeguard ? i : -1)).filter((i) => i >= 0);
  const days = new Int32Array(loans);
  const setBy = new Uint8Array(loans);
  const met = new Int32Array(loans * TOTAL);
  let one = null;
  for (let l = 0; l < loans; l++) {
    const conds = oneLoan(l, L, sigma, alternatives, p);
    for (let c = 0; c < TOTAL; c++) met[l * TOTAL + c] = conds[c].met;
    let last = 0;
    let by = 0;
    for (let c = 0; c < n; c++) {
      if (conds[c].met > last) {
        last = conds[c].met;
        by = c;
      }
    }
    const safe = guarded.map((c) => Math.min(conds[c].good, conds[c].altReady));
    for (const t of safe) {
      if (t > last) {
        last = t;
        by = SAFEGUARD;
      }
    }
    days[l] = last + p.check;
    setBy[l] = by;
    if (l === sample) {
      one = {
        day: days[l],
        conditions: conds.map((x, c) => ({ ...x, name: CONDITIONS[c].name, required: c < n, hasAlt: !!CONDITIONS[c].alt, setsDate: c === by })),
        safeguards: guarded.map((c, j) => {
          const x = conds[c];
          return { id: `${x.id}-safeguard`, of: x.id, name: CONDITIONS[c].safeguard, met: safe[j], byPackage: x.altReady < x.good, filed: x.filed, altReady: x.altReady, good: x.good, setsDate: by === SAFEGUARD };
        }),
      };
    }
  }
  return { days, setBy, met, sample: one, before: n, alternatives, predictable, check: p.check };
}

/** For each condition, the share of loans in which it alone would let the money move within `limit` days. */
export function inTime(sim, limit) {
  const loans = sim.days.length;
  return CONDITIONS.map((_, c) => {
    let ok = 0;
    for (let l = 0; l < loans; l++) if (sim.met[l * TOTAL + c] + sim.check <= limit) ok++;
    return ok / loans;
  });
}

/** For each condition, the share of loans whose date it set (it was met last); the extra last slot is the safeguard. */
export function dateSetters(sim) {
  const shares = new Array(TOTAL + 1).fill(0); // the last slot: a safeguard
  for (const c of sim.setBy) shares[c] += 1 / sim.setBy.length;
  return shares;
}

/** The day by which at least a share q of loans had disbursed (nearest rank, whole working days). */
export function within(days, q) {
  const sorted = Int32Array.from(days).sort();
  return sorted[Math.max(1, Math.ceil(q * sorted.length)) - 1];
}
/** The typical loan: half of all loans disburse by this day. */
export const typical = (days) => within(days, 0.5);
/** Nine loans in ten disburse by this day. */
export const nineInTen = (days) => within(days, 0.9);
/** Share of loans disbursed within `limit` working days. */
export const shareWithin = (days, limit) => days.reduce((s, d) => s + (d <= limit ? 1 : 0), 0) / days.length;

/** Loans per whole working day, from day 0 to `max`; later loans are counted in `beyond`. */
export function histogram(days, max) {
  const bins = new Array(max + 1).fill(0);
  let beyond = 0;
  for (const d of days) {
    if (d > max) beyond++;
    else bins[Math.max(0, d)]++;
  }
  return { bins, beyond };
}
