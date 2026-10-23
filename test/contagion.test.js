import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BANKS,
  CAPITAL,
  LOSS,
  EXTRA,
  INTERBANK_PCT,
  HUB_SEED,
  EXAMPLE,
  ALTERNATIVES,
  SHARES,
  shareOf,
  hubSystem,
  buildNetwork,
  byLinks,
  mostConnected,
  capitalFor,
  landing,
  everywhere,
  holdsAcross,
  cascade,
  absorbs,
  fails,
  layout,
} from '../src/lib/sim/network.js';

const adj = hubSystem();
const order = byLinks(adj);
const links = (b) => adj[b].length;
const rank = (b) => order.indexOf(b);
const results = Object.fromEntries(SHARES.map((s) => [s.value, { capital: capitalFor(adj, s.top), ...everywhere(adj, capitalFor(adj, s.top)) }]));
const count = (sizes, f) => sizes.filter(f).length;

test('stress test: the figure’s network is hub network 7 of the earlier 40', () => {
  assert.equal(BANKS, 48);
  assert.equal(HUB_SEED + EXAMPLE, 15207);
  assert.deepEqual(adj, buildNetwork('hubs', 48, 4, 15207));
  assert.equal(adj.length, BANKS);
  assert.equal(adj.reduce((s, l) => s + l.length, 0) / 2, 93);
  // Links run both ways, never to the bank itself, never twice.
  adj.forEach((l, i) => {
    assert.equal(new Set(l).size, l.length);
    assert.ok(!l.includes(i));
    for (const j of l) assert.ok(adj[j].includes(i));
  });
  // The setup: a few hubs deal with nine or more banks; more than half deal with only two or three.
  const deg = order.map(links);
  assert.deepEqual(deg.slice(0, 6), [19, 10, 9, 9, 8, 7]);
  assert.equal(deg.filter((d) => d >= 9).length, 4);
  assert.equal(deg.filter((d) => d <= 3).length, 28);
  assert.ok(28 > BANKS / 2);
  assert.ok(deg.every((d) => d >= 2));
  assert.equal(order[0], mostConnected(adj));
  // byLinks is a permutation, most connected first.
  assert.deepEqual([...order].sort((a, b) => a - b), adj.map((_, i) => i));
  for (let r = 1; r < BANKS; r++) assert.ok(links(order[r]) <= links(order[r - 1]));
});

test('stress test: the rules and the four ways to share the 48 points', () => {
  assert.equal(INTERBANK_PCT, 20);
  assert.equal(CAPITAL, 5);
  assert.equal(LOSS, 8);
  assert.equal(EXTRA, 48);
  assert.deepEqual(SHARES.map((s) => s.label), ['None', 'Every bank +1', 'Top 12 +4', 'Top bank +48']);
  for (const s of SHARES) {
    // Short labels: at most three words and 18 characters.
    assert.ok(s.label.length <= 18 && s.label.split(' ').length <= 3, s.label);
    const cap = capitalFor(adj, s.top);
    const extra = cap.reduce((a, c) => a + c - CAPITAL, 0);
    assert.equal(extra, s.top ? EXTRA : 0, s.label);
    // Whole points, so the failure threshold stays exact.
    assert.ok(cap.every(Number.isInteger));
    assert.equal(shareOf(s.value), s);
  }
  // The label states what each of the `top` banks gets.
  assert.ok(capitalFor(adj, BANKS).every((c) => c === 6));
  const top12 = capitalFor(adj, 12);
  order.forEach((b, r) => assert.equal(top12[b], r < 12 ? 9 : 5));
  const top1 = capitalFor(adj, 1);
  assert.equal(top1[order[0]], 53);
  assert.equal(top1.filter((c) => c === 5).length, 47);
});

test('stress test: the loss is absorbed only where it does not exceed capital', () => {
  for (const c of [5, 7, 8, 9, 53]) {
    const cap = new Array(BANKS).fill(c);
    for (const b of [order[0], order[20], order[47]]) {
      const r = landing(adj, cap, b);
      assert.equal(r.absorbed, LOSS <= c);
      if (r.absorbed) assert.equal(r.count, 0);
      else assert.equal(r.count, cascade(adj, cap, [b]).count);
    }
  }
  // A loss equal to capital leaves the bank standing.
  assert.equal(landing(adj, new Array(BANKS).fill(LOSS), order[0]).count, 0);
  // One capital for every bank, or one per bank: the same cascade.
  for (const b of [order[0], order[10], order[40]]) assert.deepEqual(cascade(adj, 5, [b]), cascade(adj, new Array(BANKS).fill(5), [b]));
});

test('stress test: robust yet fragile with no extra capital', () => {
  const { sizes, worst, worstAt } = results.none;
  // 22 of 48 landing places bring down only the bank hit; 45 at most nine; three hubs bring down all 48.
  assert.equal(count(sizes, (s) => s === 0), 0);
  assert.equal(count(sizes, (s) => s === 1), 22);
  assert.equal(count(sizes, (s) => s <= 9), 45);
  assert.equal(worst, 48);
  assert.deepEqual(worstAt.map(rank).sort(), [0, 1, 2]);
  assert.equal(count(sizes, (s) => s > 9 && s < 48), 0);
  // The figure opens on the least connected bank: the loss stops there.
  const first = order[BANKS - 1];
  assert.equal(links(first), 2);
  assert.equal(landing(adj, results.none.capital, first).count, 1);
  // The biggest hub brings everyone down in six rounds.
  const big = landing(adj, results.none.capital, order[0]);
  assert.equal(big.count, 48);
  assert.equal(big.waves.length - 1, 6);
});

test('stress test text: why the hubs carry the loss', () => {
  // The biggest hub can lose four of its nineteen partners and stand.
  assert.equal(links(order[0]), 19);
  assert.equal(absorbs(CAPITAL, 19), 4);
  // A bank with two partners lends each 10% of its assets, twice its capital: it falls at the first failure.
  assert.equal(INTERBANK_PCT / 2, 10);
  assert.equal(INTERBANK_PCT / 2, 2 * CAPITAL);
  assert.equal(absorbs(CAPITAL, 2), 0);
  assert.ok(fails(1, 2, CAPITAL));
  // More than a third of the links end at the three biggest hubs.
  const top3 = new Set(order.slice(0, 3));
  let touch = 0;
  let all = 0;
  adj.forEach((l, i) => l.forEach((j) => j > i && (all++, (top3.has(i) || top3.has(j)) && touch++)));
  assert.equal(touch, 35);
  assert.equal(all, 93);
  assert.ok(touch / all > 1 / 3);
});

test('stress test puzzle: only four points each for the 12 most connected keeps the worst to five', () => {
  const ok = SHARES.filter((s) => results[s.value].worst <= 5).map((s) => s.value);
  assert.deepEqual(ok, ['top12']);
  // Found: they absorb the loss and stop the rest, so never more than four banks fall.
  const t = results.top12;
  assert.equal(t.worst, 4);
  order.slice(0, 12).forEach((b) => assert.equal(t.sizes[b], 0));
  assert.equal(count(t.sizes, (s) => s === 0), 12);
  assert.equal(t.worstAt.length, 1);
  assert.equal(links(t.worstAt[0]), 4);
  // Show the answer: the loss on the biggest hub, now absorbed.
  assert.equal(landing(adj, t.capital, order[0]).count, 0);
  // Every bank +1: 6% is still less than the 8% loss; the bank hit falls, and two hubs bring down all 48.
  const e = results.every;
  assert.ok(CAPITAL + 1 < LOSS);
  assert.equal(count(e.sizes, (s) => s === 0), 0);
  assert.equal(e.worst, 48);
  assert.deepEqual(e.worstAt.map(rank).sort(), [0, 1]);
  // Top bank +48: the biggest hub stands, at 53%; a loss at the second (or third) still brings down 47.
  const o = results.top1;
  assert.equal(CAPITAL + EXTRA, 53);
  assert.equal(o.sizes[order[0]], 0);
  assert.equal(o.worst, 47);
  assert.deepEqual(o.worstAt.map(rank).sort(), [1, 2]);
});

test('stress test: the answer is not a fluke of one network', () => {
  assert.equal(ALTERNATIVES, 40);
  assert.equal(holdsAcross(12), 30);
  assert.equal(holdsAcross(BANKS), 0);
  assert.equal(holdsAcross(1), 0);
  assert.equal(holdsAcross(0), 0);
});

test('stress test: the layout fits its frame and is fixed', () => {
  for (const aspect of [1, 1.3, 1.65, 2]) {
    const pos = layout(adj, HUB_SEED + EXAMPLE, 320, aspect);
    assert.deepEqual(pos, layout(adj, HUB_SEED + EXAMPLE, 320, aspect));
    for (const p of pos) {
      assert.ok(p.x >= 0.059 && p.x <= 0.941 && p.y >= 0.059 && p.y <= 0.941, JSON.stringify(p));
    }
    // Banks stay apart: in a 320 px high frame no two centres are closer than 6 px.
    let min = Infinity;
    for (let i = 0; i < BANKS; i++) for (let j = i + 1; j < BANKS; j++) min = Math.min(min, Math.hypot((pos[i].x - pos[j].x) * aspect * 320, (pos[i].y - pos[j].y) * 320));
    assert.ok(min > 6, `aspect ${aspect}: ${min.toFixed(1)} px`);
  }
});

test('stress test: every share and landing place is quick to compute on load', () => {
  const t0 = performance.now();
  for (const s of SHARES) everywhere(adj, capitalFor(adj, s.top));
  for (const aspect of [1, 1.3, 1.65, 2]) layout(adj, HUB_SEED + EXAMPLE, 320, aspect);
  holdsAcross(12);
  holdsAcross(BANKS);
  const ms = performance.now() - t0;
  assert.ok(ms < 300, `${ms.toFixed(0)} ms`);
});

// A star: bank 0 lends to k borrowers, `lost` of which fail at once.
function star(k) {
  return [Array.from({ length: k }, (_, i) => i + 1), ...Array.from({ length: k }, () => [0])];
}

test('contagion rule: how many failed borrowers a bank survives, from the cascade itself', () => {
  for (const c of [2, 5, 6, 9, 10]) {
    for (let k = 1; k <= 20; k++) {
      const s = absorbs(c, k);
      const seeds = (n) => Array.from({ length: n }, (_, i) => i + 1);
      assert.equal(cascade(star(k), c, seeds(s)).failed[0], 0, `${c}% capital, ${k} borrowers, ${s} lost`);
      if (s < k) assert.equal(cascade(star(k), c, seeds(s + 1)).failed[0], 1, `${c}% capital, ${k} borrowers, ${s + 1} lost`);
      assert.equal(fails(s, k, c), false);
    }
  }
});
