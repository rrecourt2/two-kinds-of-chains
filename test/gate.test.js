// The gate worth keeping, as a false-positive case: an automatic screen for account changes, a
// call-back above an amount the reader sets, and a thousand simulated years.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARAMS,
  LIMIT,
  LATE,
  YEARS,
  SEED,
  SENSITIVITY,
  CALLBACK,
  START,
  ANSWER,
  SETTINGS,
  SHOW_SEED,
  qnorm,
  cutoff,
  yearOf,
  calendars,
  calledBack,
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
const sens = (label) => SENSITIVITY.findIndex((s) => s.label === label);
const call = (label) => CALLBACK.findIndex((c) => c.label === label);
const ok = (r) => meetsLimit(r) && onTime(r);

// The chapter's own result (seed 12), worked out once for the tests below.
const chapter = chapterRuns();
const R = chapter.runs;
const at = (s, c) => R[settingIndex(sens(s), call(c))];

test('gate: the scenario and the two controls', () => {
  assert.equal(LIMIT, 5);
  assert.equal(LATE, 0.01);
  assert.equal(YEARS, 1000);
  assert.equal(SEED, 12);
  assert.equal(PARAMS.fraudEvery, 200);
  assert.equal(PARAMS.reviewers, 3);
  assert.equal(PARAMS.promise, 3);
  assert.equal(PARAMS.hidden, 0.25);
  assert.deepEqual(SENSITIVITY.map((s) => s.label), ['Low', 'Medium', 'High', 'Very high']);
  assert.deepEqual(SENSITIVITY.map((s) => s.flags), [0.1, 0.35, 0.5, 0.7]);
  assert.deepEqual(CALLBACK.map((c) => c.label), ['None', '$10m', '$1m']);
  assert.deepEqual(CALLBACK.map((c) => c.at), [Infinity, 10, 1]);
  for (const o of [...SENSITIVITY, ...CALLBACK]) assert.ok(o.label.length <= 18, o.label);
  assert.equal(SETTINGS.length, SENSITIVITY.length * CALLBACK.length);
  for (const [k, s] of SETTINGS.entries()) assert.equal(settingIndex(s.sens, s.callback), k);
  assert.deepEqual({ ...START }, { sens: sens('Medium'), callback: call('None') });
  assert.deepEqual({ ...ANSWER }, { sens: sens('Low'), callback: call('$1m') });
});

test('gate: the screen’s cut-offs flag the stated share of genuine requests', () => {
  near(qnorm(0.5), 0, 1e-9);
  near(qnorm(0.975), 1.959964, 1e-6);
  near(qnorm(0.1), -1.281552, 1e-6);
  near(qnorm(0.001), -3.090232, 1e-6);
  near(qnorm(0.3) + qnorm(0.7), 0, 1e-9);
  assert.equal(cutoff(0), Infinity);
  const rng = makeRng(4);
  let genuine = 0;
  const flagged = SENSITIVITY.map(() => 0);
  for (let t = 0; t < 60; t++) {
    const y = yearOf(rng);
    for (let i = 0; i < y.n; i++) {
      if (y.fraud[i]) continue;
      genuine++;
      SENSITIVITY.forEach((s, k) => (flagged[k] += y.score[i] > cutoff(s.flags) ? 1 : 0));
    }
  }
  SENSITIVITY.forEach((s, k) => near(flagged[k] / genuine, s.flags, 0.01, s.label));
});

test('gate: a year of requests — about 600, $50,000 to $80m, median about $1m, one in 200 a fraud, one fraud in four hidden', () => {
  const rng = makeRng(3);
  let n = 0;
  let frauds = 0;
  let hidden = 0;
  let genuine = [];
  let visible = [];
  const sizes = [];
  for (let t = 0; t < 400; t++) {
    const y = yearOf(rng);
    calendars(rng);
    n += y.n;
    for (let i = 0; i < y.n; i++) {
      sizes.push(y.size[i]);
      frauds += y.fraud[i];
      hidden += y.hidden[i];
      assert.ok(!y.hidden[i] || y.fraud[i], 'only a fraud can be hidden');
      if (!y.fraud[i]) genuine.push(y.score[i]);
      else if (!y.hidden[i]) visible.push(y.score[i]);
      assert.ok(y.reviewer[i] >= 0 && y.reviewer[i] < PARAMS.reviewers);
      if (i) assert.ok(y.day[i] >= y.day[i - 1], 'requests come in the order they arrive');
    }
  }
  near(n / 400, 600, 4, 'requests a year');
  near(frauds / n, 1 / 200, 0.0005, 'fraud rate');
  near(hidden / frauds, 0.25, 0.03, 'hidden share');
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

test('gate: one year by hand — called back for the amount or for a flag, for any reviewer or a named one', () => {
  // Five requests on day 0: a fraud of $3m with no sign, a flagged genuine $0.2m, a flagged fraud of $0.4m,
  // an unflagged genuine $0.3m and a genuine $1.5m. Reviewer 0 is in every day; 1 and 2 are away for three days.
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
  const cut = 1;
  // The screen alone: the $3m fraud shows no sign and is paid; two flags, one of them a genuine client.
  const screen = runYear(y, cal, { threshold: Infinity, cut });
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => calledBack(y, i, Infinity, cut)), [false, true, true, false, false]);
  assert.equal(screen.loss, 3);
  assert.equal(screen.flagged, 2);
  assert.equal(screen.flaggedFraud, 1);
  assert.equal(screen.called, 2);
  assert.equal(screen.genuineCalled, 1);
  assert.equal(screen.stopped, 1);
  assert.equal(screen.late, 0);
  // Above $1m as well: the hidden fraud is stopped; four calls, one reviewer in until day 3.
  const gate = runYear(y, cal, { threshold: 1, cut });
  assert.equal(gate.loss, 0);
  assert.equal(gate.called, 4);
  assert.equal(gate.bySize, 2);
  near(gate.bySizeMoney, 4.5, 1e-12);
  assert.equal(gate.stopped, 2);
  // Calls in arrival order: day 0 the $3m fraud, day 1 the $0.2m client (waits 2), day 2 the $0.4m fraud,
  // day 3 three reviewers: the $1.5m client (waits 4: late). The $0.3m client is paid at once.
  assert.equal(gate.valid, 3);
  assert.equal(gate.waitSum, 0 + 2 + 4);
  assert.equal(gate.late, 1);
  // Named reviewers: reviewer 1 is away until day 3, and three calls wait for them.
  const named = runYear(y, cal, { threshold: 1, cut, pooled: false });
  assert.equal(named.waitSum, 0 + 5 + 6); // day 3 the fraud, day 4 the $0.2m client, day 5 the $1.5m client
  assert.equal(named.late, 2);
  // A call no one can make before the horizon counts as very late.
  const nobody = [0, 1, 2].map(() => new Uint8Array(len));
  const stuck = runYear(y, nobody, { threshold: 0, cut });
  assert.equal(stuck.late, 3);
  assert.equal(stuck.loss, 0);
});

test('gate: the chapter numbers (seed 12)', () => {
  for (const r of R) {
    console.log(
      `${SENSITIVITY[r.sens].label.padEnd(9)} ${CALLBACK[r.callback].label.padEnd(8)} worst ${money(r.worst).padStart(6)} mean ${money(r.mean)} over ${String(r.over).padStart(3)}  late ${pct(r.late, 2).padStart(6)}  busy ${pct(r.busy)}  calls ${r.calls.toFixed(0)} (genuine ${r.genuineCalls.toFixed(0)})  flags ${r.flags.toFixed(0)}, ${pct(r.precision, 1)} fraud  caught ${pct(r.caught)}`,
    );
  }
  // The start: the screen alone, on Medium. About 210 genuine clients a year wait; a fraud with no sign breaks the limit.
  const start = R[settingIndex(START.sens, START.callback)];
  assert.equal(money(start.worst), '$70.7m');
  assert.equal(pct(start.late, 2), '0.06%');
  assert.equal(Math.round(start.genuineCalls), 209);
  // Low: 60 genuine clients flagged a year for about 2 frauds, one flag in 27.
  const low = at('Low', 'None');
  assert.equal(Math.round(low.genuineCalls), 60);
  assert.equal(Math.round(low.flagsFraud), 2);
  assert.equal(Math.round(1 / low.precision), 27);
  // Very high, alone: nine frauds in ten stopped, but 418 genuine clients wait, reviewers 62% busy, 1.7% late,
  // and the worst year still loses $65.3m. One flag in 148 is a fraud.
  const vh = at('Very high', 'None');
  assert.equal(Math.round(vh.caught * 10), 9);
  assert.equal(Math.round(vh.genuineCalls), 418);
  assert.equal(pct(vh.busy), '62%');
  assert.equal(pct(vh.late, 1), '1.7%');
  assert.equal(money(vh.worst), '$65.3m');
  assert.equal(Math.round(1 / vh.precision), 148);
  // The answer: call back above $1m (half the payments, nine-tenths of the money), the screen on Low.
  const answer = at('Low', '$1m');
  assert.equal(Math.round(answer.bySize * 10), 5);
  assert.equal(Math.round(answer.bySizeMoney * 10), 9);
  assert.equal(money(answer.worst), '$2.3m');
  assert.equal(pct(answer.late, 1), '0.5%');
  assert.equal(pct(answer.busy), '50%');
  assert.equal(Math.round(answer.genuineCalls / 10) * 10, 330);
  assert.ok(answer.genuineCalls > start.genuineCalls, 'more genuine clients wait than on Medium alone');
  // $1m with the screen on Medium: the reviewers fall behind (61% busy, 1.5% late).
  const medium = at('Medium', '$1m');
  assert.equal(pct(medium.late, 1), '1.5%');
  assert.equal(pct(medium.busy), '61%');
  // The coin-game trap at $10m: the average year inside the limit, the worst far outside.
  const ten = at('Low', '$10m');
  assert.equal(money(ten.mean), '$1.4m');
  assert.equal(money(ten.worst), '$15.3m');
  // With a named reviewer for each payment, the answer's gate leaves 8.2% late.
  assert.equal(chapter.named.pooled, false);
  assert.equal(pct(chapter.named.late, 1), '8.2%');
});

test('gate: most flags are false positives at every sensitivity, and most call-backs at every setting', () => {
  for (const r of R) {
    assert.ok(r.precision < 0.05, `${SENSITIVITY[r.sens].label}: ${pct(r.precision, 1)} of flags are fraud`);
    assert.ok(r.genuineCalls > 10 * r.frauds, 'genuine clients far outnumber frauds among the calls');
  }
  // A higher setting catches more fraud and flags many more genuine clients; each flag means less.
  for (let s = 1; s < SENSITIVITY.length; s++) {
    const [a, b] = [at(SENSITIVITY[s - 1].label, 'None'), at(SENSITIVITY[s].label, 'None')];
    assert.ok(b.caught > a.caught && b.genuineCalls > a.genuineCalls && b.precision < a.precision && b.late >= a.late);
  }
});

test('gate: the puzzle — only a light screen with every payment above $1m called back, on several seeds', () => {
  for (const seed of [12, 7, 99, 2026, 5, 21]) {
    const out = seed === SEED ? R : simulate({ seed });
    const solved = out.filter(ok).map((r) => `${SENSITIVITY[r.sens].label} + ${CALLBACK[r.callback].label}`);
    assert.deepEqual(solved, ['Low + $1m'], `seed ${seed}`);
    const get = (s, c) => out[settingIndex(sens(s), call(c))];
    // The screen alone fails both ways: turned up, it floods the reviewers; at any setting, it misses large frauds.
    for (const s of SENSITIVITY) assert.ok(!meetsLimit(get(s.label, 'None')), `seed ${seed}: ${s.label} alone loses too much`);
    assert.ok(!onTime(get('Very high', 'None')), `seed ${seed}: Very high alone floods the reviewers`);
    assert.ok(onTime(get('Low', 'None')), `seed ${seed}: Low alone is on time`);
    // At $1m, any setting above Low makes payments late; $10m is not enough at any setting.
    for (const s of ['Medium', 'High', 'Very high']) assert.ok(meetsLimit(get(s, '$1m')) && !onTime(get(s, '$1m')), `seed ${seed}: ${s} at $1m`);
    for (const s of SENSITIVITY) assert.ok(!meetsLimit(get(s.label, '$10m')), `seed ${seed}: $10m`);
    // The trap holds at $10m: the average year inside the limit, the worst outside.
    for (const s of SENSITIVITY) assert.ok(get(s.label, '$10m').mean < LIMIT, `seed ${seed}: trap`);
    // The answer has room on both counts.
    const answer = get('Low', '$1m');
    assert.ok(answer.worst < 0.75 * LIMIT && answer.late < 0.6 * LATE, `seed ${seed}: margins`);
  }
});

test('gate: calling back more stops more and makes more wait', () => {
  for (let s = 0; s < SENSITIVITY.length; s++) {
    for (let c = 1; c < CALLBACK.length; c++) {
      const [a, b] = [R[settingIndex(s, c - 1)], R[settingIndex(s, c)]];
      assert.ok(b.calls >= a.calls && b.caught >= a.caught && b.late >= a.late && b.mean <= a.mean && b.worst <= a.worst);
    }
  }
  for (const r of R) assert.equal(r.losses[r.worstYear], Math.max(...r.losses));
});

test('gate: the year on the card shows the case — three frauds among about 600 requests', () => {
  const y = shownYear();
  assert.equal(SHOW_SEED, 255017);
  assert.ok(y.n >= 590 && y.n <= 610, `${y.n} requests`);
  const frauds = [];
  for (let i = 0; i < y.n; i++) if (y.fraud[i]) frauds.push(i);
  assert.equal(frauds.length, 3);
  const cuts = SENSITIVITY.map((s) => cutoff(s.flags));
  const flaggedAt = (i) => cuts.map((c) => y.score[i] > c);
  const [big, clumsy, quiet] = [
    frauds.find((i) => y.hidden[i] && y.size[i] > LIMIT),
    frauds.find((i) => !y.hidden[i]),
    frauds.find((i) => y.hidden[i] && y.size[i] < 1),
  ];
  // A hidden fraud above the board's limit, between $1m and $10m: no setting flags it.
  assert.ok(big !== undefined && y.size[big] < 10);
  assert.deepEqual(flaggedAt(big), [false, false, false, false]);
  // A clumsy small fraud: every setting flags it.
  assert.ok(clumsy !== undefined && y.size[clumsy] < 1);
  assert.deepEqual(flaggedAt(clumsy), [true, true, true, true]);
  // A hidden small fraud: only High and Very high catch it.
  assert.ok(quiet !== undefined && y.size[quiet] > 0.1);
  assert.deepEqual(flaggedAt(quiet), [false, false, true, true]);
  assert.equal(money(y.size[big]), '$5.2m');
  assert.equal(money(y.size[clumsy]), '$0.8m');
  assert.equal(money(y.size[quiet]), '$0.4m');
  // Genuine clients flagged at each setting, close to the share each setting flags.
  const genuine = cuts.map((c) => {
    let k = 0;
    for (let i = 0; i < y.n; i++) if (!y.fraud[i] && y.score[i] > c) k++;
    return k;
  });
  assert.deepEqual(genuine, [60, 199, 290, 409]);
});

test('gate: in steps or all at once, the same thousand years', () => {
  const runs = [SETTINGS[0], { ...SETTINGS[settingIndex(ANSWER.sens, ANSWER.callback)], pooled: false }];
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
