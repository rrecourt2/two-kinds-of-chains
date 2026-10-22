import test from 'node:test';
import assert from 'node:assert/strict';

import { BANKS, TRIALS, CAPITALS, SHOCKS, NETWORKS, stressTest, stressNetwork, lowestCapital, cascade, mostConnected } from '../src/lib/sim/network.js';

const similar = stressTest('similar');
const giants = stressTest('giants');
const at = (c) => CAPITALS.indexOf(c);
const round = (v) => Math.round(v * 100);

test('contagion: three controls, fixed networks', () => {
  assert.deepEqual(CAPITALS, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(SHOCKS, ['one', 'five', 'biggest']);
  assert.equal(BANKS, 48);
  assert.equal(TRIALS, 40);
  let similarLinks = 0;
  let small = 0;
  let biggest = 0;
  for (let t = 0; t < TRIALS; t++) {
    similarLinks += stressNetwork('similar', t).adj.reduce((s, a) => s + a.length, 0) / BANKS / TRIALS;
    const { adj, first } = stressNetwork('giants', t);
    small += adj.filter((a) => a.length <= 3).length / BANKS / TRIALS;
    biggest += adj[first.biggest[0]].length / TRIALS;
    assert.equal(first.biggest[0], mostConnected(adj));
    assert.equal(new Set(first.five).size, 5);
    assert.equal(first.one[0], first.five[0]);
  }
  // Many similar banks: about ten counterparties each.
  assert.ok(Math.abs(similarLinks - 10) < 0.5, `similar banks have ${similarLinks.toFixed(2)} counterparties`);
  // A few giants: most banks have two or three counterparties; the biggest has about seventeen.
  assert.ok(small > 0.6 && small < 0.75, `share with two or three counterparties ${small}`);
  assert.ok(biggest > 14 && biggest < 20, `biggest bank's counterparties ${biggest}`);
});

test('contagion: results are deterministic and never rise with capital', () => {
  const again = stressTest('similar');
  assert.deepEqual(again.mean, similar.mean);
  assert.equal(again.typical, similar.typical);
  for (const run of [similar, giants]) {
    for (const s of SHOCKS) {
      for (let i = 1; i < CAPITALS.length; i++) {
        assert.ok(run.mean[s][i] <= run.mean[s][i - 1] + 1e-12, `${run.kind} ${s} rises at ${CAPITALS[i]}%`);
        for (let t = 0; t < TRIALS; t++) assert.ok(run.shares[s][i][t] <= run.shares[s][i - 1][t]);
      }
    }
  }
});

test('contagion: the 40 networks are representative of 4,000', () => {
  for (const kind of ['similar', 'giants']) {
    const run = kind === 'similar' ? similar : giants;
    const ref = stressTest(kind, { trials: 4000, seed: 9_000_000 });
    for (const s of SHOCKS) {
      run.mean[s].forEach((m, i) => assert.ok(Math.abs(m - ref.mean[s][i]) < 0.05, `${kind} ${s} at ${CAPITALS[i]}%: ${round(m)}% vs ${round(ref.mean[s][i])}%`));
    }
    if (kind === 'similar') assert.equal(lowestCapital(ref, 'five'), lowestCapital(run, 'five'));
  }
});

test('contagion puzzle: the stress test holds from 7% capital', () => {
  const five = similar.mean.five;
  assert.equal(lowestCapital(similar, 'five', 0.25), 7);
  // The numbers in the found text.
  assert.equal(round(five[at(5)]), 80);
  assert.equal(round(five[at(6)]), 30);
  assert.equal(round(five[at(7)]), 12);
  assert.ok(five[at(6)] >= 0.25 && five[at(7)] < 0.25);
  const worstExtra = Math.round(Math.max(...similar.shares.five[at(7)]) * BANKS) - 5;
  assert.equal(worstExtra, 3);
  // Two points of capital: a collapse in most networks at 5%, in none at 7%.
  assert.ok(similar.collapses.five[at(5)] > TRIALS / 2);
  assert.equal(similar.collapses.five[at(7)], 0);
  // The default figure (similar banks, one bank fails, 4%) is not the stress test, and 4% fails it.
  assert.ok(five[at(4)] >= 0.25);
});

test('contagion text: robust yet fragile at 4%; giants at 6%', () => {
  // One failure is absorbed: 1.2 banks fail on average, the one hit and seldom another.
  assert.equal((similar.mean.one[at(4)] * BANKS).toFixed(1), '1.2');
  const spread = similar.shares.one[at(4)].filter((x) => Math.round(x * BANKS) > 1).length;
  assert.ok(spread <= TRIALS / 8, `one failure spreads in ${spread} of ${TRIALS}`);
  assert.equal(similar.collapses.one[at(4)], 0);
  // Five at once bring down all 48, in every network.
  assert.ok(similar.shares.five[at(4)].every((x) => x === 1));
  // With enough capital, the losses die out within a round or two.
  for (let t = 0; t < TRIALS; t++) {
    const { adj, first } = stressNetwork('similar', t);
    for (const c of [7, 8, 9, 10]) assert.ok(cascade(adj, c, first.five).waves.length - 1 <= 2);
  }
  // A few giants at 6%: a random failure stays small; the biggest bank takes nearly all.
  assert.equal(round(giants.mean.one[at(6)]), 14);
  assert.equal(round(giants.mean.biggest[at(6)]), 96);
});

test('contagion: the example network is one of the 40 and follows the averages', () => {
  for (const run of [similar, giants]) {
    assert.ok(run.typical >= 0 && run.typical < TRIALS);
    const { adj, first } = stressNetwork(run.kind, run.typical);
    // Contained at the answer, a collapse well below it.
    if (run.kind === 'similar') {
      assert.ok(cascade(adj, 7, first.five).count < BANKS / 4);
      assert.equal(cascade(adj, 4, first.five).count, BANKS);
    } else {
      assert.equal(cascade(adj, 6, first.biggest).count, BANKS);
      assert.ok(cascade(adj, 6, first.one).count < BANKS / 4);
    }
  }
});

test('contagion: the stress test is quick enough to compute on load', () => {
  const t0 = performance.now();
  for (const kind of Object.keys(NETWORKS)) stressTest(kind);
  const ms = performance.now() - t0;
  assert.ok(ms < 400, `${ms.toFixed(0)} ms`);
});
