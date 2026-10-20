import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateMonth, coverageOdds } from '../src/lib/sim/presence.js';
import { simulateRelay } from '../src/lib/sim/relay.js';
import { erlangC, meanWait, LiveQueue } from '../src/lib/sim/queue.js';
import { typicalFactor, expectedFactor, simulateCoin } from '../src/lib/sim/coin.js';
import { cascade, sweep, buildNetwork, mostConnected } from '../src/lib/sim/network.js';
import { longRunGrowth, simulateIslands } from '../src/lib/sim/species.js';
import { bestDesign, workshop } from '../src/lib/sim/pins.js';
import { structure } from '../src/lib/sim/scale.js';
import { diagnose } from '../src/lib/sim/diagnose.js';
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

test('relay: perfect availability gives one day per sequential gate', () => {
  const base = { gates: 6, standIns: 0, availability: 0.999999, meanSpell: 4, sendBack: 0 };
  assert.equal(simulateRelay({ ...base, parallel: false }, { requests: 50 }).median, 6);
  assert.equal(simulateRelay({ ...base, parallel: true }, { requests: 50 }).median, 1);
});

test('relay: stand-ins and parallel review both cut lead time', () => {
  const base = { gates: 6, standIns: 0, availability: 0.85, meanSpell: 4, sendBack: 0.1, parallel: false };
  const now = simulateRelay(base);
  const standIn = simulateRelay({ ...base, standIns: 1 });
  const parallel = simulateRelay({ ...base, parallel: true });
  console.log('relay default', { median: now.median, p90: now.p90, within: now.withinDeadline, work: now.workShare });
  console.log('relay stand-in', { median: standIn.median, p90: standIn.p90 }, 'parallel', { median: parallel.median, p90: parallel.p90 });
  assert.ok(standIn.median < now.median);
  assert.ok(parallel.median < now.median);
  // Without send-backs, expected time per sequential gate ≈ 0.85·1 + 0.15·(4+1) = 1.6 days.
  const clean = simulateRelay({ ...base, sendBack: 0 }, { requests: 4000 });
  near(clean.mean, 6 * 1.6, 0.5);
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

test('species: specialists win calm worlds, generalists win volatile ones', () => {
  assert.ok(longRunGrowth('specialist', 0.1) > longRunGrowth('generalist', 0.1));
  assert.ok(longRunGrowth('specialist', 0.5) < longRunGrowth('generalist', 0.5));
  for (let v = 0; v <= 0.7; v += 0.05) {
    if (longRunGrowth('specialist', v) < longRunGrowth('generalist', v)) {
      console.log('crossover near', v.toFixed(2));
      break;
    }
  }
  const sim = simulateIslands({ v: 0.5, start: 100 });
  console.log('islands v=0.5 start=100', sim.survivors, 'growth', longRunGrowth('specialist', 0.5), longRunGrowth('generalist', 0.5));
  assert.ok(sim.survivors.specialist < sim.survivors.generalist);
  const small = simulateIslands({ v: 0.2, start: 10 });
  const large = simulateIslands({ v: 0.2, start: 1000 });
  console.log('islands v=0.2 start=10', small.survivors, 'start=1000', large.survivors);
});

test('pin workshop: the best chain lengthens with the market', () => {
  assert.equal(bestDesign(10).roles, 1);
  assert.equal(bestDesign(100).roles, 4);
  assert.equal(bestDesign(300).roles, 6);
  assert.equal(bestDesign(1000).roles, 12);
  near(workshop(144000, 12).minutesPerPin, 4, 1e-9);
});

test('scale: mesh peaks then falls, hub plateaus, teams keep growing', () => {
  const mesh = Array.from({ length: 60 }, (_, i) => structure('mesh', i + 1).output);
  const peak = mesh.indexOf(Math.max(...mesh)) + 1;
  console.log('mesh peak at', peak, 'output', Math.max(...mesh).toFixed(1), 'teams@60', structure('teams', 60).output.toFixed(1));
  assert.ok(peak >= 24 && peak <= 27);
  assert.equal(structure('hub', 40).output, 12);
  assert.ok(structure('teams', 60).output > 50);
});

test('diagnosis levers', () => {
  const d = diagnose({ gates: 6, standIns: 0, availability: 0.85, busy: 0.85, sendBack: 0.15, parallel: false });
  console.log('diagnose now', d.now.median, d.now.p90, d.options.map((o) => `${o.id}:${o.median}`).join(' '), 'all', d.together.median);
  for (const o of d.options) assert.ok(o.median <= d.now.median);
});
