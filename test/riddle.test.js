// The riddle's calendar (Riddle.svelte): the month on show and the quorum switch shown after solving.
import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateMonth, coverageOdds, atLeast } from '../src/lib/sim/presence.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);
const SEED = 2984;
const DAYS = 20;
const month = (o) => simulateMonth({ roles: 6, standIns: 0, availability: 0.9, days: DAYS, seed: SEED, ...o });

test('riddle: a quorum sits between the AND and the OR (53%, 89%, 98% of days)', () => {
  near(coverageOdds(6, 0, 0.9, 6).enough, 0.531, 0.001);
  near(coverageOdds(6, 0, 0.9, 5).enough, 0.886, 0.001);
  near(coverageOdds(6, 0, 0.9, 4).enough, 0.984, 0.001);
  // All n of n is the AND, any one of n the OR.
  near(atLeast(6, 6, 0.9), 0.9 ** 6, 1e-12);
  near(atLeast(2, 1, 0.9), 1 - 0.1 ** 2, 1e-12);
  // With a stand-in, the quorum counts covered roles.
  near(coverageOdds(6, 1, 0.9, 6).enough, coverageOdds(6, 1, 0.9).allCovered, 1e-12);
});

test('riddle: the month on show follows the long run for every quorum', () => {
  assert.equal(month({ need: 6 }).possibleDays, 11); // 53% of 20 is 10.6
  assert.equal(month({ need: 5 }).possibleDays, 18); // 89%: 17.7
  assert.equal(month({ need: 4 }).possibleDays, 20); // 98%: 19.7
});

test('riddle: with one stand-in the month has exactly one blocked day, when a named person and the stand-in are both away', () => {
  const m = month({ standIns: 1 });
  assert.equal(m.possibleDays, DAYS - 1);
  const d = m.allIn.findIndex((ok) => !ok);
  const gaps = m.grid.filter((row) => !row[d].covered);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0][d].main, false);
});

test('riddle: the month shows absences of three days or more, as the rules say', () => {
  const spells = [];
  for (const row of month({}).grid) {
    let run = 0;
    for (const day of [...row, { main: true }]) {
      if (!day.main) run++;
      else if (run) spells.push(run), (run = 0);
    }
  }
  assert.ok(spells.filter((s) => s >= 3).length >= 3, spells.join(','));
});
