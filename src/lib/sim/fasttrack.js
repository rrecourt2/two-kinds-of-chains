// The fast track: one investment committee with an urgent lane.
// The committee meets every Monday and hears up to five papers. About four deals are ready a
// week (a Poisson count), each at a random moment in the week, and a deal ready during a week is
// first heard the next Monday. Urgent papers go to the top of the agenda, in the order they became
// ready; ordinary papers follow in the same order. An urgent paper reaches the committee before
// anyone has read it, so at its first hearing it is deferred a week with a chance of one in five:
// it takes its place that Monday and comes back, at the top, to be decided. Waits are counted in
// working days, from the day a deal is ready to the Monday it is decided.
//
// Common random numbers: every deal carries its own ready time, its rank (it is marked urgent when
// its rank is below the share marked) and its deferral draw, so every position of the chapter's
// slider sees the same deals, and the positions differ only in which deals carry the mark.

import { makeRng, poisson } from './rng.js';

/** Papers the committee can hear on a Monday. */
export const ROOM = 5;
/** Deals ready in a typical week. */
export const READY = 4;
/** Chance that an urgent paper, read unprepared, is deferred a week at its first hearing. */
export const DEFER = 0.2;
/** Working days in a week. */
export const DAYS = 5;
export const SEED = 2026;
/** Weeks left out at the start of a run, while the agenda fills to its usual level. */
export const WARM = 52;
/** The slider's positions: the share of deals marked urgent, 0% to 100% in tenths. */
export const SHARES = Array.from({ length: 11 }, (_, i) => i / 10);
/** Mondays in the figure: one quarter. */
export const MONDAYS = 13;
/**
 * The quarter the figure shows (seed 2026): of the quarters in 300 years, the one whose average
 * waits come closest to the long-run averages across all eleven slider positions (test/fasttrack.test.js).
 */
export const QUARTER = 166;

/** The expected wait of a lone urgent paper, with no other paper marked: half a week to the next Monday, plus the chance of a deferral. */
export const LONE_URGENT = DAYS / 2 + DAYS * DEFER;

/** Deals ready in each of `weeks` weeks: per deal its moment in the week (0–5 days), its rank and its deferral draw. */
export function deals(weeks, seed = SEED, ready = READY) {
  const rng = makeRng(seed);
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const k = poisson(rng, ready);
    const week = [];
    for (let i = 0; i < k; i++) week.push({ day: DAYS * rng(), rank: rng(), draw: rng() });
    week.sort((a, b) => a.day - b.day);
    out.push(week);
  }
  return out;
}

/**
 * Runs the committee through the deals `D`. Returns the average waits (urgent, ordinary, all
 * deals), the share decided at their first Monday, the places used and the deferrals per Monday,
 * and the papers still waiting after a meeting, all counted after the warm-up. `keep` = [from, to)
 * also returns those Mondays in detail: the papers in each place and the papers still waiting.
 */
export function simulate(D, { share = 0, defer = DEFER, room = ROOM, warm = WARM, keep = null } = {}) {
  let urgent = [];
  let ordinary = [];
  const kept = [];
  let sumU = 0, nU = 0, sumO = 0, nO = 0, first = 0, used = 0, deferred = 0, waiting = 0;
  for (let w = 0; w < D.length; w++) {
    const t = DAYS * w;
    const counted = w >= warm;
    const record = keep && w >= keep[0] && w < keep[1];
    const places = record ? [] : null;
    const waits = record ? [] : null;
    let left = room;
    const nextU = [];
    for (const d of urgent) {
      if (left === 0) {
        nextU.push(d);
        continue;
      }
      left--;
      if (!d.deferred && d.draw < defer) {
        d.deferred = true;
        nextU.push(d);
        if (counted) deferred++;
        if (record) places.push('deferred');
        continue;
      }
      const wait = t - d.ready;
      if (counted) (sumU += wait), nU++, wait < DAYS && first++;
      if (record) places.push('urgent'), waits.push(wait);
    }
    const nextO = [];
    for (const d of ordinary) {
      if (left === 0) {
        nextO.push(d);
        continue;
      }
      left--;
      const wait = t - d.ready;
      if (counted) (sumO += wait), nO++, wait < DAYS && first++;
      if (record) places.push('ordinary'), waits.push(wait);
    }
    urgent = nextU;
    ordinary = nextO;
    if (counted) (used += room - left), (waiting += urgent.length + ordinary.length);
    if (record) kept.push({ week: w, places, waits, waiting: { urgent: urgent.length, ordinary: ordinary.length } });
    // Deals ready during the week, heard from the next Monday on.
    for (const x of D[w]) (x.rank < share ? urgent : ordinary).push({ ready: t + x.day, draw: x.draw, deferred: false });
  }
  const weeks = Math.max(1, D.length - warm);
  return {
    share,
    urgent: nU ? sumU / nU : null,
    ordinary: nO ? sumO / nO : null,
    average: nU + nO ? (sumU + sumO) / (nU + nO) : null,
    firstMonday: nU + nO ? first / (nU + nO) : null,
    placesUsed: used / weeks / room,
    deferredPerWeek: deferred / weeks,
    waitingAfter: waiting / weeks,
    mondays: kept,
  };
}

/** Days a team saves by marking its deal urgent, at this share: the ordinary wait less the urgent one. */
export function saving(row) {
  if (row.ordinary == null) return null;
  return row.ordinary - (row.urgent ?? LONE_URGENT);
}

/** The long run behind the tiles and the text: 4,000 years of Mondays, at each of the slider's positions. */
export function longRun({ seed = SEED, years = 4000 } = {}) {
  const D = deals(52 * years, seed);
  return SHARES.map((share) => {
    const r = simulate(D, { share });
    return { share, urgent: r.urgent, ordinary: r.ordinary, average: r.average, firstMonday: r.firstMonday, placesUsed: r.placesUsed, deferredPerWeek: r.deferredPerWeek };
  });
}

// longRun() for seed 2026, rounded to three decimals: the urgent and ordinary waits and the
// average in working days, the share decided at their first Monday, the share of places used,
// and the deferrals per Monday. The test recomputes it.
export const LONG_RUN = [
  { share: 0, urgent: null, ordinary: 3.947, average: 3.947, firstMonday: 0.745, placesUsed: 0.801, deferredPerWeek: 0 },
  { share: 0.1, urgent: 3.494, ordinary: 4.433, average: 4.339, firstMonday: 0.7, placesUsed: 0.817, deferredPerWeek: 0.08 },
  { share: 0.2, urgent: 3.494, ordinary: 5.123, average: 4.796, firstMonday: 0.661, placesUsed: 0.832, deferredPerWeek: 0.159 },
  { share: 0.3, urgent: 3.512, ordinary: 6.17, average: 5.372, firstMonday: 0.629, placesUsed: 0.848, deferredPerWeek: 0.239 },
  { share: 0.4, urgent: 3.562, ordinary: 7.762, average: 6.081, firstMonday: 0.607, placesUsed: 0.864, deferredPerWeek: 0.319 },
  { share: 0.5, urgent: 3.664, ordinary: 10.272, average: 6.96, firstMonday: 0.594, placesUsed: 0.88, deferredPerWeek: 0.399 },
  { share: 0.6, urgent: 3.856, ordinary: 14.456, average: 8.085, firstMonday: 0.584, placesUsed: 0.896, deferredPerWeek: 0.479 },
  { share: 0.7, urgent: 4.225, ordinary: 22.076, average: 9.569, firstMonday: 0.567, placesUsed: 0.912, deferredPerWeek: 0.559 },
  { share: 0.8, urgent: 4.984, ordinary: 38.445, average: 11.671, firstMonday: 0.523, placesUsed: 0.928, deferredPerWeek: 0.638 },
  { share: 0.9, urgent: 6.945, ordinary: 85.229, average: 14.776, firstMonday: 0.415, placesUsed: 0.944, deferredPerWeek: 0.718 },
  { share: 1, urgent: 18.766, ordinary: null, average: 18.766, firstMonday: 0.169, placesUsed: 0.96, deferredPerWeek: 0.798 },
];

/**
 * The figure's quarter at one share: thirteen Mondays, each with the papers in its five places
 * ('urgent', 'ordinary' or 'deferred') and the papers still waiting after the meeting, plus the
 * quarter's own average wait. Pass `D` to reuse the deals across shares.
 */
export function quarter(share, { D = deals(MONDAYS * (QUARTER + 1)), q = QUARTER } = {}) {
  const from = MONDAYS * q;
  const r = simulate(D.length > from + MONDAYS ? D.slice(0, from + MONDAYS) : D, { share, keep: [from, from + MONDAYS] });
  const waits = r.mondays.flatMap((m) => m.waits);
  return { share, mondays: r.mondays, average: waits.reduce((a, b) => a + b, 0) / waits.length, decided: waits.length };
}

let views = null;
/** The eleven slider positions, computed once: the long-run row and the figure's quarter for each. */
export function agendaViews() {
  if (views) return views;
  const D = deals(MONDAYS * (QUARTER + 1));
  views = SHARES.map((share, i) => ({ share, long: LONG_RUN[i], saving: saving(LONG_RUN[i]), ...quarter(share, { D }) }));
  return views;
}
