// The irony of the reliable machine (chapter “The irony of the reliable machine”): every number the chapter quotes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARAMS, LIMIT, TARGET, DAYS, YEAR, FAILS, failureDays, floorSkill, errorRate, normalDay, run, automatedEnough, failureDayOk, solves } from '../src/lib/sim/automation.js';

const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const pcts = Array.from({ length: 100 }, (_, i) => i); // the slider: 0–99%

test('the rules: 1 in 1,000 for the system, 1 in 100 in practice, up to 1 in 10 out of it', () => {
  assert.equal(PARAMS.perDay, 200);
  assert.equal(PARAMS.errSystem, 0.001);
  assert.equal(errorRate(1), 0.01);
  near(errorRate(0), 0.1, 1e-12);
  assert.equal(DAYS, 756);
  assert.equal(YEAR, 252);
  // A practised person makes 2 mistakes in a day of 200 payments; fully out of practice, 20.
  near(PARAMS.perDay * errorRate(1), 2, 1e-9);
  near(PARAMS.perDay * errorRate(0), 20, 1e-9);
});

test('the run: seven failures in three years, the first a month after go-live', () => {
  assert.deepEqual(FAILS, failureDays(PARAMS.seed));
  assert.equal(FAILS.length, 7);
  assert.ok(FAILS[0] >= 21 && FAILS[0] <= 23, String(FAILS[0]));
  assert.ok(FAILS.every((d, i) => i === 0 || d > FAILS[i - 1]));
  assert.ok(FAILS.every((d) => d < DAYS));
});

test('normal days: about 500 mistakes a year by hand, 55 at 99% automated', () => {
  assert.equal(normalDay(0), 2);
  assert.equal(Math.round(run(0).normalYear), 504);
  assert.equal(Math.round(run(0.99).normalYear), 55);
  // Practice does not change normal days: the system screens behind people.
  assert.equal(run(0.99, 'month').normalYear, run(0.99, 'none').normalYear);
  // More automation, fewer mistakes on a normal day, all the way up.
  for (let a = 1; a < 100; a++) assert.ok(normalDay(a / 100) < normalDay((a - 1) / 100));
});

test('the default: 99% automated, no practice, up to 19 mistakes on a day it fails', () => {
  const r = run(0.99, 'none');
  assert.equal(Math.round(r.worstAny), 19);
  assert.equal(Math.round(r.worstFailed), 19);
  assert.ok(!failureDayOk(r));
  assert.ok(automatedEnough(0.99));
  assert.ok(!solves(0.99, 'none'));
  // The first failure, a month in, costs 9: people still remember.
  assert.equal(Math.round(r.failed[0].mistakes), 9);
  assert.ok(r.failed[0].mistakes < LIMIT);
  // Six of the seven failure days go over the limit.
  assert.equal(r.failed.filter((f) => f.mistakes >= LIMIT).length, 6);
  // Seven days it failed: 111 mistakes, about two-thirds as many as the 749 normal days together (163).
  assert.equal(Math.round(r.failTotal), 111);
  assert.equal(Math.round(r.normalTotal), 163);
  assert.equal(DAYS - r.failed.length, 749);
  near(r.failTotal / r.normalTotal, 2 / 3, 0.02);
});

test('with nothing automated there is no system to fail, and every day is a practised day', () => {
  const r = run(0, 'none');
  assert.equal(r.failed.length, 0);
  assert.equal(r.worstAny, 0);
  assert.ok(failureDayOk(r));
  assert.ok(!automatedEnough(0));
  assert.ok(!solves(0, 'none'));
});

test('without practice, the failure day passes only below 90% automated (up to 83%)', () => {
  const ok = pcts.filter((a) => failureDayOk(run(a / 100, 'none')));
  assert.equal(Math.max(...ok), 83);
  assert.equal(Math.round(run(0.9, 'none').worstAny), 14);
  assert.equal(Math.round(run(0.8, 'none').worstAny), 8);
  // Skill floor: a tenth of the work by hand keeps a third of the skill; 30% keeps all of it.
  near(floorSkill(0.9), 1 / 3, 1e-9);
  assert.equal(floorSkill(0.7), 1);
});

test('the answer: a day by hand each month, at any automation from 90% to 99%; a quarter is not enough', () => {
  const month = pcts.filter((a) => solves(a / 100, 'month'));
  assert.deepEqual(month, [90, 91, 92, 93, 94, 95, 96, 97, 98, 99]);
  assert.deepEqual(pcts.filter((a) => solves(a / 100, 'quarter')), []);
  assert.deepEqual(pcts.filter((a) => solves(a / 100, 'none')), []);
  const r = run(0.99, 'month');
  assert.equal(Math.round(r.worstAny), 9);
  assert.equal(Math.round(r.failTotal), 42);
  assert.ok(r.failed.every((f) => f.mistakes < LIMIT));
  assert.equal(r.practiceDays.length, 35);
  assert.equal(Math.round(run(0.9, 'quarter').worstAny), 11);
  assert.equal(Math.round(run(0.99, 'quarter').worstAny), 16);
  assert.equal(TARGET, 0.9);
});

test('the answer holds whatever days the system fails (200 seeds)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const f = failureDays(seed);
    for (let a = 90; a <= 99; a++) {
      assert.ok(run(a / 100, 'month', f).worstAny < LIMIT, `seed ${seed} at ${a}% with monthly practice`);
      assert.ok(run(a / 100, 'quarter', f).worstAny >= LIMIT, `seed ${seed} at ${a}% with quarterly practice`);
      assert.ok(run(a / 100, 'none', f).worstAny >= LIMIT, `seed ${seed} at ${a}% without practice`);
    }
  }
});

test('every failure is a day of practice: a system that failed each month would keep people as sharp', () => {
  const monthly = Array.from({ length: 36 }, (_, i) => (i + 1) * 21).filter((d) => d < DAYS);
  near(run(0.99, 'none', monthly).worstAny, run(0.99, 'month').worstAny, 1e-9);
});

test('the chart fits: no day above 20 mistakes', () => {
  for (const p of ['none', 'quarter', 'month']) for (const a of pcts) assert.ok(run(a / 100, p).worstAny <= 20);
});
