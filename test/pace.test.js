// How fast to forget (Pace.svelte): a lender that sets each country's limit from the losses it remembers.
import test from 'node:test';
import assert from 'node:assert/strict';

import { RISKS, WORLDS, MEMORIES, YEARS, BURN, COUNTRIES, PARAMS, AFTER_BAD, TOLERANCE, limit, country, lend, table, rows, best, band, countedOnce, FIGURE, figure, TABLE_DATA } from '../src/lib/sim/pace.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('pace: the limit is full at 1% remembered, nothing at 8%, a third less for each doubling', () => {
  assert.equal(limit(0.5), 1);
  assert.equal(limit(1), 1);
  near(limit(2), 2 / 3, 1e-12);
  near(limit(4), 1 / 3, 1e-12);
  assert.equal(limit(8), 0);
  assert.equal(limit(20), 0);
});

test('pace: a country stays on the ladder, moves one rung at a time, and its bad years are part of its risk', () => {
  let years = 0;
  let bad = 0;
  let changes = 0;
  let ratio = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const c = country(seed, WORLDS.sometimes);
    assert.equal(c.risk.length, BURN + YEARS);
    for (let t = 0; t < c.risk.length; t++) {
      assert.ok(RISKS.includes(c.risk[t]));
      if (t > 0 && c.change[t]) {
        // A crisis doubles the risk and a reform halves it.
        near(c.risk[t] / c.risk[t - 1], c.change[t] > 0 ? 2 : 0.5, 1e-12);
        changes++;
      } else if (t > 0) assert.equal(c.risk[t], c.risk[t - 1]);
      years++;
      bad += c.bad[t];
      ratio += c.loss[t] / c.risk[t];
    }
  }
  near(bad / years, 1 / PARAMS.badEvery, 0.01);
  near(changes / years, 1 / WORLDS.sometimes, 0.01);
  // Over many years a country loses its risk: normal years a little less, bad years four times as much.
  near(ratio / years, 1, 0.03);
});

test('pace: the lender is scored over forty years, and its costs add up', () => {
  const c = country(7, WORLDS.sometimes);
  for (const memory of [1, 6, 20]) {
    const r = lend(c, memory, { path: true });
    assert.equal(r.path.length, YEARS);
    assert.ok(r.losses >= 0 && r.missed >= 0 && r.afterBad >= 0 && r.afterBad <= r.missed + 1e-12);
    near(r.total, r.losses + r.missed, 1e-12);
    for (const y of r.path) assert.ok(y.held >= 0 && y.held <= 1 && y.right >= 0 && y.right <= 1);
  }
  // With a memory of one year the limit held follows last year's losses alone.
  const one = lend(c, 1, { path: true }).path;
  for (let i = 1; i < one.length; i++) near(one[i].belief, one[i - 1].loss, 1e-9);
});

test('pace: the printed tables are what the model works out, for each world', () => {
  for (const world of Object.keys(WORLDS)) {
    const fresh = table(world);
    assert.equal(fresh.length, MEMORIES.length);
    fresh.forEach((r, i) => {
      const [losses, missed, afterBad] = TABLE_DATA[world][i];
      near(r.losses, losses, 0.0006);
      near(r.missed, missed, 0.0006);
      near(r.afterBad, afterBad, 0.0006);
    });
  }
});

test('pace: the best memory sits in the middle and follows how often countries change', () => {
  const some = rows('sometimes');
  assert.equal(best(some).memory, 6);
  assert.deepEqual(band(some), [5, 6, 7]); // the memories the puzzle accepts
  assert.ok(TOLERANCE <= 0.02);
  assert.equal(best(rows('rarely')).memory, 13);
  assert.equal(best(rows('often')).memory, 3);
  // The numbers the text prints: $14.6m a year at six years, against $19.2m at one and $18.3m at twenty.
  near(some[5].total, 14.64, 0.01);
  near(some[0].total, 19.16, 0.01);
  near(some[19].total, 18.33, 0.01);
});

test('pace: forgetting fast and remembering long fail in opposite ways', () => {
  const some = rows('sometimes');
  const [one, six, twenty] = [some[0], some[5], some[19]];
  // One year: too much lent into countries believed safe, and limits cut just after a bad year.
  assert.ok(one.losses > six.losses && one.afterBad > 2 * six.afterBad);
  near(one.losses, 11.8, 0.05);
  near(one.afterBad, 5.6, 0.05);
  // Twenty years: slow to follow a real change, in both directions.
  assert.ok(twenty.losses > six.losses && twenty.missed > six.missed);
  near(twenty.losses, 8.8, 0.05);
});

test('pace: the result does not hang on counting lending after a bad year double', () => {
  assert.equal(AFTER_BAD, 2);
  const once = (world) => best(countedOnce(rows(world))).memory;
  // Counted once, the best memory is still in the middle, a little shorter: five years, not six.
  assert.equal(once('sometimes'), 5);
  assert.equal(once('rarely'), 13);
  assert.equal(once('often'), 2);
  for (const world of Object.keys(WORLDS)) {
    const rs = countedOnce(rows(world));
    const low = best(rs);
    assert.ok(low.total < rs[0].total && low.total < rs.at(-1).total);
  }
});

test('pace: the country on the card shows a change and a bad year that passes', () => {
  for (const world of Object.keys(WORLDS)) {
    const paths = figure(world);
    assert.equal(paths.length, MEMORIES.length);
    assert.ok(paths.every((p) => p.path.length === YEARS));
    assert.ok(Number.isInteger(FIGURE[world]));
  }
  const shown = figure('sometimes')[5].path;
  assert.ok(shown.some((y) => y.change !== 0), 'a crisis or a reform');
  assert.ok(shown.some((y) => y.bad), 'a bad year');
  assert.equal(COUNTRIES, 20);
});

test('pace: the puzzle target, a total under $15m a year, is met by four to eight years of memory', () => {
  const pass = rows('sometimes').filter((r) => r.total < 15).map((r) => r.memory);
  assert.deepEqual(pass, [4, 5, 6, 7, 8]);
});
