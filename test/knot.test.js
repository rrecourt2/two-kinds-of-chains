// A chain looped back on itself: circular conditions, knots and the complexity catastrophe.
import test from 'node:test';
import assert from 'node:assert/strict';

import { N, SEED, LINKS, JOINT, RUNS, CLIFF, programme, linksAt, adjacency, knots, resolve, stateAt, cliff, layout, nkStudy } from '../src/lib/sim/knot.js';

// A plain fixpoint, to check the one-pass resolution against.
function slowResolve(out, joint = 1) {
  const { comp, sizes } = knots(out);
  const met = new Array(out.length).fill(false);
  for (let changed = true; changed; ) {
    changed = false;
    for (let c = 0; c < sizes.length; c++) {
      const vs = comp.map((k, v) => (k === c ? v : -1)).filter((v) => v >= 0);
      if (met[vs[0]] || (sizes[c] > 1 && sizes[c] > joint)) continue;
      if (vs.every((v) => out[v].every((w) => comp[w] === c || met[w]))) {
        vs.forEach((v) => (met[v] = true));
        changed = true;
      }
    }
  }
  return met;
}

test('knot: small hand-made programmes', () => {
  // 0 waits for 1, 1 for 2: a chain, all met, in rounds 2, 1, 0.
  let r = resolve([[1], [2], []]);
  assert.deepEqual(r.met, [true, true, true]);
  assert.deepEqual(r.round, [2, 1, 0]);
  assert.equal(r.largest, 1);
  // 0 and 1 wait for each other; 2 waits for 0; 3 is free.
  const out = [[1], [0], [0], []];
  r = resolve(out);
  assert.deepEqual(r.met, [false, false, false, true]);
  assert.equal(r.largest, 2);
  assert.deepEqual(r.inKnot, [true, true, false, false]);
  // A joint closing unties the loop of two, and what waits for it follows.
  r = resolve(out, JOINT);
  assert.deepEqual(r.met, [true, true, true, true]);
  assert.deepEqual(r.closed, [true, true, false, false]);
  // A loop of four (tariff → regulator → law → proof → tariff) is too big for a joint closing of three.
  r = resolve([[1], [2], [3], [0]], JOINT);
  assert.equal(r.metCount, 0);
  assert.equal(r.largest, 4);
});

test('knot: the one-pass resolution agrees with a plain fixpoint', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = programme(seed);
    for (const d of [0.5, 1, 1.5, 2, 3]) {
      const out = adjacency(N, linksAt(p, d));
      for (const j of [1, JOINT]) assert.deepEqual(resolve(out, j).met, slowResolve(out, j), `seed ${seed}, d ${d}, joint ${j}`);
    }
  }
});

test('knot: more links only add links to the same programme', () => {
  const p = programme(SEED);
  let prev = [];
  for (const d of LINKS) {
    const now = linksAt(p, d);
    assert.deepEqual(now.slice(0, prev.length), prev);
    assert.ok(now.every(([i, j]) => i !== j && i < N && j < N));
    prev = now;
  }
  // The designer's prototype (scratchpad r10-adaptive/knot2.mjs), programme 11.
  const p11 = programme(11);
  const D = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  assert.deepEqual(D.map((d) => stateAt(d, { prog: p11 }).metCount), [40, 40, 37, 35, 33, 33, 26, 19, 9, 5, 3]);
  assert.deepEqual(D.map((d) => stateAt(d, { prog: p11 }).largest), [1, 1, 3, 3, 3, 3, 9, 10, 28, 31, 34]);
});

test('knot: the figure’s programme — the numbers in the goal, the found text and the tiles', () => {
  const p = programme(SEED);
  assert.equal(linksAt(p, 1).length, 40, 'one link each on average: exactly 40');
  assert.equal(linksAt(p, 2).length, 80);
  const met = LINKS.map((d) => stateAt(d, { prog: p }).metCount);
  assert.deepEqual(met, [40, 40, 40, 40, 31, 25, 16, 15, 8, 6, 1, 1, 0]);
  for (let k = 1; k < met.length; k++) assert.ok(met[k] <= met[k - 1], 'more links never free a condition');
  const one = stateAt(1, { prog: p });
  const two = stateAt(2, { prog: p });
  assert.equal(one.metCount, 31);
  assert.equal(one.largest, 2, 'at one link each, a loop of two holds up nine');
  assert.equal(two.metCount, 8);
  assert.equal(two.largest, 24);
  assert.equal(two.sizes.filter((s) => s > 1).length, 1, 'at two, one knot');
  // Joint closings: all forty at one link each, nothing more at two.
  assert.equal(stateAt(1, { prog: p, joint: JOINT }).metCount, 40);
  assert.equal(stateAt(2, { prog: p, joint: JOINT }).metCount, 8);
  // The puzzle: "about 8" is the closest choice, for this programme and on average.
  const near = (v) => [28, 16, 8].reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  assert.equal(near(two.metCount), 8);
  assert.equal(near(CLIFF.one[LINKS.indexOf(2)]), 8);
});

test('knot: the across-many-programmes table and the after-text numbers', () => {
  const one = cliff(LINKS, { runs: RUNS });
  const joint = cliff(LINKS, { runs: RUNS, joint: JOINT });
  one.forEach((r, k) => assert.ok(Math.abs(r.met - CLIFF.one[k]) < 0.006, `one at ${r.d}: ${r.met}`));
  joint.forEach((r, k) => assert.ok(Math.abs(r.met - CLIFF.joint[k]) < 0.006, `joint at ${r.d}: ${r.met}`));
  const at = (rows, d) => rows[LINKS.indexOf(d)];
  const pct = (v) => Math.round(v * 100);
  // “98% at half a link each to 78% at one, 41% at one and a half and 20% at two.”
  assert.deepEqual([0.5, 1, 1.5, 2].map((d) => pct(at(one, d).share)), [98, 78, 41, 20]);
  // “Programmes that can be met in full fall from 83% to 32%, 4% and none.”
  assert.deepEqual([0.5, 1, 1.5, 2].map((d) => pct(at(one, d).full)), [83, 32, 4, 0]);
  // “25 of the 40, on average, at two links each.”
  assert.equal(Math.round(at(one, 2).largest), 25);
  // Joint closings help small knots, not the big one: 78% → 86% at one link, 20% → 21% at two.
  assert.equal(pct(at(joint, 1).share), 86);
  assert.equal(pct(at(joint, 2).share), 21);
});

test('knot: the layout is fixed, inside the box and uncrowded', () => {
  const p = programme(SEED);
  for (const aspect of [0.8, 1, 1.6, 2, 2.4]) {
    const a = layout(p, { aspect });
    const b = layout(p, { aspect });
    assert.deepEqual(a, b);
    assert.equal(a.length, N);
    let min = Infinity;
    for (let i = 0; i < N; i++) {
      assert.ok(a[i].x >= 0 && a[i].x <= aspect && a[i].y >= 0 && a[i].y <= 1);
      for (let j = i + 1; j < N; j++) min = Math.min(min, Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y));
    }
    assert.ok(min > 0.045, `aspect ${aspect}: closest pair ${min.toFixed(3)}`);
  }
});

test('knot: Kauffman’s complexity catastrophe, twelve settings', () => {
  const pct = (v) => Math.round(v * 100);
  // “With no dependencies, all hundred reach the best design”
  const k0 = nkStudy(0);
  assert.equal(pct(k0.best), 100);
  assert.equal(Math.round(k0.peaks), 1);
  // “with three each, 15 do”
  assert.equal(pct(nkStudy(3).best), 15);
  // “with every choice tied to every other, one does … one of some 315 dead ends”
  const k11 = nkStudy(11);
  assert.equal(pct(k11.best), 1);
  assert.equal(Math.round(k11.peaks), 315);
  // “Kept inside modules of four, with each module’s team trying its choices together … all hundred”
  assert.equal(pct(nkStudy(3, { modular: true, style: 'module' }).best), 100);
  // Modules alone are not the whole of it: one change at a time, they still stall.
  assert.ok(nkStudy(3, { modular: true }).best < 0.1);
});
