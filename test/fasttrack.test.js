import test from 'node:test';
import assert from 'node:assert/strict';

import { ROOM, READY, DEFER, DAYS, SEED, WARM, SHARES, MONDAYS, QUARTER, LONE_URGENT, LONG_RUN, deals, simulate, saving, longRun, quarter, agendaViews } from '../src/lib/sim/fasttrack.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);
// The chapter's format: one decimal below 20 days, whole days above.
const one = (v) => (v < 20 ? v.toFixed(1) : String(Math.round(v)));
const at = (share) => LONG_RUN[Math.round(share * 10)];

// The chapter's long run: 4,000 years of Mondays, seed 2026, every slider position on the same deals.
const D = deals(52 * 4000);
const LONG = SHARES.map((share) => simulate(D, { share }));

test('fast track: the committee, the deals and the slider', () => {
  assert.equal(ROOM, 5);
  assert.equal(READY, 4);
  assert.equal(DEFER, 0.2);
  assert.equal(DAYS, 5);
  assert.equal(SEED, 2026);
  assert.equal(WARM, 52);
  assert.deepEqual(SHARES, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  assert.equal(MONDAYS, 13);
  assert.equal(LONE_URGENT, 3.5);
});

test('fast track: deals are seeded, ready in order within the week, about four a week', () => {
  const a = deals(200);
  assert.deepEqual(a, deals(200));
  // A longer run starts with the same weeks, so every length of run sees the same deals.
  assert.deepEqual(deals(1000).slice(0, 200), a);
  assert.notDeepEqual(deals(200, 7), a);
  let n = 0;
  for (const week of D) {
    n += week.length;
    for (let i = 0; i < week.length; i++) {
      assert.ok(week[i].day >= 0 && week[i].day < DAYS);
      if (i) assert.ok(week[i].day >= week[i - 1].day);
    }
  }
  near(n / D.length, READY, 0.02);
});

test('fast track: the long-run table is what the model gives', () => {
  const fresh = longRun();
  assert.equal(fresh.length, 11);
  for (let i = 0; i < 11; i++) {
    const t = LONG_RUN[i];
    const r = fresh[i];
    assert.equal(t.share, SHARES[i]);
    for (const k of ['urgent', 'ordinary', 'average', 'firstMonday', 'placesUsed', 'deferredPerWeek']) {
      if (r[k] == null) assert.equal(t[k], null, `${k} at ${t.share}`);
      else near(t[k], r[k], 0.0005 + 1e-12);
    }
    near(LONG[i].average, r.average, 1e-12);
  }
  assert.equal(LONG_RUN[0].urgent, null);
  assert.equal(LONG_RUN[10].ordinary, null);
});

test('fast track: the agenda never holds more than five papers, and nothing is lost', () => {
  const short = deals(52 * 50);
  for (const share of SHARES) {
    const r = simulate(short, { share, keep: [0, short.length] });
    let decided = 0;
    for (const m of r.mondays) {
      assert.ok(m.places.length <= ROOM);
      // Work-conserving: a place is left empty only when nobody is waiting, apart from papers
      // deferred that Monday, which took a place and wait for the next.
      const deferred = m.places.filter((p) => p === 'deferred').length;
      if (m.waiting.urgent + m.waiting.ordinary > deferred) assert.equal(m.places.length, ROOM, `week ${m.week} at ${share}`);
      if (share === 0) assert.ok(!m.places.includes('urgent') && !m.places.includes('deferred'));
      if (share === 1) assert.ok(!m.places.includes('ordinary'));
      decided += m.waits.length;
      for (const w of m.waits) assert.ok(w > 0);
    }
    const arrived = short.slice(0, -1).reduce((a, w) => a + w.length, 0);
    const last = r.mondays[r.mondays.length - 1].waiting;
    assert.equal(decided + last.urgent + last.ordinary, arrived);
  }
});

test('fast track: going first alone only reorders the line; the deferrals stretch it', () => {
  // With no deferrals the average wait is the same whichever deals are marked.
  const base = simulate(D, { share: 0, defer: 0 }).average;
  for (const share of SHARES) near(simulate(D, { share, defer: 0 }).average, base, 0.005);
  near(base, at(0).average, 1e-3);
  // With them, the average rises with every step of the slider.
  for (let i = 1; i < 11; i++) assert.ok(LONG_RUN[i].average > LONG_RUN[i - 1].average, `${SHARES[i]}`);
});

test('fast track: the tiles and the text', () => {
  // Average wait: 3.9 days with no marks, 7.0 at half, 18.8 with every deal marked.
  assert.equal(one(at(0).average), '3.9');
  assert.equal(one(at(0.5).average), '7.0');
  assert.equal(one(at(1).average), '18.8');
  // “Grows almost fivefold, to about 19 working days.”
  assert.equal(Math.round(at(1).average), 19);
  const ratio = at(1).average / at(0).average;
  assert.ok(ratio > 4.5 && ratio < 5, `ratio ${ratio}`);
  // Marking saves: 0.4 days before anyone marks (a lone urgent paper waits 3.5 days), 0.9 at one
  // deal in ten, 6.6 at half, 78 at nine in ten; nothing is left to pass at 100%.
  assert.equal(one(saving(at(0))), '0.4');
  assert.equal(one(saving(at(0.1))), '0.9');
  assert.ok(saving(at(0.1)) < 1);
  assert.equal(one(saving(at(0.5))), '6.6');
  assert.equal(one(saving(at(0.9))), '78');
  assert.equal(saving(at(1)), null);
  assert.equal(one(at(0.1).urgent), '3.5');
  assert.equal(one(at(0.1).ordinary), '4.4');
  // Deferrals take 0.8 places a week at 100%; the agenda goes from 80% to 96% full.
  assert.equal(at(1).deferredPerWeek.toFixed(1), '0.8');
  assert.equal(Math.round(100 * at(0).placesUsed), 80);
  assert.equal(Math.round(100 * at(1).placesUsed), 96);
  near(at(1).placesUsed, (READY * (1 + DEFER)) / ROOM, 0.005);
  // Decided at the first Monday: 75% with no marks, 17% with every deal marked.
  assert.equal(Math.round(100 * LONG[0].firstMonday), 75);
  assert.equal(Math.round(100 * LONG[10].firstMonday), 17);
});

test('fast track: marking is quicker for a team at every share, and quicker still as more mark', () => {
  // So each team marks while it can, and every team ends up marked.
  for (let i = 0; i < 10; i++) assert.ok(saving(LONG_RUN[i]) > 0, `${SHARES[i]}`);
  for (let i = 1; i < 10; i++) assert.ok(saving(LONG_RUN[i]) > saving(LONG_RUN[i - 1]), `${SHARES[i]}`);
  // The ordinary deals are pushed back with every mark.
  for (let i = 2; i < 10; i++) assert.ok(LONG_RUN[i].ordinary > LONG_RUN[i - 1].ordinary);
  // A lone urgent paper: half a week to the next Monday, plus one deferral in five.
  near(simulate(D, { share: 0.01 }).urgent, LONE_URGENT, 0.05);
});

test('fast track: the headline holds on other seeds', () => {
  for (const seed of [1, 7, 11, 99]) {
    const Ds = deals(52 * 4000, seed);
    const none = simulate(Ds, { share: 0 }).average;
    const all = simulate(Ds, { share: 1 }).average;
    near(none, 3.95, 0.05);
    assert.ok(all > 17 && all < 21, `seed ${seed}: ${all}`);
    assert.ok(all / none > 4.4 && all / none < 5.1, `seed ${seed}: ratio ${all / none}`);
    for (const share of [0.1, 0.5, 0.9]) {
      const r = simulate(Ds, { share });
      assert.ok(r.ordinary > r.urgent, `seed ${seed}, ${share}`);
    }
  }
});

test('fast track: the figure’s quarter is the one closest to the long run across the slider', () => {
  const Dq = deals(52 * 300);
  const runs = SHARES.map((share) => simulate(Dq, { share, keep: [0, Dq.length] }));
  const err = (q) =>
    SHARES.reduce((e, _, i) => {
      const w = runs[i].mondays.slice(q * MONDAYS, (q + 1) * MONDAYS).flatMap((m) => m.waits);
      return e + Math.log(w.reduce((a, b) => a + b, 0) / w.length / LONG_RUN[i].average) ** 2;
    }, 0);
  let best = null;
  for (let q = 8; q < Math.floor(Dq.length / MONDAYS) - 1; q++) if (!best || err(q) < best.err) best = { q, err: err(q) };
  assert.equal(best.q, QUARTER);
  // The figure's quarter, computed alone, matches the long run's weeks.
  for (const i of [0, 5, 10]) {
    const v = quarter(SHARES[i]);
    assert.deepEqual(v.mondays, runs[i].mondays.slice(QUARTER * MONDAYS, (QUARTER + 1) * MONDAYS));
  }
});

test('fast track: the eleven views, computed once', () => {
  const views = agendaViews();
  assert.equal(views, agendaViews());
  assert.equal(views.length, 11);
  for (const [i, v] of views.entries()) {
    assert.equal(v.share, SHARES[i]);
    assert.equal(v.long, LONG_RUN[i]);
    assert.equal(v.mondays.length, MONDAYS);
    assert.equal(v.mondays[0].week, QUARTER * MONDAYS);
  }
  // The quarter tells the long run's story: about 4 days with no marks, about 19 with all.
  near(views[0].average, LONG_RUN[0].average, 0.5);
  near(views[10].average, LONG_RUN[10].average, 0.5);
  assert.equal(Math.round(views[10].average), 19);
  for (const i of [3, 6, 9]) assert.ok(views[i].average > views[i - 3].average);
  // With no marks the agenda has room to spare; with every deal marked, every place is taken
  // and papers are still waiting after every meeting.
  assert.ok(views[0].mondays.some((m) => m.places.length < ROOM));
  assert.ok(views[10].mondays.every((m) => m.places.length === ROOM && m.waiting.urgent > 0));
  assert.ok(views[10].mondays.some((m) => m.places.includes('deferred')));
  const waitingAt = (v) => Math.max(...v.mondays.map((m) => m.waiting.urgent + m.waiting.ordinary));
  assert.ok(waitingAt(views[10]) > 3 * waitingAt(views[0]));
});
