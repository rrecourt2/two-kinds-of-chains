// The toll road (chapter “How to find a black swan”): every number the chapter quotes, from the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVENUE, COSTS, PAYMENT, MONTHS, WORST, ALONE, cover, coverLabel, misses, withinRecord, breaksClaim, breakingCurrency, record, boxGrid } from '../src/lib/sim/tollroad.js';

const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const pct = (v) => v / 100;

test('a normal year earns 1.45 times the debt payment', () => {
  near(cover(0, 0), 1.45);
  assert.equal(coverLabel(0, 0), '1.45');
  assert.equal(REVENUE - COSTS, 60);
});

test('the record: 96 months, every payment made, worst falls 15% and 20% in different years', () => {
  const R = record();
  assert.equal(R.length, MONTHS);
  assert.equal(MONTHS, 96);
  assert.ok(R.every((p) => p.cover >= 1), 'every month pays');
  near(Math.min(...R.map((p) => p.cover)), 1.08);
  assert.equal(Math.max(...R.map((p) => p.traffic)), WORST.traffic);
  assert.equal(Math.max(...R.map((p) => p.currency)), WORST.currency);
  const wT = R.reduce((a, p) => (p.traffic > a.traffic ? p : a));
  const wC = R.reduce((a, p) => (p.currency > a.currency ? p : a));
  assert.ok(Math.abs(wT.currency) < 0.01, 'the currency held in the worst traffic month');
  assert.ok(wC.traffic < 0.01, 'traffic held up in the worst currency month');
  assert.ok(Math.abs(wT.month - wC.month) >= 24, 'years apart');
  // “In no month did both fall by more than 6%.”
  const both = Math.max(...R.map((p) => Math.min(p.traffic, p.currency)));
  assert.ok(both > 0.05 && both <= 0.06, String(both));
  assert.equal(Math.ceil(both * 100), 6);
  // The recession (years 3) and the devaluation (year 6): each shock alone.
  const recession = R.filter((p) => p.month >= 24 && p.month < 39);
  const devaluation = R.filter((p) => p.month >= 60 && p.month < 76);
  assert.ok(recession.every((p) => p.currency < 0.06), 'the currency held in the recession');
  assert.ok(devaluation.every((p) => p.traffic < 0.01), 'traffic held up in the devaluation');
  // The chart's domain holds every month.
  assert.ok(R.every((p) => p.traffic >= -0.12 && p.traffic <= 0.3 && p.currency >= -0.05 && p.currency <= 0.4));
});

test('each worst fall alone still pays; together they miss (0.87, 13% short)', () => {
  near(cover(WORST.traffic, 0), 1.09);
  near(cover(0, WORST.currency), 1.16);
  near(cover(WORST.traffic, WORST.currency), 0.87);
  assert.equal(coverLabel(WORST.traffic, WORST.currency), '0.87');
  assert.equal(Math.round((1 - cover(WORST.traffic, WORST.currency)) * 100), 13);
  assert.ok(!misses(WORST.traffic, 0) && !misses(0, WORST.currency));
  assert.ok(breaksClaim(WORST.traffic, WORST.currency));
});

test('the after-text arithmetic: a quarter off the cash, then a fifth of what is left', () => {
  const cash = REVENUE * (1 - WORST.traffic) - COSTS;
  near(1 - cash / (REVENUE - COSTS), 0.25, 1e-9);
  near(cash * (1 - WORST.currency), 36, 1e-9);
  // A reserve of six months’ payments covers the worst pair’s shortfall.
  assert.ok(PAYMENT / 2 > PAYMENT - cash * (1 - WORST.currency));
});

test('on its own, each fall breaks the road only beyond the record: traffic 18.6%, currency 31%', () => {
  near(ALONE.traffic, 0.186, 1e-9);
  near(ALONE.currency, 0.31, 1e-9);
  assert.ok(ALONE.traffic > WORST.traffic && ALONE.currency > WORST.currency);
  near(cover(ALONE.traffic, 0), 1, 1e-9);
  near(cover(0, ALONE.currency), 1, 1e-9);
  near(cover(0.1, breakingCurrency(0.1)), 1, 1e-9);
});

test('a single slider never solves the puzzle; the answer needs both falls', () => {
  for (let t = 0; t <= 30; t++) assert.ok(!breaksClaim(pct(t), 0), `traffic ${t}% alone`);
  for (let c = 0; c <= 40; c++) assert.ok(!breaksClaim(0, pct(c)), `currency ${c}% alone`);
  // Pushed alone past the record, the road misses, but the claim is not broken.
  assert.ok(misses(pct(20), 0) && !withinRecord(pct(20), 0));
  assert.ok(misses(0, pct(35)) && !withinRecord(0, pct(35)));
});

test('inside the record’s box, 48 of 336 whole-percent years break the claim, all with both falls at least 9%', () => {
  const g = boxGrid();
  assert.equal(g.total, 336);
  assert.equal(g.breaking.length, 48);
  assert.equal(Math.round((100 * g.breaking.length) / g.total), 14);
  assert.equal(Math.min(...g.breaking.map((p) => p.t)), 9);
  assert.equal(Math.min(...g.breaking.map((p) => p.c)), 9);
  // The edge, as the designer's prototype found it: for each traffic fall, the smallest currency fall that breaks.
  const edge = {};
  for (const p of g.breaking) edge[p.t] = Math.min(edge[p.t] ?? Infinity, p.c);
  assert.deepEqual(edge, { 9: 19, 10: 18, 11: 16, 12: 14, 13: 12, 14: 11, 15: 9 });
});

test('the walk-through and show-answer years solve it', () => {
  // ArrowRight ×12 on traffic and ×15 on the currency.
  assert.ok(breaksClaim(pct(12), pct(15)));
  assert.equal(coverLabel(pct(12), pct(15)), '0.99');
  near(cover(pct(12), pct(15)), 0.99);
  assert.ok(breaksClaim(pct(15), pct(20)));
});

test('the cover label: cash equal to the payment pays; a miss never reads 1.00', () => {
  for (const [t, c] of [[15, 8], [14, 10], [0, 31]]) {
    assert.ok(!misses(pct(t), pct(c)), `${t}/${c} pays exactly`);
    assert.equal(coverLabel(pct(t), pct(c)), '1.00');
  }
  for (let t = 0; t <= 30; t++)
    for (let c = 0; c <= 40; c++) {
      const label = Number(coverLabel(pct(t), pct(c)));
      if (misses(pct(t), pct(c))) assert.ok(label < 1, `${t}/${c} reads ${label}`);
      else assert.ok(label >= 1, `${t}/${c} reads ${label}`);
    }
});
