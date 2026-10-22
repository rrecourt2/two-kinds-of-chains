import test from 'node:test';
import assert from 'node:assert/strict';

import { REVIEW_DAYS, DAYS_PER_DEAL, ROUTES, committeeDays, routeTimes, equilibrium, breakEven, plannerOptimum } from '../src/lib/sim/fasttrack.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const SLIDER = Array.from({ length: 11 }, (_, i) => 10 + 5 * i); // 10, 15, … 60 deals a quarter

test('fast track: a committee takes a day per two deals; a review always 20 days', () => {
  assert.equal(REVIEW_DAYS, 20);
  assert.equal(DAYS_PER_DEAL, 0.5);
  assert.equal(committeeDays(40), 20);
  assert.deepEqual(
    ROUTES.map((r) => [r.id, r.stages.join('>')]),
    [['route1', 'regional>review'], ['route2', 'review>head'], ['fast', 'regional>head']],
  );
  const r = routeTimes({ route1: 20, route2: 20, fast: 0 });
  assert.deepEqual(r.agenda, { regional: 20, head: 20 });
  assert.deepEqual(r.times, { route1: 30, route2: 30, fast: 20 });
});

test('fast track: closed, forty deals split evenly and take 30 days each', () => {
  const e = equilibrium({ deals: 40, fastTrack: false });
  assert.deepEqual(e.split, { route1: 20, route2: 20, fast: 0 });
  assert.deepEqual(e.agenda, { regional: 20, head: 20 });
  assert.equal(e.stage.regional, 10);
  assert.equal(e.time, 30);
  for (const n of SLIDER) close(equilibrium({ deals: n, fastTrack: false }).time, n / 4 + 20);
});

test('fast track: open, forty deals all take it and take 40 days each', () => {
  const e = equilibrium({ deals: 40, fastTrack: true });
  assert.deepEqual(e.split, { route1: 0, route2: 0, fast: 40 });
  assert.deepEqual(e.agenda, { regional: 40, head: 40 });
  assert.equal(e.stage.regional, 20);
  assert.equal(e.stage.head, 20);
  assert.equal(e.time, 40);
  // The empty routes would take just as long: nobody gains by going back.
  assert.deepEqual(e.times, { route1: 40, route2: 40, fast: 40 });
});

test('fast track: open gives n days up to 40 deals, then 40 days up to 80', () => {
  for (let n = 1; n <= 40; n++) {
    const e = equilibrium({ deals: n, fastTrack: true });
    close(e.time, n);
    assert.equal(e.split.fast, n);
  }
  for (let n = 40; n <= 80; n++) {
    const e = equilibrium({ deals: n, fastTrack: true });
    close(e.time, 40);
    assert.deepEqual(e.split, { route1: n - 40, route2: n - 40, fast: 80 - n });
    assert.deepEqual(e.agenda, { regional: 40, head: 40 });
  }
  // Beyond 80 deals nobody takes the fast track and it changes nothing.
  const many = equilibrium({ deals: 100, fastTrack: true });
  assert.equal(many.split.fast, 0);
  close(many.time, equilibrium({ deals: 100, fastTrack: false }).time);
});

test('fast track: every deal goes somewhere and every used route takes the same time', () => {
  for (const fastTrack of [false, true]) {
    for (const n of SLIDER) {
      const e = equilibrium({ deals: n, fastTrack });
      close(e.split.route1 + e.split.route2 + e.split.fast, n);
      for (const r of ROUTES) if (e.split[r.id] > 0) close(e.times[r.id], e.time);
      close(e.average, e.time);
    }
  }
});

test('fast track: no team can switch route and gain', () => {
  for (const fastTrack of [false, true]) {
    const open = ROUTES.filter((r) => fastTrack || r.id !== 'fast');
    for (const n of SLIDER) {
      const e = equilibrium({ deals: n, fastTrack });
      for (const from of open) {
        if (e.split[from.id] < 1) continue;
        for (const to of open) {
          if (to === from) continue;
          // One deal moves: its new route's committees see it, its old route's no longer do.
          const moved = { ...e.split, [from.id]: e.split[from.id] - 1, [to.id]: e.split[to.id] + 1 };
          const after = routeTimes(moved).times[to.id];
          assert.ok(after >= e.time - 1e-9, `${n} deals, ${fastTrack ? 'open' : 'closed'}: ${from.id} → ${to.id} takes ${after}, not less than ${e.time}`);
        }
      }
    }
  }
});

test('fast track: the first team to take it saves nearly ten days', () => {
  const r = routeTimes({ route1: 19, route2: 20, fast: 1 });
  assert.equal(r.times.fast, 20.5);
  assert.equal(30 - r.times.fast, 9.5);
});

test('fast track: helps up to 25 deals, hurts from 30; break-even about 26.7', () => {
  close(breakEven(), 80 / 3);
  const gain = (n) => equilibrium({ deals: n, fastTrack: false }).time - equilibrium({ deals: n, fastTrack: true }).time;
  close(gain(breakEven()), 0);
  for (const n of SLIDER) {
    if (n <= 25) assert.ok(gain(n) > 0, `helps at ${n}`);
    else assert.ok(gain(n) < 0, `hurts at ${n}`);
  }
  assert.equal(gain(10), 12.5); // 22.5 days closed, 10 open
  assert.equal(gain(25), 1.25); // 26.25 closed, 25 open
  assert.equal(gain(30), -2.5); // 27.5 closed, 30 open
  assert.equal(gain(40), -10); // 30 closed, 40 open
});

test('fast track: the best split for all, checked against every whole-deal split', () => {
  for (const n of [10, 20, 25, 30, 35, 40, 50, 60]) {
    const p = plannerOptimum({ deals: n });
    let best = Infinity;
    for (let a = 0; a <= n; a++) for (let b = 0; a + b <= n; b++) best = Math.min(best, routeTimes({ route1: a, route2: b, fast: n - a - b }).average);
    close(p.average, best, 1e-9);
    // Planned for all, a deal is never slower than when each team chooses for itself.
    assert.ok(p.average <= equilibrium({ deals: n, fastTrack: true }).time + 1e-9);
  }
  // From 40 deals the best plan leaves the fast track empty; below 40 it uses it.
  assert.equal(plannerOptimum({ deals: 40 }).split.fast, 0);
  close(plannerOptimum({ deals: 40 }).average, 30);
  assert.equal(plannerOptimum({ deals: 30 }).split.fast, 10);
  close(plannerOptimum({ deals: 30 }).average, 80 / 3);
});
