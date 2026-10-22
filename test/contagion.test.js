import test from 'node:test';
import assert from 'node:assert/strict';

import { BANKS, TRIALS, CAPITALS, SHOCKS, NETWORKS, SCENES, INTERBANK_PCT, stressTest, stressNetwork, lowestCapital, cascade, mostConnected, absorbs, fails } from '../src/lib/sim/network.js';

const similar = stressTest('similar');
const giants = stressTest('giants');
const at = (c) => CAPITALS.indexOf(c);
const round = (v) => Math.round(v * 100);

test('contagion: one slider, two scenes, fixed networks', () => {
  assert.deepEqual(SCENES, { similar: { network: 'similar', shock: 'five' }, giants: { network: 'giants', shock: 'biggest' } });
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
  // The figure opens on the stress test at 4%: every bank fails.
  assert.equal(five[at(4)], 1);
});

test('contagion text: robust yet fragile at 4%; giants at 6–8%', () => {
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
  // Banks with two or three borrowers fall at the first failure with 6% capital.
  assert.equal(absorbs(6, 2), 0);
  assert.equal(absorbs(6, 3), 0);
  // The 7% that contains the stress test leaves 29%; 8% keeps the giant's fall under a quarter.
  assert.equal(round(giants.mean.biggest[at(7)]), 29);
  assert.equal(lowestCapital(giants, 'biggest', 0.25), 8);
  assert.equal(round(giants.mean.biggest[at(8)]), 18);
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

// A star: bank 0 lends to k borrowers, `lost` of which fail at once.
function star(k) {
  return [Array.from({ length: k }, (_, i) => i + 1), ...Array.from({ length: k }, () => [0])];
}

test('contagion rule: how many failed borrowers a bank survives, from the cascade itself', () => {
  for (const c of CAPITALS) {
    for (let k = 1; k <= 20; k++) {
      const s = absorbs(c, k);
      const seeds = (n) => Array.from({ length: n }, (_, i) => i + 1);
      // Survives s failed borrowers, falls at s + 1, in the cascade the figure runs.
      assert.equal(cascade(star(k), c, seeds(s)).failed[0], 0, `${c}% capital, ${k} borrowers, ${s} lost`);
      if (s < k) assert.equal(cascade(star(k), c, seeds(s + 1)).failed[0], 1, `${c}% capital, ${k} borrowers, ${s + 1} lost`);
      // Losses equal to capital leave a bank standing.
      assert.equal(fails(s, k, c), false);
    }
  }
  assert.equal(INTERBANK_PCT, 20);
  // The rule line under the slider. Many similar banks: ten borrowers (8 and 12 for comparison).
  const line = (c) => [8, 10, 12].map((k) => absorbs(c, k));
  assert.deepEqual(line(4), [1, 2, 2]); // ten: survives two, falls at the third
  assert.deepEqual(line(6), [2, 3, 3]);
  assert.deepEqual(line(7), [2, 3, 4]); // ten: survives three, falls at the fourth
  assert.equal(INTERBANK_PCT / 10, 2);
  // Every step of the slider changes the line for at least one of the three banks.
  for (let i = 1; i < CAPITALS.length; i++) assert.notDeepEqual(line(CAPITALS[i]), line(CAPITALS[i - 1]), `${CAPITALS[i]}%`);
  // A few giants: two borrowers (3 and 4 for comparison); each loan 10% of assets.
  assert.equal(INTERBANK_PCT / 2, 10);
  assert.deepEqual([2, 3, 4].map((k) => absorbs(6, k)), [0, 0, 1]);
  assert.deepEqual([2, 3, 4].map((k) => absorbs(10, k)), [1, 1, 2]);
  // About ten borrowers is typical of the similar banks; two or three of the giants' network.
  let ten = 0;
  for (let t = 0; t < TRIALS; t++) ten += stressNetwork('similar', t).adj.filter((a) => a.length >= 8 && a.length <= 12).length / BANKS / TRIALS;
  assert.ok(ten > 0.6, `similar banks with 8–12 borrowers: ${ten}`);
});
