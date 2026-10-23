// The gate worth keeping: a thousand simulated years of change-of-account requests,
// checked above an amount the reader sets.
import test from 'node:test';
import assert from 'node:assert/strict';

import { PARAMS, LIMIT, YEARS, SEED, STOPS, yearOf, calendars, runYear, simulate, simulation, chapterStep, chapterRuns, chapterReady, meetsLimit, onTime } from '../src/lib/sim/gate.js';
import { makeRng } from '../src/lib/sim/rng.js';

const near = (a, b, tol, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} not within ${tol} of ${b}`);
const at = (amount) => STOPS.findIndex((s) => s.at === amount);
const allStops = (pooled = true) => STOPS.map((s) => ({ threshold: s.at, pooled }));
const money = (v) => `$${v.toFixed(1)}m`;
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;

// The chapter's own result (seed 12), worked out once for the tests below.
const chapter = chapterRuns();
const S = chapter.stops;

test('gate: the scenario and the slider stops', () => {
  assert.equal(LIMIT, 5);
  assert.equal(YEARS, 1000);
  assert.equal(SEED, 12);
  assert.deepEqual(
    STOPS.map((s) => s.label),
    ['Every payment', '$250,000', '$500,000', '$1m', '$2m', '$5m', '$10m', '$20m', 'None'],
  );
  assert.deepEqual(STOPS.map((s) => s.at), [0, 0.25, 0.5, 1, 2, 5, 10, 20, Infinity]);
  // Slider labels stay short (≤ 18 characters).
  for (const s of STOPS) assert.ok(s.label.length <= 18, s.label);
  assert.equal(PARAMS.reviewers, 3);
  assert.equal(PARAMS.promise, 3);
  assert.equal(PARAMS.fraudEvery, 200);
});

test('gate: a year of requests — about 600, $50,000 to $80m, median $1m, one in 200 fraudulent', () => {
  const rng = makeRng(3);
  let n = 0;
  let frauds = 0;
  const sizes = [];
  for (let t = 0; t < 200; t++) {
    const y = yearOf(rng);
    calendars(rng);
    n += y.n;
    for (let i = 0; i < y.n; i++) {
      sizes.push(y.size[i]);
      frauds += y.fraud[i];
      assert.ok(y.reviewer[i] >= 0 && y.reviewer[i] < PARAMS.reviewers);
      if (i) assert.ok(y.day[i] >= y.day[i - 1], 'requests come in the order they arrive');
    }
  }
  near(n / 200, 600, 5, 'requests a year');
  near(frauds / n, 1 / 200, 0.0007, 'fraud rate');
  assert.ok(Math.min(...sizes) >= 0.05 && Math.max(...sizes) <= 80);
  sizes.sort((a, b) => a - b);
  near(sizes[Math.floor(sizes.length / 2)], 1, 0.03, 'median size');
});

test('gate: reviewers are in nine days in ten, away in spells of about four days', () => {
  const rng = makeRng(5);
  let inDays = 0;
  let days = 0;
  let spells = 0;
  let away = 0;
  for (let t = 0; t < 300; t++) {
    for (const c of calendars(rng)) {
      assert.equal(c.length, PARAMS.days + PARAMS.tail);
      for (let d = 0; d < c.length; d++) {
        inDays += c[d];
        days++;
        if (!c[d]) {
          away++;
          if (d === 0 || c[d - 1]) spells++;
        }
      }
    }
  }
  near(inDays / days, 0.9, 0.01, 'presence');
  near(away / spells, 4, 0.3, 'mean absence spell');
});

test('gate: one year by hand — a queue for any qualified reviewer, or for a named one', () => {
  // Four requests on day 0; the second is a fraud. Reviewer 0 is in every day; 1 and 2 are away for three days.
  const y = {
    n: 4,
    day: Int32Array.from([0, 0, 0, 0]),
    size: Float64Array.from([2, 3, 0.4, 1.5]),
    fraud: Uint8Array.from([0, 1, 0, 0]),
    reviewer: Uint8Array.from([1, 1, 0, 1]),
  };
  const len = PARAMS.days + PARAMS.tail;
  const cal = [new Uint8Array(len).fill(1), new Uint8Array(len).fill(1), new Uint8Array(len).fill(1)];
  cal[1].fill(0, 0, 3);
  cal[2].fill(0, 0, 3);
  // Check from $1m: the $0.4m payment goes at once; three checks, but only reviewer 0 is in until day 3.
  const any = runYear(y, cal, { threshold: 1, pooled: true });
  assert.equal(any.checked, 3);
  assert.equal(any.loss, 0);
  assert.equal(any.valid, 3); // the fraud is held, not paid
  assert.equal(any.waitSum, 0 + 1 + 3); // unchecked at once; checks on day 0 and day 2 (the fraud took day 1)
  assert.equal(any.late, 0);
  near(any.moneyChecked, 6.5, 1e-12);
  // Named reviewers: three requests wait for reviewer 1, who is back on day 3.
  const named = runYear(y, cal, { threshold: 1, pooled: false });
  assert.equal(named.waitSum, 0 + 4 + 6); // checks on day 3 (A), 4 (the fraud), 5 (D)
  assert.equal(named.late, 2);
  // Check nothing: the fraud is paid and lost in full; nobody waits.
  const none = runYear(y, cal, { threshold: Infinity, pooled: true });
  assert.equal(none.loss, 3);
  assert.equal(none.checked, 0);
  assert.equal(none.waitSum, 0);
  // A check no one can do before the horizon counts as very late.
  const nobody = [0, 1, 2].map(() => new Uint8Array(len));
  const stuck = runYear(y, nobody, { threshold: 0, pooled: true });
  assert.equal(stuck.late, 3);
  assert.equal(stuck.loss, 0);
});

test('gate: the chapter numbers (seed 12) — what each stop costs in losses and in waiting', () => {
  for (const r of S) console.log(`${String(r.threshold).padStart(8)}  checked ${pct(r.checkedShare)}  money ${pct(r.moneyShare)}  late ${pct(r.late, 2)}  busy ${pct(r.busy, 1)}  typical ${money(r.median)}  average ${money(r.mean)}  worst ${money(r.worst)}  over ${r.over}`);
  const every = S[at(0)];
  const one = S[at(1)];
  // Checking every payment: nothing lost, but the reviewers are 89% busy and 28% of payments are late.
  assert.equal(every.worst, 0);
  assert.equal(every.lossless, YEARS);
  assert.equal(pct(every.busy), '89%');
  assert.equal(pct(every.late), '28%');
  // $1m: the answer. Half the payments, nine-tenths of the money; worst year $3.7m; 0.3% late; 44% busy.
  assert.equal(pct(one.checkedShare), '50%');
  assert.equal(Math.round(one.moneyShare * 10), 9);
  assert.equal(money(one.worst), '$3.7m');
  assert.equal(pct(one.late, 1), '0.3%');
  assert.equal(pct(one.busy), '44%');
  // The coin-game trap: at $5m and $10m the average year is inside the limit and the worst is far outside.
  const five = S[at(5)];
  const ten = S[at(10)];
  assert.equal(money(five.mean), '$3.2m');
  assert.equal(money(five.worst), '$15.8m');
  assert.equal(money(ten.mean), '$4.8m');
  assert.equal(money(ten.worst), '$24.8m');
  assert.equal(ten.over, 394);
  // With named reviewers only, the same $1m gate leaves 6.3% late (model note).
  assert.equal(chapter.named.pooled, false);
  assert.equal(pct(chapter.named.late, 1), '6.3%');
});

test('gate: the puzzle — only $1m meets the limit and the promise, on several seeds', () => {
  for (const seed of [12, 7, 99, 2026, 5]) {
    const out = simulate({ runs: allStops(), seed });
    const ok = out.map((r, k) => (meetsLimit(r) && onTime(r) ? STOPS[k].label : null)).filter(Boolean);
    assert.deepEqual(ok, ['$1m'], `seed ${seed}`);
    // The default (every payment) loses nothing but is late; just below and above the answer each fail one test.
    assert.ok(meetsLimit(out[0]) && !onTime(out[0]), `seed ${seed}: the default does not solve it`);
    assert.ok(!onTime(out[at(0.5)]), `seed ${seed}: $500,000 is too slow`);
    assert.ok(!meetsLimit(out[at(2)]), `seed ${seed}: $2m loses too much`);
    // The trap holds on every seed: the average year inside the limit, the worst outside, at $5m and $10m.
    for (const k of [at(5), at(10)]) assert.ok(out[k].mean < LIMIT && out[k].worst > 2 * LIMIT, `seed ${seed} stop ${k}`);
  }
});

test('gate: raising the amount checks less, waits less and loses more', () => {
  for (let k = 1; k < S.length; k++) {
    assert.ok(S[k].checkedShare <= S[k - 1].checkedShare);
    assert.ok(S[k].moneyShare <= S[k - 1].moneyShare);
    assert.ok(S[k].late <= S[k - 1].late);
    assert.ok(S[k].mean >= S[k - 1].mean);
    assert.ok(S[k].worst >= S[k - 1].worst);
    assert.ok(S[k].over >= S[k - 1].over);
  }
  assert.equal(S[S.length - 1].checkedShare, 0);
  assert.equal(S[S.length - 1].late, 0);
  // The worst year really is the worst, and its index points at it.
  for (const r of S) assert.equal(r.losses[r.worstYear], Math.max(...r.losses));
});

test('gate: in steps or all at once, the same thousand years', () => {
  const runs = [{ threshold: 1, pooled: true }, { threshold: 1, pooled: false }];
  const whole = simulate({ runs, years: 120, seed: 9 });
  const steps = simulation({ runs, years: 120, seed: 9, chunk: 25 });
  let yields = 0;
  let step;
  while (!(step = steps.next()).done) yields++;
  assert.equal(yields, 4);
  assert.deepEqual(step.value, whole);
  // The chapter's cached job: finished once, then returned as it is.
  assert.equal(chapterReady(), chapter);
  assert.equal(chapterStep(), chapter);
  const again = simulate({ runs: [...allStops(), { threshold: 1, pooled: false }] });
  assert.deepEqual(again.slice(0, STOPS.length), S);
  assert.deepEqual(again[STOPS.length], chapter.named);
});
