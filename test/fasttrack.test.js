import test from 'node:test';
import assert from 'node:assert/strict';

import { REVIEW_DAYS, DAYS_PER_DEAL, DEALS, ROUTES, committeeDays, routeTimes, equilibrium, breakEven, plannerOptimum, uptake, switchGain } from '../src/lib/sim/fasttrack.js';

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

// The chapter's slider: deal teams on the fast track, 0 to 40 in steps of two, the rest split evenly.
const TEAMS = Array.from({ length: 21 }, (_, i) => 2 * i);

test('fast track uptake: the slider’s ends are the two settled states', () => {
  assert.equal(DEALS, 40);
  const none = uptake(0);
  const closed = equilibrium({ deals: 40, fastTrack: false });
  assert.deepEqual(none.split, closed.split);
  assert.equal(none.oldTime, 30);
  assert.equal(none.fastTime, 20);
  assert.equal(none.saving, 10);
  const all = uptake(40);
  const open = equilibrium({ deals: 40, fastTrack: true });
  assert.deepEqual(all.split, open.split);
  assert.deepEqual(all.times, open.times);
  assert.equal(all.fastTime, 40);
  assert.equal(all.oldTime, 40);
  assert.equal(all.saving, 0);
  // Out-of-range values are clamped.
  assert.equal(uptake(-3).onFast, 0);
  assert.equal(uptake(55).onFast, 40);
});

test('fast track uptake: both routes slow as teams switch, the fast track twice as fast', () => {
  for (const k of TEAMS) {
    const u = uptake(k);
    close(u.split.route1 + u.split.route2 + u.split.fast, 40);
    assert.ok(Number.isInteger(u.split.route1), `whole deals at ${k}`);
    assert.equal(u.split.route1, u.split.route2);
    assert.deepEqual(u.agenda, { regional: 20 + k / 2, head: 20 + k / 2 });
    close(u.fastTime, 20 + k / 2);
    close(u.oldTime, 30 + k / 4);
    close(u.times.route2, u.oldTime);
    close(u.saving, 10 - k / 4);
    // The average across all forty deals rises with every switch: 30 + k²/160.
    close(u.average, 30 + (k * k) / 160);
  }
  for (let k = 1; k <= 40; k++) {
    assert.ok(uptake(k).fastTime > uptake(k - 1).fastTime);
    assert.ok(uptake(k).oldTime > uptake(k - 1).oldTime);
    assert.ok(uptake(k).average > uptake(k - 1).average);
  }
});

test('fast track uptake: quicker than the old routes at every k below 40; they meet at 40 days', () => {
  for (let k = 0; k < 40; k += 0.5) {
    const u = uptake(k);
    assert.ok(u.fastTime < u.oldTime, `${k}: fast ${u.fastTime} < old ${u.oldTime}`);
    assert.ok(u.saving > 0);
  }
  const all = uptake(40);
  assert.equal(all.fastTime, all.oldTime);
  assert.equal(all.oldTime, 40);
});

test('fast track uptake: counted exactly, a switching team gains until 38 have switched, then neither gains nor loses', () => {
  for (const k of TEAMS.filter((t) => t < 40)) {
    const u = uptake(k);
    for (const from of ['route1', 'route2']) {
      const g = switchGain(u.split, from, 'fast');
      // Its own deal adds half a day to the committee it joins.
      close(g, u.saving - DAYS_PER_DEAL);
      if (k <= 36) assert.ok(g >= 0.5, `${k}: gain ${g}`);
      else assert.equal(g, 0);
    }
  }
  close(switchGain(uptake(0).split, 'route1', 'fast'), 9.5);
  // At 40 nobody gains by switching back: the old routes would take 40 days too.
  const all = uptake(40);
  for (const to of ['route1', 'route2']) {
    assert.equal(switchGain(all.split, 'fast', to), 0);
    assert.equal(routeTimes({ ...all.split, fast: 39, [to]: 1 }).times[to], 40);
  }
  // One team at a time, the team with the most to gain moves: all forty end on the fast track.
  let s = { route1: 20, route2: 20, fast: 0 };
  const gains = [];
  while (s.fast < 40) {
    const from = s.route1 >= s.route2 ? 'route1' : 'route2';
    const g = switchGain(s, from, 'fast');
    assert.ok(g >= 0, `team ${s.fast + 1} would lose ${-g}`);
    gains.push(g);
    s = { ...s, [from]: s[from] - 1, fast: s.fast + 1 };
  }
  assert.equal(gains.filter((g) => g > 0).length, 38);
  assert.equal(routeTimes(s).times.fast, 40);
});

test('fast track: the settled flows meet Wardrop’s conditions, open or closed', () => {
  for (const fastTrack of [false, true]) {
    const available = ROUTES.filter((r) => fastTrack || r.id !== 'fast');
    for (let n = 0; n <= 100; n += 0.5) {
      const e = equilibrium({ deals: n, fastTrack });
      // Flows are non-negative and add up to the deals.
      for (const r of ROUTES) assert.ok(e.split[r.id] >= 0, `${n}: ${r.id} flow ${e.split[r.id]}`);
      close(e.split.route1 + e.split.route2 + e.split.fast, n);
      if (!fastTrack) assert.equal(e.split.fast, 0);
      // Every used route takes the same time, and no available route is quicker.
      const used = available.filter((r) => e.split[r.id] > 0);
      for (const r of used) close(e.times[r.id], e.time);
      for (const r of available) assert.ok(e.times[r.id] >= e.time - 1e-9, `${n}, ${fastTrack ? 'open' : 'closed'}: ${r.id} takes ${e.times[r.id]} < ${e.time}`);
    }
  }
  // Opening the fast track neither helps nor hurts at 80/3 deals a quarter.
  close(breakEven(), 80 / 3);
  close(equilibrium({ deals: 80 / 3, fastTrack: true }).time, equilibrium({ deals: 80 / 3, fastTrack: false }).time);
});

test('fast track uptake: flows on the slider are non-negative and add up to 40', () => {
  for (let k = 0; k <= 40; k += 0.5) {
    const u = uptake(k);
    for (const r of ROUTES) assert.ok(u.split[r.id] >= 0);
    close(u.split.route1 + u.split.route2 + u.split.fast, DEALS);
  }
});
