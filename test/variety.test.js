import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUESTS,
  ROOM,
  WORLDS,
  DELEGATED,
  KIND_NAMES,
  TARGET_DAYS,
  kindShares,
  weeklyRates,
  escalations,
  meanBacklog,
  averageWait,
  outcome,
  fewestDelegated,
  simulateCommittee,
} from '../src/lib/sim/variety.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const round1 = (v) => Math.round(v * 10) / 10;

test('kinds follow a long tail that sums to every request', () => {
  for (const n of Object.values(WORLDS)) {
    const s = kindShares(n);
    close(s.reduce((a, b) => a + b, 0), 1, 1e-12, 'shares sum');
    for (let i = 1; i < n; i++) assert.ok(s[i] < s[i - 1], 'most common first');
  }
  const rates = weeklyRates('today');
  close(rates.reduce((a, b) => a + b, 0), REQUESTS, 1e-9, 'requests a week');
  assert.equal(Math.round(kindShares(60)[0] * 100), 36, 'the most common kind is 36% of requests (model note)');
  assert.equal(Math.round(rates[59] * 52), 3, 'the rarest kind today: about three a year (model note)');
  assert.equal(escalations('today', 60), 0);
  close(escalations('today', 0), REQUESTS, 1e-9, 'nothing delegated sends everything up');
});

test('the committee formula is exact for a one-place committee and matches simulation', () => {
  // With room for one, carried-over cases average lam² / (2 (1 − lam)).
  for (const lam of [0.2, 0.5, 0.8]) close(meanBacklog(lam, 1), (lam * lam) / (2 * (1 - lam)), 1e-12, `one place, ${lam}`);
  assert.equal(meanBacklog(5, 5), Infinity);
  assert.equal(averageWait(6, 5), Infinity);
  assert.equal(averageWait(0, 5), 0);
  // A light load waits only for the next meeting: half a week, 2.5 working days.
  close(averageWait(0.01, 5), 2.5, 1e-6, 'light load');
  // The same committee simulated week by week, exceptions arriving through the week.
  for (const lam of [3, 4, escalations('today', 20), escalations('today', 19)]) {
    const exact = averageWait(lam);
    const sim = simulateCommittee(lam, { weeks: lam > 4.8 ? 600000 : 200000 });
    close(sim / exact, 1, 0.04, `simulation at ${lam.toFixed(2)} a week`);
  }
  // The fast track's committee: five places, four papers a week, 3.9 days.
  assert.equal(round1(averageWait(4)), 3.9);
});

test('the puzzle: twenty kinds is the fewest an office may decide for a wait under two weeks', () => {
  assert.equal(fewestDelegated('today'), 20);
  const start = outcome('today', DELEGATED.start);
  assert.ok(start.jammed && !start.met, 'ten kinds delegated, as at the start, jams');
  assert.equal(Math.round(start.escalated * 10) / 10, 8.4);
  assert.equal(Math.round(start.growth), 178, 'the queue grows by about 178 a year at ten kinds');
  assert.equal(Math.round((1 - start.answered) * 100), 21, 'one request in five fits none of the ten kinds');
  const at = outcome('today', 20);
  assert.ok(at.met);
  assert.equal(round1(at.wait), 7.8, 'about eight days');
  assert.equal(round1(at.escalated), 4.6);
  assert.equal(Math.round(at.load * 100), 92, 'nine-tenths of the room');
  const less = outcome('today', 19);
  assert.ok(!less.met && !less.jammed);
  assert.equal(round1(less.wait), 20.0);
  assert.equal(Math.round(less.load * 100), 97);
  assert.equal(Math.round(less.wait - at.wait), 12, 'one kind fewer costs twelve days');
  assert.equal(Math.round(at.wait - outcome('today', 30).wait), 5, 'ten more save five days between them');
  // Twenty kinds delegated or more keep the wait under two weeks; fewer do not.
  for (let m = DELEGATED.min; m <= DELEGATED.max; m++) assert.equal(outcome('today', m).met, m >= 20, `${m} kinds`);
  assert.ok(outcome('today', 20).wait < TARGET_DAYS && outcome('today', 19).wait > TARGET_DAYS);
});

test('the cases left waiting after a meeting: seventeen at nineteen kinds delegated, five at twenty', () => {
  // The chart stacks these above the committee's five places; the found line and the text quote 17 and 5.
  assert.equal(Math.round(outcome('today', 19).left), 17);
  assert.equal(round1(outcome('today', 20).left), 4.9);
  assert.equal(Math.round(outcome('today', 20).left), 5);
  assert.equal(round1(outcome('today', 21).left), 2.5);
  assert.equal(outcome('today', 18).left, Infinity, 'eighteen kinds: the queue grows without end');
  assert.equal(outcome('today', 60).left, 0);
  // Little's law ties the pile to the wait: half a week, plus the pile over the arrivals, in weeks.
  for (const m of [19, 20, 25]) {
    const o = outcome('today', m);
    close(o.wait, 5 * (0.5 + o.left / o.escalated), 1e-9, `${m} kinds`);
  }
});

test('every kind today has a name; the newest kinds the reader delegates are named as the text says', () => {
  assert.equal(KIND_NAMES.length, WORLDS.today);
  assert.equal(new Set(KIND_NAMES).size, WORLDS.today);
  assert.equal(KIND_NAMES[19], 'Currency switch', 'the twentieth kind');
  assert.equal(Math.round(weeklyRates('today')[19] * 52), 13, 'about 13 a year');
  assert.equal(KIND_NAMES[59], 'Cooperative, no audited accounts', 'the rarest, named in the setup');
  assert.equal(KIND_NAMES[44], 'Grace period after a drought');
  for (const n of KIND_NAMES) assert.ok(n.length <= 34, n);
});

test('the long tail: forty rare kinds that together fill the committee', () => {
  const rates = weeklyRates('today');
  const off = rates.slice(20);
  assert.equal(off.length, 40);
  assert.ok(Math.max(...off) * 52 < 13, 'none of the forty more than about once a month');
  close(off.reduce((a, b) => a + b, 0), escalations('today', 20), 1e-9, 'together');
});

test('a more varied world jams the same delegations', () => {
  const v = weeklyRates('varied');
  assert.equal(v.length, 120);
  const fresh = v.slice(60);
  assert.ok(Math.max(...fresh) * 52 < 3, 'each new kind fewer than three times a year');
  assert.equal(Math.round(fresh.reduce((a, b) => a + b, 0)), 2, 'together about two a week');
  const same = outcome('varied', 20);
  assert.ok(same.jammed);
  assert.equal(round1(same.escalated), 6.4);
  assert.equal(Math.round(same.growth), 74);
  assert.equal(fewestDelegated('varied'), 30);
  assert.ok(fewestDelegated('varied') <= DELEGATED.max, 'the slider reaches it');
  // Principles that settle one unlisted case in three keep the same twenty kinds near five days.
  const principled = outcome('varied', 20, { principles: 1 / 3 });
  assert.equal(Math.round(principled.wait), 5);
  assert.ok(principled.met);
});
