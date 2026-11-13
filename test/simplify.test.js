// The numbers printed by the riddle, the pin workshop, the watchmakers and the queues.
import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateMonth, coverageOdds } from '../src/lib/sim/presence.js';
import { bestDesign, workshop } from '../src/lib/sim/pins.js';
import { watchmakers } from '../src/lib/sim/watchmakers.js';
import { meanWait } from '../src/lib/sim/queue.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('riddle: stand-ins beat better attendance (94% against 83%)', () => {
  near(coverageOdds(6, 0, 0.97).allCovered, 0.833, 0.001);
  near(coverageOdds(6, 1, 0.9).allCovered, 0.941, 0.001);
  near(coverageOdds(6, 0, 0.9).allCovered, 0.531, 0.001); // bank note: about half of all days
  near(coverageOdds(10, 0, 0.9).allCovered, 1 / 3, 0.02); // after-text: four more roles, one day in three
});

test('riddle: the calendar keeps each person’s month when stand-ins are added', () => {
  const base = simulateMonth({ roles: 6, standIns: 0, availability: 0.9, seed: 58 });
  for (const standIns of [1, 2, 3]) {
    const more = simulateMonth({ roles: 6, standIns, availability: 0.9, seed: 58 });
    for (let r = 0; r < 6; r++) assert.deepEqual(more.grid[r].map((d) => d.main), base.grid[r].map((d) => d.main));
    assert.ok(more.possibleDays >= base.possibleDays);
  }
});

test('riddle: better attendance only ever removes absences', () => {
  for (const seed of [1, 7, 58]) {
    let prev = null;
    for (let a = 70; a <= 99; a++) {
      const m = simulateMonth({ roles: 6, standIns: 0, availability: a / 100, seed });
      if (prev) for (let r = 0; r < 6; r++) for (let d = 0; d < 21; d++) if (prev.grid[r][d].main) assert.ok(m.grid[r][d].main, `seed ${seed}, ${a}%`);
      prev = m;
    }
  }
});

test('riddle: absences still last three days on average and match the long-run odds', () => {
  let backs = 0; // an absent person is back the next day
  let awayBefore = 0; // absent days that have a next day in the month
  let awayDays = 0;
  let possible = 0;
  const months = 600;
  for (let s = 1; s <= months; s++) {
    const m = simulateMonth({ roles: 6, standIns: 0, availability: 0.9, seed: s });
    possible += m.possibleDays;
    for (const row of m.grid) {
      row.forEach((day, d) => {
        if (day.main) return;
        awayDays += 1;
        if (d + 1 < row.length) {
          awayBefore += 1;
          if (row[d + 1].main) backs += 1;
        }
      });
    }
  }
  near(possible / (months * 21), coverageOdds(6, 0, 0.9).allCovered, 0.03);
  near(awayDays / (months * 6 * 21), 0.1, 0.01);
  near(awayBefore / backs, 3, 0.25); // mean absence of three days
});

test('riddle: the month on show is close to the long run for the puzzle’s settings', () => {
  // Twenty working days, seed 2984 (Riddle.svelte); test/riddle.test.js checks the rest of that month.
  const m = (a, b) => simulateMonth({ roles: 6, standIns: b, availability: a, days: 20, seed: 2984 }).possibleDays;
  assert.equal(m(0.9, 0), 11);
  assert.equal(m(0.97, 0), 17);
  assert.equal(m(0.9, 1), 19);
});

test('specialization: twelve roles first win at 794 pins a day on the slider', () => {
  const onSlider = (e) => Math.round(10 ** e);
  assert.equal(onSlider(2.9), 794);
  assert.equal(bestDesign(794).roles, 12);
  assert.notEqual(bestDesign(onSlider(2.8)).roles, 12);
  assert.equal(bestDesign(721).roles, 12);
  assert.notEqual(bestDesign(720).roles, 12);
  near(1 - workshop(794, 12).utilization, 0.45, 0.01); // idle for almost half the day
});

test('watchmakers: Hora finishes thousands of watches for each of Tempus’s', () => {
  const w = watchmakers(0.01);
  assert.ok(w.ratio > 1000 && w.ratio < 10000);
  assert.ok(0.99 ** 1000 < 1 / 20000);
});

test('queues: the target is unchanged (80% busy, shared line under an hour)', () => {
  near(meanWait(1, 0.8), 4, 1e-9);
  assert.ok(meanWait(4, 0.8) < 1);
  near(meanWait(4, 0.8) * 60, 45, 2);
});
