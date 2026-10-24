import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invNorm, futures, results, summarize, scene, scenes, meets, BUDGET, PILOT, FUTURES, MAX_PILOTS, TARGET } from '../src/lib/sim/tinkering.js';

const S = scenes();
const U = S.unpredictable;
const round = (v) => Math.round(v);

test('the inverse normal is accurate', () => {
  assert.ok(Math.abs(invNorm(0.975) - 1.959964) < 1e-6);
  assert.ok(Math.abs(invNorm(0.1) + 1.281552) < 1e-6);
  assert.ok(Math.abs(invNorm(0.0005) + 3.290527) < 1e-5);
  assert.equal(invNorm(0.5), 0);
});

test('the futures are seeded, and each column is spread evenly over the distribution', () => {
  const a = futures();
  const b = futures();
  assert.deepEqual(a.quality[3], b.quality[3]);
  assert.deepEqual(a.error[17], b.error[17]);
  assert.equal(a.quality.length, MAX_PILOTS);
  const sorted = Float64Array.from(a.quality[0]).sort();
  for (let k = 0; k < FUTURES; k += 97) assert.ok(Math.abs(sorted[k] - invNorm((k + 0.5) / FUTURES)) < 1e-12);
  assert.notDeepEqual(a.quality[0], a.quality[1]);
});

test('one big programme: typical 100, worst one in ten 36, half the futures below 100', () => {
  for (const s of Object.values(S)) {
    assert.ok(Math.abs(s.runs[1].typical - BUDGET) < 1e-3);
    assert.equal(s.runs[1].below, 0.5);
  }
  assert.equal(round(U.runs[1].worst), 36);
  assert.equal(round(S.predictable.runs[1].worst), 83);
  assert.equal(round(S.wild.runs[1].worst), 17);
});

test('pilots: what is left after the pilots goes into the approach whose pilot read best', () => {
  const w = futures();
  const v = results(w, 3, 0.8);
  for (let f = 0; f < 50; f++) {
    const seen = [0, 1, 2].map((i) => 0.8 * w.quality[i][f] + 0.5 * w.error[i][f]);
    const i = seen.indexOf(Math.max(...seen));
    assert.ok(Math.abs(v[f] - (BUDGET - 3 * PILOT) * Math.exp(0.8 * w.quality[i][f])) < 1e-9);
  }
  // With exact readings, the best approach is always found.
  const exact = results(w, 5, 0.8, { read: 0 });
  for (let f = 0; f < 50; f++) {
    const best = Math.max(...[0, 1, 2, 3, 4].map((i) => w.quality[i][f]));
    assert.ok(Math.abs(exact[f] - 90 * Math.exp(0.8 * best)) < 1e-9);
  }
});

test('the puzzle: with unpredictable results, seven to twenty-two pilots meet both checks', () => {
  const ok = [];
  for (let n = 1; n <= MAX_PILOTS; n++) if (meets(U.runs[n])) ok.push(n);
  assert.deepEqual(ok, Array.from({ length: 16 }, (_, k) => 7 + k));
  // The default (none) and five pilots fail; five fails both checks.
  assert.ok(!meets(U.runs[1]));
  assert.ok(U.runs[5].typical < TARGET.typical && U.runs[5].worst < TARGET.worst);
  assert.equal(round(U.runs[5].typical), 192);
  assert.equal(round(U.runs[5].worst), 92);
  // Rounded as shown, every setting meets the checks exactly when the model says it does.
  for (let n = 1; n <= MAX_PILOTS; n++) {
    const r = U.runs[n];
    assert.equal(round(r.typical) >= TARGET.typical && round(r.worst) >= TARGET.worst, meets(r), `n=${n}`);
  }
});

test('twelve pilots: typical 228, worst one in ten 113, 7% of futures below 100', () => {
  const r = U.runs[12];
  assert.equal(round(r.typical), 228);
  assert.equal(round(r.worst), 113);
  assert.equal(round(r.below * 100), 7);
  assert.equal(U.bestN, 12);
});

test('unpredictability is what pilots are paid in', () => {
  // Predictable: every pilot costs more than it finds; twelve leave 82.
  assert.equal(S.predictable.bestN, 1);
  assert.equal(round(S.predictable.runs[12].typical), 82);
  // Wild: about twenty pilots do best.
  assert.equal(S.wild.bestN, 20);
  assert.equal(round(S.wild.runs[20].typical), 690);
  // More spread, more value from the same twelve pilots.
  assert.ok(S.predictable.runs[12].typical < U.runs[12].typical && U.runs[12].typical < S.wild.runs[12].typical);
});

test('the 1,000 futures sit close to a large sample of the same model', () => {
  const big = scene(0.8, futures(99, 50000));
  for (const n of [1, 5, 12, 20]) {
    assert.ok(Math.abs(Math.log(U.runs[n].typical / big.runs[n].typical)) < 0.03, `typical n=${n}`);
    assert.ok(Math.abs(Math.log(U.runs[n].worst / big.runs[n].worst)) < 0.05, `worst n=${n}`);
  }
  const s = summarize(Float64Array.from([50, 100, 150, 200]));
  assert.equal(s.below, 0.25);
  assert.equal(s.typical, 125);
});

test('every setting is worked out once, quickly', () => {
  const t0 = performance.now();
  for (const s of [0.15, 0.8, 1.4]) scene(s);
  assert.ok(performance.now() - t0 < 1500);
  assert.equal(scenes(), S);
});
