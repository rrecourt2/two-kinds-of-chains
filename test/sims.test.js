import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateMonth, coverageOdds } from '../src/lib/sim/presence.js';
import { DESIGNS, averagePayoff, chainSuccess, sampleRequests, STEADY, ERRATIC } from '../src/lib/sim/convexity.js';
import { watchmakers } from '../src/lib/sim/watchmakers.js';
import { erlangC, meanWait, LiveQueue } from '../src/lib/sim/queue.js';
import { typicalFactor, expectedFactor, simulateCoin } from '../src/lib/sim/coin.js';
import { cascade, sweep, buildNetwork, mostConnected } from '../src/lib/sim/network.js';
import { bestDesign, workshop } from '../src/lib/sim/pins.js';
import { makeRng } from '../src/lib/sim/rng.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('calendar matches the analytic coverage odds', () => {
  for (const [roles, standIns] of [[6, 0], [6, 1], [10, 0]]) {
    let possible = 0;
    const months = 400;
    for (let s = 1; s <= months; s++) possible += simulateMonth({ roles, standIns, availability: 0.9, seed: s }).possibleDays;
    const share = possible / (months * 21);
    near(share, coverageOdds(roles, standIns, 0.9).allCovered, 0.03);
  }
});

test('queue formulas', () => {
  near(erlangC(1, 0.85), 0.85, 1e-9);
  near(meanWait(1, 0.85), 0.85 / 0.15, 1e-9);
  near(meanWait(4, 0.85), 1.149, 0.01);
  for (const mode of ['named', 'pooled']) {
    const q = new LiveQueue({ servers: 4, rho: 0.7, mode, rng: makeRng(4) });
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 4000; i++) {
      q.advance(5);
      sum += q.averageWait();
      n++;
    }
    const theory = mode === 'named' ? meanWait(1, 0.7) : meanWait(4, 0.7);
    console.log('live queue', mode, (sum / n).toFixed(3), 'theory', theory.toFixed(3));
    near(sum / n, theory, theory * 0.15 + 0.05);
  }
});

test('coin game: average rises, typical player falls', () => {
  near(expectedFactor(1), 1.05, 1e-12);
  near(typicalFactor(1, 1), Math.sqrt(1.5 * 0.6), 1e-9);
  assert.ok(typicalFactor(0.25, 1) > 1);
  assert.ok(typicalFactor(1, 3) > 1);
  assert.ok(typicalFactor(1, 2) < 1);
  const sim = simulateCoin({});
  console.log('coin median@100', sim.median[100], 'lost', sim.lostShare, 'pool 5 typical', typicalFactor(1, 5), 'pool 20', typicalFactor(1, 20));
  assert.ok(sim.median[100] < 0.05);
  assert.ok(sim.lostShare > 0.8);
  // The players' actual average does rise, below the paper value, and almost all of it sits with the richest 1%.
  assert.ok(sim.mean[100] > 10 && sim.mean[100] < sim.expected[100]);
  assert.ok(sim.topShare[100] > 0.9);
});

test('contagion threshold is exact', () => {
  // A bank with 5 counterparties survives one failure at 4% capital; with 4 it does not.
  const five = [[1, 2, 3, 4, 5], [0], [0], [0], [0], [0]];
  assert.equal(cascade(five, 4, [1]).count, 1);
  const four = [[1, 2, 3, 4], [0], [0], [0], [0]];
  assert.ok(cascade(four, 4, [1]).count >= 2);
});

test('contagion window: sparse and dense networks absorb single failures', () => {
  const s = sweep({ capitalPct: 4, shock: 1, trials: 80 });
  const mean = (z) => s[z - 1].shares.reduce((a, b) => a + b, 0) / s[z - 1].shares.length;
  console.log('sweep means', s.map(({ z }) => `${z}:${mean(z).toFixed(2)}`).join(' '));
  assert.ok(mean(3) > mean(1));
  assert.ok(mean(3) > mean(10));
  const big = sweep({ capitalPct: 4, shock: 5, trials: 80 });
  const bigMean = (z) => big[z - 1].shares.reduce((a, b) => a + b, 0) / big[z - 1].shares.length;
  console.log('sweep5 means', big.map(({ z }) => `${z}:${bigMean(z).toFixed(2)}`).join(' '));
  const hubs = buildNetwork('hubs', 48, 4, 7);
  const hub = mostConnected(hubs);
  console.log('hub degree', hubs[hub].length, 'hub failure topples', cascade(hubs, 4, [hub]).count);
});

test('pin workshop: the best chain lengthens with the market', () => {
  assert.equal(bestDesign(10).roles, 1);
  assert.equal(bestDesign(100).roles, 4);
  assert.equal(bestDesign(300).roles, 6);
  assert.equal(bestDesign(1000).roles, 12);
  near(workshop(144000, 12).minutesPerPin, 4, 1e-9);
});

test('convexity: variability helps a tool and hurts a gate', () => {
  const [tool, rule, gate] = DESIGNS;
  near(averagePayoff(rule, 2), 0.5, 0.01);
  assert.ok(averagePayoff(tool, 2) > averagePayoff(tool, 0.5));
  assert.ok(averagePayoff(gate, 2) < averagePayoff(gate, 0.5));
  assert.ok(averagePayoff(gate, 2) < 0);
  near(chainSuccess(20, 0.95), 0.358, 0.001);
  // The chapter's puzzle: of the four pairings offered, the erratic AI used as a tool saves the most.
  const [toolS, ruleS, gateS] = DESIGNS.map((d) => averagePayoff(d, STEADY));
  const [toolE, ruleE, gateE] = DESIGNS.map((d) => averagePayoff(d, ERRATIC));
  assert.ok(toolE > Math.max(gateS, toolS, ruleE));
  assert.ok(gateE < 0 && ruleS > toolS);
  // Both AIs see the same luck, and the stream is repeatable.
  assert.deepEqual(sampleRequests(5, 1, 3), sampleRequests(5, 1, 3));
  near(sampleRequests(1, ERRATIC, 7)[0] - 0.5, (sampleRequests(1, STEADY, 7)[0] - 0.5) * (ERRATIC / STEADY), 1e-9);
  console.log('convexity at spread 1.5', DESIGNS.map((d) => `${d.id}:${averagePayoff(d, 1.5).toFixed(2)}`).join(' '));
});

test('watchmakers: modules finish thousands of times more watches at one interruption in a hundred', () => {
  const w = watchmakers(0.01);
  assert.ok(w.ratio > 1000 && w.ratio < 10000, String(w.ratio));
  assert.ok(watchmakers(0).ratio < 1); // with no interruptions, one piece is slightly faster
});
