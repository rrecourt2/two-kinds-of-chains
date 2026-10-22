import test from 'node:test';
import assert from 'node:assert/strict';

import { DESIGNS, SHOWN, PERSON, AUTOPILOT, averagePayoff, chainSuccess, runDesign, sampleRequests, wrongChance, STEADY, ERRATIC } from '../src/lib/sim/convexity.js';
import { typicalFactor, expectedFactor, simulateCoin, breakEvenHeads, poorerChance, luckyRuns } from '../src/lib/sim/coin.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);
const minutes = (h) => Math.round(h * 60);

test('person in the loop: the chapter shows two designs, a person in the loop and autopilot', () => {
  assert.equal(DESIGNS.length, 3);
  assert.deepEqual(SHOWN.map((d) => d.id), ['tool', 'autopilot']);
  assert.equal(PERSON, DESIGNS[0]);
  assert.equal(AUTOPILOT, DESIGNS[1]);
  // The person drops a bad draft for six minutes; autopilot uses every draft as it is, wrong ones at their full cost.
  near(PERSON.payoff(-1), -0.1, 1e-12);
  near(PERSON.payoff(3), 2.9, 1e-12);
  assert.equal(AUTOPILOT.payoff(3), 3);
  assert.equal(AUTOPILOT.payoff(-1), -1);
  // Rules box: the steady AI is wrong about one time in twenty, the erratic one four in ten.
  console.log('wrong chance', wrongChance(STEADY).toFixed(4), wrongChance(ERRATIC).toFixed(4));
  near(wrongChance(STEADY), 0.05, 0.005);
  near(wrongChance(ERRATIC), 0.4, 0.01);
});

test('person in the loop: long-run minutes in the stats and the found line', () => {
  const [steadyPerson, steadyAuto] = SHOWN.map((d) => averagePayoff(d, STEADY) * 60);
  const [erraticPerson, erraticAuto] = SHOWN.map((d) => averagePayoff(d, ERRATIC) * 60);
  console.log('person/autopilot long run (min)', steadyPerson.toFixed(2), steadyAuto.toFixed(2), erraticPerson.toFixed(2), erraticAuto.toFixed(2));
  // Steady 24.4 vs 30.0; erratic 58.4 vs 30.0.
  assert.equal(steadyPerson.toFixed(1), '24.4');
  assert.equal(steadyAuto.toFixed(1), '30.0');
  assert.equal(erraticPerson.toFixed(1), '58.4');
  assert.equal(erraticAuto.toFixed(1), '30.0');
  // Found: “about 58 minutes a request on average, up from 24 … Autopilot stays at 30 minutes, steady or erratic.”
  assert.equal(Math.round(erraticPerson), 58);
  assert.equal(Math.round(steadyPerson), 24);
  assert.equal(Math.round(steadyAuto), 30);
  assert.equal(Math.round(erraticAuto), 30);
  // The story: steady, autopilot comes out ahead; erratic, the person in the loop does, and autopilot is unchanged.
  assert.ok(steadyAuto > steadyPerson);
  assert.ok(erraticPerson > erraticAuto && erraticPerson > steadyPerson);
  // Autopilot earns the AI's own half hour whatever the spread.
  for (const spread of [0, 0.5, 1, 1.5, 3]) near(averagePayoff(AUTOPILOT, spread), 0.5, 0.005);
});

test('person in the loop: the sample of twenty requests', () => {
  const steady = sampleRequests(20, STEADY, 1);
  const erratic = sampleRequests(20, ERRATIC, 1);
  const [sp, sa] = SHOWN.map((d) => runDesign(d, steady));
  const [ep, ea] = SHOWN.map((d) => runDesign(d, erratic));
  console.log('sample of twenty (h): steady', sp.total.toFixed(2), sa.total.toFixed(2), sp.wrong, '| erratic', ep.total.toFixed(2), ea.total.toFixed(2), ep.wrong);
  // Steady: “8.2 h saved” with the person, “10.0 h saved” on autopilot; one wrong draft.
  assert.equal(sp.total.toFixed(1), '8.2');
  assert.equal(sa.total.toFixed(1), '10.0');
  assert.equal(sp.wrong, 1);
  // Erratic: “20.4 h saved” with the person, “10.1 h saved” on autopilot; six wrong drafts.
  assert.equal(ep.total.toFixed(1), '20.4');
  assert.equal(ea.total.toFixed(1), '10.1');
  assert.equal(ep.wrong, 6);
  assert.equal(ea.wrong, ep.wrong);
  // After-text: the six wrong drafts each take more than an hour to redo, the worst about four.
  const wrong = erratic.filter((x) => x < 0);
  assert.ok(wrong.every((x) => x < -1));
  assert.equal(Math.round(-Math.min(...wrong)), 4);
});

test('person in the loop: a 20-step chain at 95% a step works about one time in three', () => {
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
