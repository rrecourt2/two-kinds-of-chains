// A chain tied in a knot: one power deal of nine documents and twelve clauses, its three rings, the
// fewest clauses to move after the money, random deals, and Kauffman's complexity catastrophe.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOCS,
  CLAUSES,
  N,
  MOVABLE,
  ANSWER,
  FEWEST,
  LAYOUTS,
  DEALS,
  MAX_CLAUSES,
  DEAL_TABLE,
  rings,
  chain,
  solutions,
  fewest,
  ringsThrough,
  randomDeal,
  randomDeals,
  signable,
  largestKnot,
  fewestCuts,
  nkStudy,
} from '../src/lib/sim/knot.js';

const id = (key) => DOCS.findIndex((d) => d.key === key);
const clause = (from, to) => CLAUSES.findIndex((c) => c.from === id(from) && c.to === id(to));
const names = (ds) => ds.map((d) => DOCS[d].name);

test('knot: nine documents, twelve clauses, three that cannot move', () => {
  assert.equal(N, 9);
  assert.equal(new Set(DOCS.map((d) => d.key)).size, N);
  assert.equal(CLAUSES.length, 12);
  assert.equal(new Set(CLAUSES.map((c) => `${c.from}-${c.to}`)).size, 12, 'no clause twice');
  for (const c of CLAUSES) {
    assert.ok(c.from !== c.to && c.from >= 0 && c.to >= 0 && c.from < N && c.to < N);
    assert.ok(!!c.after !== !!c.lock, 'each clause either moves, with new wording, or has a reason it cannot');
    assert.ok(c.text.endsWith('.') && (c.after ?? c.lock).endsWith('.'));
  }
  assert.equal(CLAUSES.filter((c) => c.lock).length, 3);
  assert.equal(MOVABLE.length, 9);
  // Every document takes part in at least one clause.
  for (let d = 0; d < N; d++) assert.ok(CLAUSES.some((c) => c.from === d || c.to === d), DOCS[d].name);
});

test('knot: rings are real cycles of clauses in force, each found once', () => {
  for (const moved of [[], [ANSWER[1]], [ANSWER[0]], ANSWER, [clause('loan', 'equity'), clause('colender', 'equity')]]) {
    const rs = rings(moved);
    const seen = new Set();
    for (const r of rs) {
      assert.ok(r.every((k) => !moved.includes(k)));
      r.forEach((k, i) => assert.equal(CLAUSES[k].to, CLAUSES[r[(i + 1) % r.length]].from, 'consecutive clauses chain'));
      assert.equal(new Set(r.map((k) => CLAUSES[k].from)).size, r.length, 'no document twice');
      const key = [...r].sort((a, b) => a - b).join(',');
      assert.ok(!seen.has(key));
      seen.add(key);
    }
    // No ring left means the whole chain can be signed, and the other way round.
    assert.equal(rs.length === 0, chain(moved).signed === N);
  }
});

test('knot: the deal as signed — three in order, five on three rings, the hedge behind them', () => {
  const s = chain([]);
  assert.equal(s.signed, 3);
  assert.deepEqual(names(s.order), ['Land lease', 'Permit', 'EPC contract']);
  assert.deepEqual(names(DOCS.map((_, d) => d).filter((d) => s.onRing[d])), ['Tariff decree', 'PPA', 'Loan', 'Co-lender', 'Equity']);
  assert.deepEqual(names(DOCS.map((_, d) => d).filter((d) => s.behind[d])), ['Hedge']);
  assert.equal(s.rings.length, 3, 'three rings, all through the loan');
  assert.ok(s.rings.every((r) => r.some((k) => CLAUSES[k].from === id('loan'))));
  const ringDocs = s.rings.map((r) => r.map((k) => DOCS[CLAUSES[k].from].key).sort().join(' ')).sort();
  assert.deepEqual(ringDocs, ['colender equity loan', 'equity loan', 'loan ppa tariff']);
  // The card opens on the loan and the equity, each waiting for the other: a ring of two.
  assert.ok(s.rings.some((r) => r.length === 2 && r.includes(clause('equity', 'loan')) && r.includes(clause('loan', 'equity'))));
  // This deal's own knot: the five documents on its rings, tied together.
  assert.equal(largestKnot(N, CLAUSES.map((c) => [c.from, c.to])), 5);
  // Every clause in force runs from an earlier number to a later one among signed documents.
  for (const moved of [[], ANSWER, [ANSWER[1]]]) {
    const st = chain(moved);
    CLAUSES.forEach((c, k) => {
      if (moved.includes(k) || !st.number[c.to]) return;
      assert.ok(st.number[c.from] && st.number[c.from] < st.number[c.to]);
    });
  }
});

test('knot: two clauses is the fewest, and only one pair does it', () => {
  assert.equal(fewest(), FEWEST);
  assert.equal(FEWEST, 2);
  assert.deepEqual(solutions(1), []);
  assert.deepEqual(solutions(2), [[...ANSWER].sort((a, b) => a - b)]);
  assert.deepEqual(ANSWER, [clause('equity', 'loan'), clause('loan', 'tariff')]);
  // Three moves work in eight ways: the pair plus any other, or the regulator's with both sponsors' clauses.
  assert.equal(solutions(3).length, 8);
  assert.ok(solutions(3).some((x) => x.includes(clause('loan', 'equity')) && x.includes(clause('colender', 'equity')) && !x.includes(clause('equity', 'loan'))));
  const done = chain(ANSWER);
  assert.equal(done.signed, N);
  assert.deepEqual(names(done.order), ['Land lease', 'Permit', 'EPC contract', 'Tariff decree', 'PPA', 'Loan', 'Co-lender', 'Equity', 'Hedge']);
  // The padlocks are what make the pair unique: with every clause free to move, two is still the
  // fewest, but other pairs would do.
  assert.equal(fewestCuts(N, CLAUSES.map((c) => [c.from, c.to])), 2);
});

test('knot: a clause on two rings cuts both — the steps of the answer', () => {
  const s = chain([]);
  const [equity, tariff] = ANSWER;
  // The obvious first ring: through the tariff decree, two of its three clauses padlocked.
  const tariffRing = s.rings.find((r) => r.includes(tariff));
  assert.equal(tariffRing.length, 3);
  assert.deepEqual(tariffRing.filter((k) => !CLAUSES[k].lock), [tariff]);
  assert.equal(s.ringsOf[tariff], 1);
  // The lenders' equity-first clause sits on two rings: the ring of two and the co-lender's.
  assert.equal(s.ringsOf[equity], 2, 'the found text: a clause that sat on two rings');
  assert.equal(s.ringsOf[clause('loan', 'equity')], 1, 'the sponsors’ own clause, on one');
  assert.equal(CLAUSES.map((c, k) => k).filter((k) => s.ringsOf[k] > 1).length, 1, 'only one clause sits on two rings');
  // Between them, every ring: the after-text's "sat on all three".
  assert.equal(s.rings.filter((r) => r.some((k) => ANSWER.includes(k))).length, s.rings.length);
  assert.equal(ringsThrough(equity, []).length, 2);
  // Step one: the provisional tariff frees the decree and the PPA, leaving the loan, the co-lender and the equity.
  const one = chain([tariff]);
  assert.equal(one.signed, 5);
  assert.equal(one.rings.length, 2);
  assert.deepEqual(names(DOCS.map((_, d) => d).filter((d) => one.onRing[d])), ['Loan', 'Co-lender', 'Equity']);
  // A tempting step that costs a move: the sponsors' own clause cuts the ring of two, not the co-lender's.
  const tempt = chain([tariff, clause('loan', 'equity')]);
  assert.equal(tempt.rings.length, 1);
  assert.equal(tempt.signed, 5, 'and frees nothing');
  // A clause off every ring cuts no ring; only the hedge's own clause frees anything (the hedge).
  for (const k of MOVABLE.filter((k) => !s.ringsOf[k])) {
    assert.equal(chain([k]).rings.length, s.rings.length);
    assert.equal(chain([k]).signed, s.signed + (k === clause('loan', 'hedge') ? 1 : 0));
  }
  // The padlocks: two on the tariff ring (the law, the PPA that repays the loan), one on the co-lender's.
  assert.deepEqual(
    CLAUSES.map((c, k) => k).filter((k) => CLAUSES[k].lock).map((k) => `${DOCS[CLAUSES[k].from].key}-${DOCS[CLAUSES[k].to].key}`),
    ['tariff-ppa', 'ppa-loan', 'loan-colender'],
  );
  assert.ok(CLAUSES.every((c, k) => !c.lock || s.ringsOf[k] > 0), 'every padlock sits on a ring');
});

test('knot: random deals of nine documents — the table and the after-text numbers', () => {
  const rows = randomDeals();
  assert.equal(rows.length, MAX_CLAUSES + 1);
  rows.forEach((r, m) => {
    assert.ok(Math.abs(r.inOrder * 100 - DEAL_TABLE.inOrder[m]) < 0.051, `in order at ${m}: ${r.inOrder}`);
    assert.ok(Math.abs(r.largest - DEAL_TABLE.largest[m]) < 0.0051, `largest at ${m}: ${r.largest}`);
    if (m) assert.ok(r.inOrder <= rows[m - 1].inOrder, 'more clauses never help');
  });
  // "82% can be signed in order with five clauses, 40% with nine and 13% with twelve, as here"
  assert.deepEqual([5, 9, 12].map((m) => Math.round(DEAL_TABLE.inOrder[m])), [82, 40, 13]);
  assert.equal(CLAUSES.length, 12);
  // "under 1%" at eighteen, two per document, the end of the axis.
  assert.equal(MAX_CLAUSES, 2 * N);
  assert.ok(DEAL_TABLE.inOrder[MAX_CLAUSES] > 0 && DEAL_TABLE.inOrder[MAX_CLAUSES] < 0.5);
  // "at eighteen, the largest knot holds about seven of the nine documents on average"
  assert.equal(Math.round(DEAL_TABLE.largest[MAX_CLAUSES]), 7);
  // The tipping point: the curve falls fastest around one clause per document.
  const drop = DEAL_TABLE.inOrder.slice(1).map((v, m) => DEAL_TABLE.inOrder[m] - v);
  const steepest = drop.indexOf(Math.max(...drop)) + 1;
  assert.ok(steepest >= N - 2 && steepest <= N + 2, `steepest at ${steepest}`);
  assert.equal(DEALS, 1000);
});

test('knot: random deals — the parts', () => {
  const d = randomDeal(7);
  assert.equal(d.length, N * (N - 1));
  assert.equal(new Set(d.map(([a, b]) => `${a}-${b}`)).size, d.length);
  assert.equal(signable(3, [[0, 1], [1, 2]]), 3);
  assert.equal(signable(3, [[0, 1], [1, 0]]), 1);
  assert.equal(largestKnot(4, [[0, 1], [1, 2], [2, 0], [2, 3]]), 3);
  assert.equal(fewestCuts(4, [[0, 1], [1, 2], [2, 0], [2, 3]]), 1);
  assert.equal(fewestCuts(4, [[0, 1], [1, 0], [2, 3], [3, 2]]), 2);
});

test('knot: both drawings put every document on its own spot, and no clause crosses another', () => {
  const cross = (p1, p2, p3, p4) => {
    const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const [d1, d2, d3, d4] = [d(p3, p4, p1), d(p3, p4, p2), d(p1, p2, p3), d(p1, p2, p4)];
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  // Cells as drawn on a desk, and on a phone 375 and 320 pixels wide (three by three each).
  for (const [name, lay, cw, rh] of [['wide', LAYOUTS.wide, 179, 96], ['tall', LAYOUTS.tall, 96, 84], ['tall', LAYOUTS.tall, 78, 84]]) {
    const pos = DOCS.map((d) => ({ x: (lay.at[d.key][0] + 0.5) * cw, y: (lay.at[d.key][1] + 0.5) * rh }));
    assert.ok(DOCS.every((d) => lay.at[d.key][0] < lay.cols && lay.at[d.key][1] < lay.rows));
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) assert.ok(Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y) > 70, `${name}: ${DOCS[a].name} and ${DOCS[b].name} apart`);
    const seg = CLAUSES.map((c) => [pos[c.from], pos[c.to], c.from, c.to]);
    for (let i = 0; i < seg.length; i++) {
      for (let j = i + 1; j < seg.length; j++) {
        const shared = [seg[i][2], seg[i][3]].some((v) => v === seg[j][2] || v === seg[j][3]);
        if (!shared) assert.ok(!cross(seg[i][0], seg[i][1], seg[j][0], seg[j][1]), `${name}: clauses ${i} and ${j} cross`);
      }
      // No clause runs through a third document (its box, roughly).
      for (let d = 0; d < N; d++) {
        if (d === seg[i][2] || d === seg[i][3]) continue;
        const [p, q] = seg[i];
        for (let t = 0.05; t < 1; t += 0.05) {
          const x = p.x + (q.x - p.x) * t;
          const y = p.y + (q.y - p.y) * t;
          assert.ok(!(Math.abs(x - pos[d].x) < 36 && Math.abs(y - pos[d].y) < 17), `${name}: clause ${i} runs through ${DOCS[d].name}`);
        }
      }
    }
  }
});

test('knot: Kauffman’s complexity catastrophe, twelve settings', () => {
  const pct = (v) => Math.round(v * 100);
  // With no dependencies, every team reaches the best design.
  const k0 = nkStudy(0);
  assert.equal(pct(k0.best), 100);
  assert.equal(Math.round(k0.peaks), 1);
  // “when each of twelve design choices depends on every other, teams … stall at one of some 315 dead ends”
  const k11 = nkStudy(11);
  assert.equal(pct(k11.best), 1);
  assert.equal(Math.round(k11.peaks), 315);
  // “Kept inside modules, the same dependencies let every team reach the best design.”
  assert.equal(pct(nkStudy(3, { modular: true, style: 'module' }).best), 100);
  // Modules alone are not the whole of it: one change at a time, they still stall.
  assert.ok(nkStudy(3, { modular: true }).best < 0.1);
});
