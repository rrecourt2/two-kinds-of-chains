// The gate worth keeping, as a statistical false-positive case: the bank checks a share of the
// requests above $1m and a share of those below, an automatic screen picks the most suspicious
// first, and a thousand simulated years decide.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARAMS,
  LIMIT,
  LATE,
  YEARS,
  SEED,
  SHARES,
  START,
  ANSWER,
  SETTINGS,
  SHOW_SEED,
  shareLabel,
  qnorm,
  cutoff,
  cuts,
  yearOf,
  calendars,
  isLarge,
  checked,
  runYear,
  settingIndex,
  simulate,
  simulation,
  shownYear,
  chapterStep,
  chapterRuns,
  chapterReady,
  meetsLimit,
  onTime,
} from '../src/lib/sim/gate.js';
import { makeRng } from '../src/lib/sim/rng.js';

const near = (a, b, tol, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} not within ${tol} of ${b}`);
const money = (v) => `$${v.toFixed(1)}m`;
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const k = (s) => SHARES.indexOf(s);
const ok = (r) => meetsLimit(r) && onTime(r);
const name = (r) => `${shareLabel(r.largeShare)} above / ${shareLabel(r.smallShare)} below`;
// The standard normal tail, P(Z > z), by Simpson's rule (accurate enough for the checks below).
const above = (z) => {
  if (z === -Infinity) return 1;
  const lo = Math.max(z, -12);
  const n = 4000;
  const h = (12 - lo) / n;
  const f = (t) => Math.exp((-t * t) / 2) / Math.sqrt(2 * Math.PI);
  let s = f(lo) + f(12);
  for (let i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};

// The chapter's own result (seed 12), worked out once for the tests below.
const chapter = chapterRuns();
const R = chapter.runs;
const at = (l, s) => R[settingIndex(k(l), k(s))];

test('gate: the scenario and the two controls — shares checked, never none', () => {
  assert.equal(LIMIT, 5);
  assert.equal(LATE, 0.01);
  assert.equal(YEARS, 1000);
  assert.equal(SEED, 12);
  assert.equal(PARAMS.perDay, 2.6);
  assert.equal(PARAMS.fraudEvery, 200);
  assert.equal(PARAMS.reviewers, 3);
  assert.equal(PARAMS.presence, 0.9);
  assert.equal(PARAMS.promise, 3);
  assert.equal(PARAMS.hidden, 0.25);
  assert.equal(PARAMS.line, 1);
  assert.deepEqual([...SHARES], [0.1, 0.25, 0.5, 0.75, 0.9, 1]);
  assert.ok(SHARES.every((s) => s > 0), 'no setting checks nothing at all');
  assert.deepEqual(SHARES.map((_, i) => shareLabel(i)), ['10%', '25%', '50%', '75%', '90%', '100%']);
  assert.equal(SETTINGS.length, SHARES.length ** 2);
  for (const [i, s] of SETTINGS.entries()) {
    assert.equal(settingIndex(s.largeShare, s.smallShare), i);
    assert.deepEqual({ large: s.large, small: s.small }, cuts(s.largeShare, s.smallShare));
  }
  assert.deepEqual({ ...START }, { large: k(0.5), small: k(0.5) });
  assert.deepEqual({ ...ANSWER }, { large: k(1), small: k(0.1) });
});

test('gate: the bars check the stated share of genuine requests, on each side of $1m', () => {
  near(qnorm(0.5), 0, 1e-9);
  near(qnorm(0.975), 1.959964, 1e-6);
  near(qnorm(0.1), -1.281552, 1e-6);
  near(qnorm(0.001), -3.090232, 1e-6);
  near(qnorm(0.3) + qnorm(0.7), 0, 1e-9);
  assert.equal(cutoff(1), -Infinity);
  assert.equal(cutoff(0), Infinity);
  const rng = makeRng(4);
  const tally = { large: [0, SHARES.map(() => 0)], small: [0, SHARES.map(() => 0)] };
  for (let t = 0; t < 60; t++) {
    const y = yearOf(rng);
    for (let i = 0; i < y.n; i++) {
      if (y.fraud[i]) continue;
      const side = tally[isLarge(y, i) ? 'large' : 'small'];
      side[0]++;
      SHARES.forEach((_, j) => (side[1][j] += checked(y, i, cuts(j, j)) ? 1 : 0));
    }
  }
  for (const [side, [n, hits]] of Object.entries(tally)) SHARES.forEach((s, j) => near(hits[j] / n, s, 0.015, `${side} ${s}`));
});

test('gate: a year of requests — about 650, $50,000 to $80m, median about $1m, one in 200 a fraud, one fraud in four hidden', () => {
  const rng = makeRng(3);
  let n = 0;
  let frauds = 0;
  let hidden = 0;
  let large = 0;
  const genuine = [];
  const visible = [];
  const sizes = [];
  for (let t = 0; t < 400; t++) {
    const y = yearOf(rng);
    calendars(rng);
    n += y.n;
    for (let i = 0; i < y.n; i++) {
      sizes.push(y.size[i]);
      frauds += y.fraud[i];
      hidden += y.hidden[i];
      large += isLarge(y, i) ? 1 : 0;
      assert.ok(!y.hidden[i] || y.fraud[i], 'only a fraud can be hidden');
      if (!y.fraud[i]) genuine.push(y.score[i]);
      else if (!y.hidden[i]) visible.push(y.score[i]);
      assert.ok(y.reviewer[i] >= 0 && y.reviewer[i] < PARAMS.reviewers);
      if (i) assert.ok(y.day[i] >= y.day[i - 1], 'requests come in the order they arrive');
    }
  }
  near(n / 400, 650, 4, 'requests a year');
  near(frauds / n, 1 / 200, 0.0005, 'fraud rate');
  near(hidden / frauds, 0.25, 0.03, 'hidden share');
  near(large / n, 0.5, 0.02, 'share above $1m');
  assert.ok(sizes.every((v) => v >= 0.05 && v <= 80));
  sizes.sort((a, b) => a - b);
  near(sizes[Math.floor(sizes.length / 2)], 1, 0.05, 'median size');
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  near(avg(genuine), 0, 0.01, 'genuine scores');
  near(avg(visible), PARAMS.signal, 0.1, 'scores of frauds that show signs');
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

test('gate: one year by hand — each side checked above its own bar, for any reviewer or a named one', () => {
  // Five requests on day 0: a fraud of $3m with no sign, a genuine $0.2m that looks suspicious, a clumsy fraud of
  // $0.4m, a genuine $0.3m and a genuine $1.5m. Reviewer 0 is in every day; 1 and 2 are away for three days.
  const y = {
    n: 5,
    day: Int32Array.from([0, 0, 0, 0, 0]),
    size: Float64Array.from([3, 0.2, 0.4, 0.3, 1.5]),
    fraud: Uint8Array.from([1, 0, 1, 0, 0]),
    hidden: Uint8Array.from([1, 0, 0, 0, 0]),
    score: Float64Array.from([-0.5, 2, 3.5, 0.1, 0.2]),
    reviewer: Uint8Array.from([1, 1, 0, 1, 1]),
  };
  const len = PARAMS.days + PARAMS.tail;
  const cal = [new Uint8Array(len).fill(1), new Uint8Array(len).fill(1), new Uint8Array(len).fill(1)];
  cal[1].fill(0, 0, 3);
  cal[2].fill(0, 0, 3);
  // The same bar on both sides: the $3m fraud shows no sign and is paid; two checks, one of them a genuine client.
  const same = runYear(y, cal, { large: 1, small: 1 });
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => checked(y, i, { large: 1, small: 1 })), [false, true, true, false, false]);
  assert.equal(same.loss, 3);
  assert.equal(same.called, 2);
  assert.equal(same.genuineCalled, 1);
  assert.equal(same.smallGenuineCalled, 1);
  assert.equal(same.stopped, 1);
  assert.equal(same.smallFrauds, 1);
  assert.equal(same.smallStopped, 1);
  assert.equal(same.largeFrauds, 1);
  assert.equal(same.largeStopped, 0);
  assert.equal(same.largeN, 2);
  near(same.largeMoney, 4.5, 1e-12);
  assert.equal(same.late, 0);
  // Every request above $1m checked: the hidden fraud is stopped; four calls, one reviewer in until day 3.
  const gate = runYear(y, cal, { large: -Infinity, small: 1 });
  assert.equal(gate.loss, 0);
  assert.equal(gate.called, 4);
  assert.equal(gate.largeCalled, 2);
  assert.equal(gate.smallCalled, 2);
  assert.equal(gate.stopped, 2);
  // Calls in arrival order: day 0 the $3m fraud, day 1 the $0.2m client (waits 2), day 2 the $0.4m fraud,
  // day 3 three reviewers: the $1.5m client (waits 4: late). The $0.3m client is paid at once.
  assert.equal(gate.valid, 3);
  assert.equal(gate.waitSum, 0 + 2 + 4);
  assert.equal(gate.late, 1);
  // Named reviewers: reviewer 1 is away until day 3, and three calls wait for them.
  const named = runYear(y, cal, { large: -Infinity, small: 1, pooled: false });
  assert.equal(named.waitSum, 0 + 5 + 6); // day 3 the fraud, day 4 the $0.2m client, day 5 the $1.5m client
  assert.equal(named.late, 2);
  // A call no one can make before the horizon counts as very late.
  const nobody = [0, 1, 2].map(() => new Uint8Array(len));
  const stuck = runYear(y, nobody, { large: -Infinity, small: -Infinity });
  assert.equal(stuck.late, 3);
  assert.equal(stuck.loss, 0);
});

test('gate: the most suspicious first — a tenth checked catches far more than a tenth of the frauds', () => {
  // A fraud that shows its signs clears a bar set for a share s of genuine requests with chance P(Z > bar − signal);
  // a hidden one, with chance s.
  const expected = (s) => (1 - PARAMS.hidden) * above(cutoff(s) - PARAMS.signal) + PARAMS.hidden * s;
  near(expected(0.1), 0.743, 0.002, 'a tenth');
  near(expected(0.25), 0.805, 0.002, 'a quarter');
  near(expected(0.9), 0.975, 0.002, 'nine in ten');
  for (const s of SHARES) {
    const r = at(1, s);
    near(r.smallCaught, expected(s), 0.03, `small frauds caught at ${s}`);
    if (s < 1) assert.ok(r.smallCaught > s, `checking ${s} catches more than ${s} of the frauds`);
  }
  // Above $1m, only the hidden ones slip through: nine in ten checked lets one hidden fraud in ten through.
  near(1 - at(0.9, 0.1).largeCaught, PARAMS.hidden * 0.1, 0.01, 'large frauds missed at nine in ten');
  assert.equal(at(1, 0.1).largeCaught, 1);
});

test('gate: the chapter numbers (seed 12)', () => {
  for (const r of R) {
    console.log(
      `${name(r).padEnd(24)} worst ${money(r.worst).padStart(6)} mean ${money(r.mean)} over ${String(r.over).padStart(3)}  late ${pct(r.late, 2).padStart(6)}  busy ${pct(r.busy)}  checks ${r.calls.toFixed(0)} (genuine ${r.genuineCalls.toFixed(0)})  caught ${pct(r.caught)} (small ${pct(r.smallCaught)})`,
    );
  }
  // The start: the most suspicious half at every amount. Payments on time, but a hidden large fraud breaks the limit.
  const start = R[settingIndex(START.large, START.small)];
  assert.equal(money(start.worst), '$33.6m');
  assert.equal(money(start.mean), '$1.0m');
  assert.equal(pct(start.late, 2), '0.35%');
  assert.equal(Math.round(start.calls), 326);
  // The answer: every request above $1m (half the requests, nine-tenths of the money), the most suspicious tenth below.
  const answer = at(1, 0.1);
  assert.equal(Math.round(answer.largeOfRequests * 10), 5);
  assert.equal(Math.round(answer.largeOfMoney * 10), 9);
  assert.equal(money(answer.worst), '$1.8m');
  assert.equal(pct(answer.late, 2), '0.69%');
  assert.equal(pct(answer.busy), '54%');
  assert.equal(Math.round(answer.smallGenuineCalls), 32);
  assert.equal(Math.round(answer.smallCaught * 4), 3, 'three small frauds in four');
  assert.equal(Math.round(answer.genuineCalls / 10) * 10, 360);
  assert.equal(Math.round((answer.genuineCalls / start.genuineCalls - 1) * 10), 1, 'a tenth more genuine clients wait than with half of every amount');
  // Nine in ten above $1m: the coin-game trap. The average year far inside the limit, 13 years in 1,000 outside it.
  const ninety = at(0.9, 0.1);
  assert.equal(money(ninety.mean), '$0.3m');
  assert.equal(ninety.over, 13);
  assert.equal(money(ninety.worst), '$22.6m');
  // A quarter below $1m: one more small fraud stopped about every ten years, 47 more clients wait, 1.4% late.
  const quarter = at(1, 0.25);
  assert.equal(Math.round(1 / (quarter.smallStopped - answer.smallStopped)), 10);
  assert.equal(Math.round(quarter.genuineCalls - answer.genuineCalls), 47);
  assert.equal(pct(quarter.busy), '61%');
  assert.equal(pct(quarter.late, 1), '1.4%');
  // With a named reviewer for each payment, the answer's gate leaves 9.1% late.
  assert.equal(chapter.named.pooled, false);
  assert.equal(pct(chapter.named.late, 1), '9.1%');
});

test('gate: most checks are false positives at every setting', () => {
  for (const r of R) {
    assert.ok(r.precision < 0.05, `${name(r)}: ${pct(r.precision, 1)} of checks find a fraud`);
    assert.ok(r.genuineCalls > 10 * r.frauds, 'genuine clients far outnumber frauds among the checks');
  }
});

test('gate: the puzzle — only all above $1m and a tenth below, on several seeds', () => {
  for (const seed of [12, 7, 99, 2026, 5, 21]) {
    const out = seed === SEED ? R : simulate({ seed });
    assert.deepEqual(out.filter(ok).map(name), ['100% above / 10% below'], `seed ${seed}`);
    const get = (l, s) => out[settingIndex(k(l), k(s))];
    // Checking fewer of the large ones breaks the limit, whatever is checked below; the average hides it.
    for (const l of SHARES.filter((s) => s < 1)) {
      for (const s of SHARES) assert.ok(!meetsLimit(get(l, s)), `seed ${seed}: ${l} above loses too much`);
      assert.ok(get(l, 0.1).mean < LIMIT, `seed ${seed}: the average year at ${l} is inside the limit`);
    }
    // Checking more of the small ones makes payments late.
    for (const s of SHARES.filter((s) => s > 0.1)) assert.ok(meetsLimit(get(1, s)) && !onTime(get(1, s)), `seed ${seed}: ${s} below`);
    // The start fails only the limit.
    assert.ok(!meetsLimit(get(0.5, 0.5)) && onTime(get(0.5, 0.5)), `seed ${seed}: the start`);
    // The answer has room on both counts.
    const answer = get(1, 0.1);
    assert.ok(answer.worst < 0.75 * LIMIT && answer.late < 0.8 * LATE, `seed ${seed}: margins`);
    assert.ok(get(1, 0.25).late > 1.25 * LATE, `seed ${seed}: a quarter below is clearly late`);
  }
});

test('gate: checking more stops more and makes more wait', () => {
  for (let l = 0; l < SHARES.length; l++) {
    for (let s = 0; s < SHARES.length; s++) {
      const r = R[settingIndex(l, s)];
      for (const b of [l + 1 < SHARES.length && R[settingIndex(l + 1, s)], s + 1 < SHARES.length && R[settingIndex(l, s + 1)]]) {
        if (!b) continue;
        assert.ok(b.calls >= r.calls && b.caught >= r.caught && b.late >= r.late && b.mean <= r.mean && b.worst <= r.worst);
      }
    }
  }
  for (const r of R) assert.equal(r.losses[r.worstYear], Math.max(...r.losses));
});

test('gate: the year on the card shows the case — three frauds among about 650 requests', () => {
  const y = shownYear();
  assert.ok(y.n >= 638 && y.n <= 662, `${y.n} requests`);
  const frauds = [];
  for (let i = 0; i < y.n; i++) if (y.fraud[i]) frauds.push(i);
  assert.equal(frauds.length, 3);
  // Is fraud i checked when that share of its side is checked?
  const checkedAt = (i) => SHARES.map((_, j) => checked(y, i, cuts(j, j)));
  const big = frauds.find((i) => y.hidden[i] && isLarge(y, i));
  const clumsy = frauds.find((i) => !y.hidden[i] && !isLarge(y, i) && checkedAt(i)[0]);
  const quiet = frauds.find((i) => i !== clumsy && !isLarge(y, i));
  // A hidden fraud above the board's limit, among the least suspicious tenth: only checking all stops it.
  assert.ok(big !== undefined && y.size[big] > LIMIT);
  assert.deepEqual(checkedAt(big), [false, false, false, false, false, true]);
  // A clumsy small fraud: the most suspicious tenth holds it.
  assert.ok(clumsy !== undefined);
  assert.deepEqual(checkedAt(clumsy), [true, true, true, true, true, true]);
  // A quieter small fraud: a quarter stops it, a tenth does not.
  assert.ok(quiet !== undefined);
  assert.deepEqual(checkedAt(quiet), [false, true, true, true, true, true]);
  assert.equal(SHOW_SEED, 825152);
  assert.deepEqual([big, clumsy, quiet].map((i) => money(y.size[i])), ['$5.3m', '$0.8m', '$0.4m']);
  // Genuine clients checked below $1m at each share, close to that share.
  let small = 0;
  for (let i = 0; i < y.n; i++) if (!y.fraud[i] && !isLarge(y, i)) small++;
  SHARES.forEach((s, j) => {
    let hits = 0;
    for (let i = 0; i < y.n; i++) if (!y.fraud[i] && !isLarge(y, i) && checked(y, i, cuts(j, j))) hits++;
    near(hits / small, s, 0.06, `genuine below $1m at ${s}`);
  });
});

test('gate: in steps or all at once, the same thousand years', () => {
  const runs = [SETTINGS[0], { ...SETTINGS[settingIndex(ANSWER.large, ANSWER.small)], pooled: false }];
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
});
