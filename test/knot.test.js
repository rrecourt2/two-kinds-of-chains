// A chain tied in a knot: circular conditions, knots and the complexity catastrophe.
import test from 'node:test';
import assert from 'node:assert/strict';

import { N, SEED, LINKS, JOINT, RUNS, CLIFF, START, ASKED, NAMES, programme, linksAt, adjacency, knots, resolve, stateAt, trace, placeLabels, cliff, layout, nkStudy } from '../src/lib/sim/knot.js';

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
    for (const c of [20, 40, 60, 80, 120]) {
      const out = adjacency(N, linksAt(p, c));
      for (const j of [1, JOINT]) assert.deepEqual(resolve(out, j).met, slowResolve(out, j), `seed ${seed}, ${c} links, joint ${j}`);
    }
  }
});

test('knot: the slider counts links, and more links only add to the same programme', () => {
  const p = programme(SEED);
  let prev = [];
  for (const c of LINKS) {
    const now = linksAt(p, c);
    assert.equal(now.length, c);
    assert.deepEqual(now.slice(0, prev.length), prev);
    assert.ok(now.every(([i, j]) => i !== j && i < N && j < N));
    assert.equal(new Set(now.map(([i, j]) => `${i}-${j}`)).size, c, 'no link twice');
    prev = now;
  }
  assert.deepEqual(LINKS, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
  assert.equal(START, N, 'the puzzle opens at one link per condition');
  assert.equal(ASKED, 2 * N);
});

test('knot: the figure’s programme — the numbers in the goal, the found text and the tiles', () => {
  const p = programme(SEED);
  const met = LINKS.map((c) => stateAt(c, { prog: p }).metCount);
  assert.deepEqual(met, [40, 40, 40, 40, 31, 27, 16, 15, 8, 6, 1, 0, 0]);
  for (let k = 1; k < met.length; k++) assert.ok(met[k] <= met[k - 1], 'more links never free a condition');
  // Below one link per condition there is no knot at all: the cliff starts at 40.
  for (const c of [0, 10, 20, 30]) assert.equal(stateAt(c, { prog: p }).largest, 1);
  const one = stateAt(START, { prog: p });
  const two = stateAt(ASKED, { prog: p });
  assert.equal(one.metCount, 31);
  assert.equal(one.largest, 2, 'at 40 links, a knot of two holds up nine');
  assert.equal(two.metCount, 8);
  assert.equal(two.largest, 24);
  assert.equal(two.sizes.filter((s) => s > 1).length, 1, 'at 80, one knot');
  // Joint closings: “a joint closing frees the other nine” at 40; nothing more at 80.
  assert.equal(stateAt(START, { prog: p, joint: JOINT }).metCount, 40);
  assert.equal(stateAt(ASKED, { prog: p, joint: JOINT }).metCount, 8);
  // The puzzle: "about 8" is the closest choice, for this programme and on average.
  const near = (v) => [28, 16, 8].reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  assert.equal(near(two.metCount), 8);
  assert.equal(near(CLIFF.one[LINKS.indexOf(ASKED)]), 8);
  // Before the first answer the slider stops at 40: nothing up to 40 gives the answer away.
  assert.ok(LINKS.filter((c) => c <= START).every((c) => stateAt(c, { prog: p }).metCount >= one.metCount));
});

test('knot: the names — the equity and the loan open the figure as its only knot', () => {
  const p = programme(SEED);
  assert.equal(NAMES.length, N);
  assert.equal(new Set(NAMES).size, N, 'forty different conditions');
  assert.ok(NAMES.every((n) => n.length <= 24), 'short enough to label on a phone');
  const id = (n) => NAMES.indexOf(n);
  const [equity, loan] = [id('Equity paid in'), id('Loan ready to disburse')];
  const one = stateAt(START, { prog: p });
  const knot = one.comp.map((c, v) => (one.inKnot[v] ? v : -1)).filter((v) => v >= 0);
  assert.deepEqual(knot.sort((a, b) => a - b), [equity, loan].sort((a, b) => a - b));
  assert.ok(one.out[equity].includes(loan) && one.out[loan].includes(equity));
  // At 80 links, the reform's own knot (tariff → regulator → law → proof that tariffs cover costs →
  // tariff) is closed, and it sits in the same knot as the equity and the loan.
  const two = stateAt(ASKED, { prog: p });
  const reform = ['Tariff rise', 'Regulator appointed', 'Utility law passed', 'Tariffs cover costs'].map(id);
  assert.deepEqual(trace(two, reform[0]).path, [...reform, reform[0]]);
  assert.ok([...reform, loan].every((v) => two.comp[v] === two.comp[equity]));
  // Up to 40 links, no part of the reform's knot is in place but the tariff rise waiting for the regulator and the proof waiting for the tariff.
  assert.ok(!stateAt(START, { prog: p }).out[reform[2]].includes(reform[3]));
});

test('knot: tracing a condition back to its knot', () => {
  const p = programme(SEED);
  const one = stateAt(START, { prog: p });
  const id = (n) => NAMES.indexOf(n);
  const names = (path) => path.map((v) => NAMES[v]);
  // The figure opens on the condition furthest behind the knot.
  const behind = one.met.map((m, v) => trace(one, v)).filter((t) => t.kind === 'behind');
  assert.equal(behind.length, 7, 'seven stuck behind the knot of two');
  const longest = behind.reduce((a, b) => (b.path.length > a.path.length ? b : a));
  assert.deepEqual(names(longest.path), [
    'Co-lender’s loan signed',
    'Government guarantee',
    'PPA signed',
    'Tariffs cover costs',
    'Tariff rise',
    'Construction started',
    'EPC advance paid',
    'Equity paid in',
  ]);
  // Every step of a path is a real link, through stuck conditions, ending in a knot.
  for (let v = 0; v < N; v++) {
    for (const st of [one, stateAt(ASKED, { prog: p }), stateAt(60, { prog: p, joint: JOINT })]) {
      const t = trace(st, v);
      t.path.slice(1).forEach((w, k) => assert.ok(st.out[t.path[k]].includes(w)));
      if (t.kind === 'met') assert.ok(st.met[v] && !st.closed[v]);
      if (t.kind === 'behind') {
        assert.ok(!st.met[v] && !st.inKnot[v] && st.inKnot[t.path.at(-1)]);
        assert.ok(t.path.every((w) => !st.met[w]));
      }
      if (t.kind === 'knot' || t.kind === 'closed') assert.ok(st.inKnot[v] && t.path[0] === v && t.path.at(-1) === v);
    }
  }
  assert.deepEqual(trace(one, id('Equity paid in')), { kind: 'knot', path: [id('Equity paid in'), id('Loan ready to disburse'), id('Equity paid in')] });
  assert.equal(trace(stateAt(START, { prog: p, joint: JOINT }), id('Equity paid in')).kind, 'closed');
  assert.equal(trace(one, id('Project accounts opened')).kind, 'met');
});

test('knot: the names on the figure fit, on a phone and on a desk', () => {
  const p = programme(SEED);
  const id = (n) => NAMES.indexOf(n);
  const cases = [
    [START, id('Co-lender’s loan signed')],
    [START, id('Equity paid in')],
    [ASKED, id('Tariff rise')],
  ];
  for (const [count, picked] of cases)
    for (const width of [256, 288, 311, 560, 620]) {
      // As the chapter sizes its figure.
      const compact = width < 480;
      const H = compact ? Math.round(Math.min(330, Math.max(260, width * 1.02))) : 310;
      const r = compact ? 5.5 : 6.5;
      const aspect = Math.max(0.8, Math.min(2.4, Math.round((width / H) * 5) / 5));
      const pos = layout(p, { aspect }).map((q) => ({ x: 12 + (q.x / aspect) * (width - 24), y: 12 + q.y * (H - 24) }));
      const ids = [...new Set([picked, id('Equity paid in'), id('Loan ready to disburse')])];
      const labels = placeLabels({ ids, pos, text: (v) => NAMES[v], width: (t) => t.length * 6.3 + 4, box: { width, height: H }, r });
      assert.equal(labels.length, ids.length, `${count} links, ${width}px: every name placed`);
      for (const l of labels) assert.ok(l.x0 >= 2 && l.x1 <= width - 2 && l.y0 >= 1 && l.y1 <= H - 1, `${NAMES[l.v]} inside at ${width}px`);
      for (let a = 0; a < labels.length; a++)
        for (let b = a + 1; b < labels.length; b++) {
          const [u, w] = [labels[a], labels[b]];
          assert.ok(!(u.x0 < w.x1 && u.x1 > w.x0 && u.y0 < w.y1 && u.y1 > w.y0), `${NAMES[u.v]} and ${NAMES[w.v]} apart at ${width}px`);
        }
    }
});

test('knot: the across-many-programmes table and the after-text numbers', () => {
  const one = cliff(LINKS, { runs: RUNS });
  const joint = cliff(LINKS, { runs: RUNS, joint: JOINT });
  one.forEach((r, k) => assert.ok(Math.abs(r.met - CLIFF.one[k]) < 0.006, `one at ${r.count}: ${r.met}`));
  joint.forEach((r, k) => assert.ok(Math.abs(r.met - CLIFF.joint[k]) < 0.006, `joint at ${r.count}: ${r.met}`));
  one.forEach((r, k) => assert.ok(Math.abs(r.full * 100 - CLIFF.full[k]) < 0.06, `full at ${r.count}: ${r.full}`));
  one.forEach((r, k) => assert.ok(Math.abs(r.largest - CLIFF.largest[k]) < 0.006, `largest at ${r.count}: ${r.largest}`));
  const at = (rows, c) => rows[LINKS.indexOf(c)];
  const pct = (v) => Math.round(v * 100);
  // “falls from 98% at 20 links to 80% at 40, 40% at 60 and 18% at 80.”
  assert.deepEqual([20, 40, 60, 80].map((c) => pct(at(one, c).share)), [98, 80, 40, 18]);
  // “Programmes that can be met in full fall from 84% to 30%, 1% and none.” (29.5% of 3,000)
  assert.deepEqual([20, 40, 60, 80].map((c) => Math.round(at(one, c).full * 1000)), [840, 295, 14, 0]);
  // “26 of the 40, on average, at 80 links.”
  assert.equal(Math.round(at(one, ASKED).largest), 26);
  // Joint closings help small knots, not the big one: 80% → 88% at 40 links, 18.5% → 19.5% at 80.
  assert.equal(pct(at(joint, START).share), 88);
  assert.equal(Math.round(at(joint, ASKED).share * 1000), 195);
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
