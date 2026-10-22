import test from 'node:test';
import assert from 'node:assert/strict';

import { DESIGNS, SHOWN, TOOL, GATE, averagePayoff, chainSuccess, runDesign, sampleRequests, STEADY, ERRATIC } from '../src/lib/sim/convexity.js';
import { typicalFactor, expectedFactor, simulateCoin, breakEvenHeads, poorerChance, luckyRuns } from '../src/lib/sim/coin.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);
const minutes = (h) => Math.round(h * 60);

test('tool or gate: the chapter shows two designs, optional and mandatory', () => {
  assert.equal(DESIGNS.length, 3);
  assert.deepEqual(SHOWN.map((d) => d.id), ['tool', 'gate']);
  assert.equal(TOOL.id, 'tool');
  assert.equal(GATE.id, 'gate');
  // The gate keeps at most its half hour, and a wrong answer counts three times.
  assert.equal(GATE.payoff(3), 0.5);
  near(GATE.payoff(-1), -3, 1e-12);
  near(TOOL.payoff(-1), -0.1, 1e-12);
  near(TOOL.payoff(3), 2.9, 1e-12);
});

test('tool or gate: long-run numbers in the text and the found line', () => {
  const steadyTool = averagePayoff(TOOL, STEADY);
  const steadyGate = averagePayoff(GATE, STEADY);
  const erraticTool = averagePayoff(TOOL, ERRATIC);
  const erraticGate = averagePayoff(GATE, ERRATIC);
  console.log('tool/gate long run (h)', steadyTool.toFixed(4), steadyGate.toFixed(4), erraticTool.toFixed(4), erraticGate.toFixed(4));
  near(steadyTool, 0.41, 0.005);
  near(steadyGate, 0.37, 0.005);
  near(erraticTool, 0.97, 0.005);
  near(erraticGate, -1.44, 0.005);
  // “About 58 minutes saved (24 with the steady AI) … about 87 minutes lost (22 saved with the steady AI).”
  assert.equal(minutes(erraticTool), 58);
  assert.equal(minutes(steadyTool), 24);
  assert.equal(minutes(erraticGate), -87);
  assert.equal(minutes(steadyGate), 22);
  // The answer: the optional tool saves more, the mandatory gate less (it starts to cost).
  assert.ok(erraticTool > steadyTool);
  assert.ok(erraticGate < steadyGate && erraticGate < 0);
  // Both AIs are worth half an hour on average (the rule design earns the plain average).
  near(averagePayoff(DESIGNS[1], STEADY), 0.5, 0.01);
  near(averagePayoff(DESIGNS[1], ERRATIC), 0.5, 0.01);
});

test('tool or gate: the twenty requests shown follow the long run', () => {
  const steady = sampleRequests(20, STEADY, 1);
  const erratic = sampleRequests(20, ERRATIC, 1);
  const [st, sg] = SHOWN.map((d) => runDesign(d, steady));
  const [et, eg] = SHOWN.map((d) => runDesign(d, erratic));
  console.log('twenty requests: steady', st.total.toFixed(1), sg.total.toFixed(1), st.wrong, 'erratic', et.total.toFixed(1), eg.total.toFixed(1), et.wrong);
  // Steady: the two designs are close, both save; the AI is rarely wrong.
  assert.ok(st.total > 0 && sg.total > 0 && Math.abs(st.total - sg.total) < 2);
  assert.ok(st.wrong <= 2);
  // Erratic: the tool saves more than before, the gate loses.
  assert.ok(et.total > st.total);
  assert.ok(eg.total < 0);
  assert.equal(et.wrong, eg.wrong);
});

test('tool or gate: a 20-step chain at 95% a step works about one time in three', () => {
  near(chainSuccess(20, 0.95), 1 / 3, 0.03);
});

test('coin game: stats and text', () => {
  const sim = simulateCoin({});
  // On paper: 1.05^100 = 131.5, shown (rounded down) as ×131, +5% a round.
  near(sim.expected[100], 131.5, 0.01);
  assert.equal(Math.floor(sim.expected[100]), 131);
  near(expectedFactor(1), 1.05, 1e-12);
  // Typical player: −99.5% after 100 rounds (0.9^50 ≈ 0.0052), −5.1% a round; half a percent left.
  near(0.9 ** 50, 0.00515, 0.00001);
  assert.equal(((1 - sim.median[100]) * 100).toFixed(1), '99.5');
  assert.equal(((typicalFactor(1, 1) - 1) * 100).toFixed(1), '-5.1');
  // 86% of players poorer than at the start (simulation and exact).
  assert.equal(Math.round(sim.lostShare * 100), 86);
  assert.equal(Math.round(poorerChance(100) * 100), 86);
  // It takes 56 heads in 100 to end above the start.
  assert.equal(breakEvenHeads(100), 56);
  // About two thirds of the paper value comes from runs of 70+ heads, which about one player in 25,000 gets.
  const lucky = luckyRuns(100, 70);
  console.log('70+ heads: chance 1 in', Math.round(1 / lucky.chance), 'share of paper value', lucky.paperShare.toFixed(3));
  near(lucky.paperShare, 2 / 3, 0.02);
  near(1 / lucky.chance, 25000, 1500);
  assert.equal(luckyRuns(100, 0).paperShare.toFixed(6), '1.000000');
});

test('coin game: puzzle and remedies', () => {
  // The answer: stake 80%, pool of five → about 2.7% a round; twenty → about 3.7%.
  assert.ok(typicalFactor(0.8, 5) >= 1.025);
  assert.equal(((typicalFactor(0.8, 5) - 1) * 100).toFixed(1), '2.7');
  assert.equal(((typicalFactor(0.8, 20) - 1) * 100).toFixed(1), '3.7');
  // Alone, no stake on the slider reaches 2.5%; the best is about 0.6% (at a quarter).
  let best = 0;
  for (let s = 10; s <= 80; s += 5) best = Math.max(best, typicalFactor(s / 100, 1));
  assert.ok(best < 1.025);
  assert.equal(((best - 1) * 100).toFixed(1), '0.6');
  assert.ok(typicalFactor(0.25, 1) > 1);
  // A pair is not enough at any allowed stake.
  for (let s = 10; s <= 80; s += 5) assert.ok(typicalFactor(s / 100, 2) < 1.025);
  // Remedies text: a pair staking everything shrinks slightly; five grow about 3%, twenty 4.5%.
  assert.ok(typicalFactor(1, 2) < 1);
  assert.equal(Math.round((typicalFactor(1, 5) - 1) * 100), 3);
  assert.equal(((typicalFactor(1, 20) - 1) * 100).toFixed(1), '4.5');
});
