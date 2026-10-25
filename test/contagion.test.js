import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BANKS,
  CAPITAL,
  CAPITALS,
  LOSS,
  EXTRA,
  LIMIT,
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
  added,
  withinBudget,
  worstCurve,
  tippingPoint,
  partnersToFail,
  holdsAcross,
  worstAcross,
  SYSTEMS,
  SIMILAR_LINKS,
  SIMILAR_SEED,
  SIMILAR_EXAMPLE,
  similarSystem,
  systemOf,
  cascade,
  absorbs,
  fails,
  layout,
} from '../src/lib/sim/network.js';

const adj = hubSystem();
const order = byLinks(adj);
const links = (b) => adj[b].length;
const rank = (b) => order.indexOf(b);
const curves = Object.fromEntries(SHARES.map((s) => [s.value, worstCurve(adj, s.top)]));
const at = (s, c) => curves[s][CAPITALS.indexOf(c)];
const results = { none: { capital: capitalFor(adj, 0), ...everywhere(adj, capitalFor(adj, 0)) } };
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

test('stress test: the rules, the capital slider and the three choices of extra for the hubs', () => {
  assert.equal(INTERBANK_PCT, 20);
  assert.equal(CAPITAL, 5);
  assert.equal(LOSS, 8);
  assert.equal(EXTRA, 48);
  assert.equal(LIMIT, 5);
  assert.deepEqual(CAPITALS, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(SHARES.map((s) => s.label), ['None', '3 biggest +16', '12 biggest +4']);
  for (const s of SHARES) {
    // Short labels: at most three words and 18 characters; no "points", which reads as the game's score.
    assert.ok(s.label.length <= 18 && s.label.split(' ').length <= 3, s.label);
    assert.ok(!/point/i.test(s.label));
    assert.equal(shareOf(s.value), s);
    for (const base of CAPITALS) {
      const cap = capitalFor(adj, s.top, base);
      // The extra comes on top of what every bank holds: 48 percentage points in all.
      assert.equal(cap.reduce((a, c) => a + c - base, 0), s.top ? EXTRA : 0, s.label);
      // Whole percentage points, so the failure threshold stays exact.
      assert.ok(cap.every(Number.isInteger));
    }
    // The label states what each of the `top` banks gets.
    if (s.top) {
      const [n, , plus] = s.label.split(' ');
      assert.equal(Number(n), s.top);
      assert.equal(Number(plus), EXTRA / s.top);
      const cap = capitalFor(adj, s.top);
      order.forEach((b, r) => assert.equal(cap[b], r < s.top ? CAPITAL + EXTRA / s.top : CAPITAL));
    }
  }
  // Capital added counts from today's 5% for every bank.
  assert.equal(added(5, 0), 0);
  assert.equal(added(6, 0), 48);
  assert.equal(added(7, 0), 96);
  assert.equal(added(8, 0), 144);
  assert.equal(added(5, 12), 48);
  assert.equal(added(4, 12), 0);
  assert.equal(added(2, 0), -144);
  assert.ok(withinBudget(5, 12) && withinBudget(6, 0) && !withinBudget(7, 0) && !withinBudget(4, 12) && !withinBudget(6, 3));
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

test('stress test: robust yet fragile at today’s 5%, with no extra', () => {
  const { sizes, worst, worstAt } = results.none;
  // 22 of 48 landing places bring down only the bank hit; 45 at most nine; three hubs bring down all 48.
  assert.equal(count(sizes, (s) => s === 0), 0);
  assert.equal(count(sizes, (s) => s === 1), 22);
  assert.equal(count(sizes, (s) => s <= 9), 45);
  assert.equal(worst, 48);
  assert.deepEqual(worstAt.map(rank).sort(), [0, 1, 2]);
  assert.equal(count(sizes, (s) => s > 9 && s < 48), 0);
  assert.deepEqual(at('none', CAPITAL).sizes, sizes);
  // The figure opens on the biggest hub: everyone falls, in six rounds.
  const big = landing(adj, results.none.capital, order[0]);
  assert.equal(big.count, 48);
  assert.equal(big.waves.length - 1, 6);
  // A small bank, by contrast: the loss stops there.
  const first = order[BANKS - 1];
  assert.equal(links(first), 2);
  assert.equal(landing(adj, results.none.capital, first).count, 1);
});

test('stress test: each bank’s rule, an IF on capital that its loans turn into a quorum of partners', () => {
  // At 5%: a small bank falls if one of its two partners fails; the biggest if five of its nineteen do.
  assert.equal(links(order[0]), 19);
  assert.equal(partnersToFail(CAPITAL, 2), 1);
  assert.equal(partnersToFail(CAPITAL, 19), 5);
  assert.equal(absorbs(CAPITAL, 19), 4);
  // A bank with two partners lends each 10% of its assets, twice its capital: it falls at the first failure.
  assert.equal(INTERBANK_PCT / 2, 2 * CAPITAL);
  assert.ok(fails(1, 2, CAPITAL));
  // The read-out at other capitals: the hub at 9% needs nine of nineteen; a small bank at 10% needs both;
  // at 20% or more nothing a bank's partners do can bring it down.
  assert.equal(partnersToFail(9, 19), 9);
  assert.equal(partnersToFail(10, 2), 2);
  assert.equal(partnersToFail(20, 2), null);
  assert.equal(partnersToFail(21, 19), null);
  for (const c of CAPITALS.concat([9, 21])) {
    for (let n = 2; n <= 19; n++) {
      const k = partnersToFail(c, n);
      if (k === null) assert.ok(!fails(n, n, c));
      else assert.ok(fails(k, n, c) && !fails(k - 1, n, c));
    }
  }
  // More than a third of the links end at the three biggest hubs.
  const top3 = new Set(order.slice(0, 3));
  let touch = 0;
  let all = 0;
  adj.forEach((l, i) => l.forEach((j) => j > i && (all++, (top3.has(i) || top3.has(j)) && touch++)));
  assert.equal(touch, 35);
  assert.equal(all, 93);
});

test('stress test curve: the worst place to land at every capital, and where each choice tips', () => {
  const worst = (s) => curves[s].map((p) => p.worst);
  assert.deepEqual(worst('none'), [48, 48, 48, 48, 48, 8, 0, 0, 0]);
  assert.deepEqual(worst('top3'), [42, 42, 42, 9, 9, 7, 0, 0, 0]);
  assert.deepEqual(worst('top12'), [48, 48, 5, 4, 4, 3, 0, 0, 0]);
  // The tipping point: the steepest fall on each curve. The extra for the 12 biggest moves it from 7% to 4%.
  const tip = (s) => CAPITALS[tippingPoint(curves[s]) + 1];
  assert.equal(tip('none'), 7);
  assert.equal(tip('top3'), 5);
  assert.equal(tip('top12'), 4);
  // After-text: spread evenly, the 48 give every bank 6%, still short of the 8% loss, and changes nothing.
  assert.equal(CAPITAL + EXTRA / BANKS, 6);
  assert.ok(6 < LOSS);
  assert.equal(at('none', 6).worst, 48);
  assert.equal(added(6, 0), EXTRA);
  // At 7% a loss at the biggest bank still brings down eight; at 8% the loss stops where it lands, for 144.
  assert.equal(at('none', 7).worst, 8);
  assert.deepEqual(at('none', 7).worstAt.map(rank), [0]);
  assert.equal(CAPITALS.find((c) => at('none', c).worst === 0), LOSS);
  assert.equal(added(LOSS, 0), 144);
  assert.ok(curves.none.every((p) => p.capital < LOSS || p.sizes.every((s) => s === 0)));
});

test('stress test puzzle: 5% for every bank and four more for the 12 biggest is the only answer', () => {
  const solutions = [];
  for (const s of SHARES) for (const c of CAPITALS) if (at(s.value, c).worst <= LIMIT && withinBudget(c, s.top)) solutions.push([c, s.value]);
  assert.deepEqual(solutions, [[5, 'top12']]);
  // Found: the 12 biggest at 9%; at most four fail; 48 percentage points against 144 for 8% everywhere.
  const t = at('top12', CAPITAL);
  assert.equal(CAPITAL + EXTRA / 12, 9);
  assert.equal(t.worst, 4);
  assert.equal(added(CAPITAL, 12), 48);
  order.slice(0, 12).forEach((b) => assert.equal(t.sizes[b], 0));
  assert.equal(t.worstAt.length, 1);
  assert.equal(links(t.worstAt[0]), 4);
  // Show the answer: the loss on the biggest hub, now absorbed.
  assert.equal(landing(adj, capitalFor(adj, 12, CAPITAL), order[0]).count, 0);
  // Progress lines. 3 biggest +16: the three stand; a loss at the fifth biggest (8 partners) still brings down 9.
  const t3 = at('top3', CAPITAL);
  order.slice(0, 3).forEach((b) => assert.equal(t3.sizes[b], 0));
  assert.equal(t3.worst, 9);
  assert.equal(rank(t3.worstAt[0]), 4);
  assert.equal(links(t3.worstAt[0]), 8);
  // Near misses: 4% with four more for the 12 biggest keeps this network to five, but cuts every bank below today;
  // 6% with four more keeps it to four, for twice the budget.
  assert.equal(at('top12', 4).worst, 5);
  assert.ok(!withinBudget(4, 12));
  assert.equal(at('top12', 6).worst, 4);
  assert.equal(added(6, 12), 96);
});

test('stress test: the answer is not a fluke of one network', () => {
  assert.equal(ALTERNATIVES, 40);
  assert.equal(holdsAcross(12), 30);
  assert.equal(holdsAcross(12, LIMIT, ALTERNATIVES, 4), 15);
  assert.equal(holdsAcross(3), 0);
  assert.equal(holdsAcross(0), 0);
  assert.equal(holdsAcross(0, LIMIT, ALTERNATIVES, LOSS), 40);
});

test('stress test, once solved: many similar banks absorb what the hubs pass on', () => {
  assert.deepEqual(SYSTEMS.map((s) => s.label), ['As it is', 'Many similar banks']);
  for (const s of SYSTEMS) assert.ok(s.label.length <= 18 && s.label.split(' ').length <= 3, s.label);
  assert.deepEqual(systemOf('hubs').network(), adj);
  // The same 48 banks, every pair linked with the same chance, about ten partners each, and no hubs.
  const sim = similarSystem();
  assert.equal(SIMILAR_LINKS, 10);
  assert.equal(SIMILAR_SEED + SIMILAR_EXAMPLE, 2108);
  assert.deepEqual(sim, buildNetwork('random', 48, 10, 2108));
  assert.equal(sim.length, BANKS);
  const deg = sim.map((l) => l.length);
  assert.equal(deg.reduce((a, b) => a + b, 0) / 2, 216);
  assert.ok(Math.abs(deg.reduce((a, b) => a + b, 0) / BANKS - SIMILAR_LINKS) <= 1.5);
  assert.ok(Math.min(...deg) >= 4 && Math.max(...deg) <= 15);
  // Its worst landings, at every capital; it tips between 3% and 4% with no extra (after-text: "their cliff sits at 4%").
  const curve = (top) => worstCurve(sim, top).map((p) => p.worst);
  assert.deepEqual(curve(0), [48, 48, 3, 1, 1, 1, 0, 0, 0]);
  assert.equal(CAPITALS[tippingPoint(worstCurve(sim, 0)) + 1], 4);
  // Extra for the hubs changes little where there are no hubs.
  assert.deepEqual(curve(12), [48, 48, 3, 1, 1, 1, 0, 0, 0]);
  assert.deepEqual(curve(3), [48, 46, 3, 1, 1, 1, 0, 0, 0]);
  // The figure's network is the one of the 40 closest to their average curve.
  const rows = Array.from({ length: ALTERNATIVES }, (_, t) => worstCurve(similarSystem(t), 0).map((p) => p.worst));
  const mean = CAPITALS.map((_, i) => rows.reduce((a, r) => a + r[i], 0) / rows.length);
  const err = rows.map((r) => r.reduce((a, v, i) => a + (v - mean[i]) ** 2, 0));
  assert.equal(err.indexOf(Math.min(...err)), SIMILAR_EXAMPLE);
  // After-text and model note: across the 40, no landing at 5% brings down more than three; the hub
  // shape at 5% loses all 48 to its worst landing in every one of its 40.
  assert.equal(worstAcross('similar', CAPITAL), 3);
  assert.equal(holdsAcross(0, 3, ALTERNATIVES, CAPITAL, 'similar'), 40);
  assert.equal(worstAcross('similar', 3), 48);
  assert.equal(holdsAcross(0, LIMIT, ALTERNATIVES, CAPITAL, 'hubs'), 0);
  // The tipping point moves down: hubs with no extra tip at 7%, similar banks at 4%.
  assert.equal(CAPITALS[tippingPoint(curves.none) + 1], 7);
});

test('stress test: the layouts fit their frame and are fixed', () => {
  for (const [net, seed] of [[adj, HUB_SEED + EXAMPLE], [similarSystem(), SIMILAR_SEED + SIMILAR_EXAMPLE]]) for (const aspect of [1, 1.3, 1.65, 2]) {
    const pos = layout(net, seed, 320, aspect);
    assert.deepEqual(pos, layout(net, seed, 320, aspect));
    for (const p of pos) {
      assert.ok(p.x >= 0.059 && p.x <= 0.941 && p.y >= 0.059 && p.y <= 0.941, JSON.stringify(p));
    }
    // Banks stay apart: in a 320 px high frame no two centres are closer than 6 px.
    let min = Infinity;
    for (let i = 0; i < BANKS; i++) for (let j = i + 1; j < BANKS; j++) min = Math.min(min, Math.hypot((pos[i].x - pos[j].x) * aspect * 320, (pos[i].y - pos[j].y) * 320));
    assert.ok(min > 6, `aspect ${aspect}: ${min.toFixed(1)} px`);
  }
});

test('stress test: every curve and landing place is quick to compute on load', () => {
  const t0 = performance.now();
  for (const s of SHARES) worstCurve(adj, s.top);
  for (const aspect of [1, 1.3, 1.65, 2]) layout(adj, HUB_SEED + EXAMPLE, 320, aspect);
  holdsAcross(12);
  holdsAcross(12, LIMIT, ALTERNATIVES, 4);
  for (const s of SHARES) worstCurve(similarSystem(), s.top);
  worstAcross('similar', CAPITAL);
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
