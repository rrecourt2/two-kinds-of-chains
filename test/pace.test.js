// How fast to forget (chapter “pace”): every number the chapter quotes, from the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEMORIES, YEARS, COSTS, SEED, HISTORIES, LIMITS, PARAMS, world, run, table, costs, best, checks, figureRuns, chapterStep, chapterReady } from '../src/lib/sim/pace.js';

const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const rows = table();
const at = (m, carry = COSTS.some) => costs(rows[MEMORIES.indexOf(m)], carry);
const pct = (v) => Math.round(v);

test('the slider runs from one year to fifty, thirteen stops', () => {
  assert.deepEqual(MEMORIES, [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50]);
  assert.equal(YEARS, 60);
  assert.equal(HISTORIES, 3000);
});

test('the world: one year in twenty a crisis, four times a normal year; a normal year starts at 2% of the book', () => {
  let years = 0;
  let crises = 0;
  let base = 0;
  let ratio = 0;
  for (let s = 1; s <= 2000; s++) {
    const w = world(s);
    for (let t = 40; t < 100; t++) {
      years += 1;
      base += w.base[t];
      if (w.crisis[t]) {
        crises += 1;
        ratio += w.loss[t] / w.base[t];
      }
    }
  }
  near(crises / years, 1 / 20, 0.003);
  near(ratio / crises, PARAMS.mult, 0.05);
  // A normal year starts at 2% of the book and drifts; over the 60 years it averages about 2.3%.
  near(base / years, 2.3, 0.1);
});

test('memory: one year means a cushion of last year’s losses; the cushion never drops below the year just seen', () => {
  const w = world(SEED);
  const one = run(w, 1);
  for (let i = 1; i < one.path.length; i++) near(one.path[i].cushion, one.path[i - 1].loss, 1e-9);
  const six = run(w, 6);
  for (let i = 1; i < six.path.length; i++) assert.ok(six.path[i].cushion >= six.path[i - 1].loss - 1e-9);
});

test('the figure’s history: crises in years 10 and 39, and the chart’s scale holds every year', () => {
  const runs = figureRuns();
  const path = runs[0].path;
  assert.equal(path.length, 60);
  assert.deepEqual(
    path.filter((p) => p.crisis).map((p) => p.year),
    [10, 39],
  );
  for (const r of runs) for (const p of r.path) assert.ok(p.loss < 10 && p.cushion < 10 && p.loss > 1);
  // Never forgetting holds more back and lets less through, in this history too.
  assert.ok(runs.at(-1).held > runs[0].held && runs.at(-1).through < runs[0].through);
});

test('averages over 3,000 histories: the found text and the tiles', () => {
  const one = at(1);
  const six = at(6);
  const fifty = at(50);
  // “at six, 19% gets through and 25% is held back, against 37% and 16% at one year”
  assert.equal(pct(six.through), 19);
  assert.equal(pct(six.held), 25);
  assert.equal(pct(one.through), 37);
  assert.equal(pct(one.held), 16);
  // Forgetting fast: short in 30 years of 60. Never forgetting: 7% through, 46% held back, short in 2 years.
  assert.equal(pct(one.broken), 30);
  assert.equal(pct(fifty.through), 7);
  assert.equal(pct(fifty.held), 46);
  assert.equal(pct(fifty.broken), 2);
  assert.equal(pct(six.broken), 10);
  // The average cushion at six years, a year: 4.1% of the book; at one 2.6%, at fifty 7.7%.
  assert.equal((rows[MEMORIES.indexOf(6)].cushion / YEARS).toFixed(1), '4.1');
  assert.equal((rows[0].cushion / YEARS).toFixed(1), '2.6');
  assert.equal((rows.at(-1).cushion / YEARS).toFixed(1), '7.7');
});

test('the puzzle: four to ten years meet both checks; one year and fifty do not', () => {
  assert.deepEqual(LIMITS, { through: 22, held: 30 });
  const solving = MEMORIES.filter((m) => {
    const c = checks(at(m));
    return c.through && c.held;
  });
  assert.deepEqual(solving, [4, 5, 6, 8, 10]);
  assert.deepEqual(checks(at(1)), { through: false, held: true });
  assert.deepEqual(checks(at(50)), { through: true, held: false });
  // The nearest misses, as the tiles show them: 24% at three years, 31% held back at twelve.
  assert.equal(pct(at(3).through), 24);
  assert.equal(pct(at(4).through), 22);
  assert.equal(pct(at(10).held), 29);
  assert.equal(pct(at(12).held), 31);
});

test('the best pace: about six years; twenty when an idle cushion costs little, three when it costs a lot', () => {
  assert.equal(best(rows, COSTS.some).memory, 6);
  assert.equal(best(rows, COSTS.little).memory, 20);
  assert.equal(best(rows, COSTS.lot).memory, 3);
  // Forgetting fast and never forgetting cost about the same in all: 53% of the book, against 44% at six.
  assert.equal(pct(at(1).total), 53);
  assert.equal(pct(at(50).total), 53);
  assert.equal(pct(at(6).total), 44);
});

test('how fast the world drifts hardly moves the best pace: five or six years from no drift to five times as much', () => {
  for (const drift of [0, 0.06, 0.15, 0.3]) {
    const m = best(table({ histories: 1200, drift })).memory;
    assert.ok(m === 5 || m === 6, `drift ${drift}: best ${m}`);
  }
});

test('the chapter works the table out in steps, to the same numbers', () => {
  let steps = 0;
  while (!chapterStep()) steps += 1;
  assert.ok(steps >= 5, String(steps));
  const t = chapterReady();
  assert.equal(t.length, MEMORIES.length);
  t.forEach((row, i) => {
    near(row.through, rows[i].through, 1e-9);
    near(row.cushion, rows[i].cushion, 1e-9);
    near(row.broken, rows[i].broken, 1e-9);
  });
});
