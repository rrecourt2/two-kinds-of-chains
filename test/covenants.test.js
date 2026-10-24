// Covenants (chapter “A warning light, not a tripwire”): every number the chapter quotes, from the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVENANTS, MAX, YEARS, PORTFOLIO, TARGET, rates, posterior, year, catchesEnough, meansEnough, solves, SOLVING } from '../src/lib/sim/covenants.js';

const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const frac = (y) => y.caught / y.breaches;

test('twelve covenants, strongest first: each tells trouble from health less well than the one before', () => {
  assert.equal(MAX, 12);
  assert.equal(COVENANTS.length, 12);
  const ratio = COVENANTS.map((c) => c.hit / c.noise);
  for (let k = 1; k < ratio.length; k++) assert.ok(ratio[k] <= ratio[k - 1] + 1e-9, `${COVENANTS[k].name} is stronger than ${COVENANTS[k - 1].name}`);
  // Every covenant trips more often for a borrower in trouble than for a healthy one.
  assert.ok(COVENANTS.every((c) => c.hit > c.noise));
  assert.equal(COVENANTS[0].name, 'Debt service cover');
});

test('the portfolio: 200 borrowers; 4, 10 or 40 in real trouble in a calm, normal or crisis year', () => {
  assert.equal(PORTFOLIO, 200);
  assert.deepEqual(
    Object.keys(YEARS).map((k) => year(1, k).trouble),
    [4, 10, 40],
  );
  assert.deepEqual(Object.values(YEARS).map((v) => v.label), ['Calm', 'Normal', 'Crisis']);
  for (const k of Object.keys(YEARS))
    for (let n = 1; n <= MAX; n++) {
      const y = year(n, k);
      assert.equal(y.trouble + y.healthy, PORTFOLIO);
      assert.equal(y.caught + y.missed, y.trouble);
      assert.equal(y.alarms + y.quiet, y.healthy);
      assert.equal(y.breaches, y.caught + y.alarms);
    }
});

test('more covenants: more trouble caught, more false alarms, and a breach that means less', () => {
  for (const k of Object.keys(YEARS))
    for (let n = 2; n <= MAX; n++) {
      const a = year(n - 1, k);
      const b = year(n, k);
      assert.ok(b.caught >= a.caught && b.alarms > a.alarms, `${k} ${n}`);
      assert.ok(b.exact < a.exact, `${k} ${n}: the exact posterior falls`);
    }
});

test('the puzzle: two, three and four covenants meet both checks; one misses too much, twelve drown the signal', () => {
  assert.deepEqual(SOLVING, [2, 3, 4]);
  const one = year(1);
  assert.ok(!catchesEnough(one) && meansEnough(one));
  const all = year(MAX);
  assert.ok(catchesEnough(all) && !meansEnough(all));
  assert.ok(!solves(year(MAX)), 'the starting setting does not solve');
  // The rounded counts and the exact Bayes rule agree on every setting.
  for (let n = 1; n <= MAX; n++) {
    const y = year(n);
    const exact = rates(n).caught >= TARGET.caught && y.exact >= TARGET.means;
    assert.equal(solves(y), exact, `n = ${n}`);
  }
  // Checks as the reader sees them.
  assert.deepEqual([2, 3, 4].map((n) => `${year(n).caught} of ${year(n).trouble}; ${year(n).caught} of ${year(n).breaches}`), [
    '8 of 10; 8 of 16',
    '8 of 10; 8 of 20',
    '9 of 10; 9 of 25',
  ]);
});

test('the after-text: debt service cover alone, and all twelve', () => {
  const one = year(1);
  assert.deepEqual([one.caught, one.alarms, one.healthy, one.breaches, one.missed], [6, 4, 190, 10, 4]);
  const all = year(MAX);
  assert.deepEqual([all.caught, all.trouble, all.alarms, all.breaches], [10, 10, 113, 123]);
  assert.equal(Math.round(all.means * 100), 8);
  assert.equal(Math.round(all.base * 100), 5);
  // “Three healthy borrowers in five a year” breach something with all twelve.
  near(all.alarms / all.healthy, 3 / 5, 0.01);
  near(rates(MAX).alarm, 0.595, 0.001);
  // The found text with three covenants: 8 of the 20 breaches mean real trouble.
  const three = year(3);
  assert.deepEqual([three.caught, three.breaches], [8, 20]);
  // “Three covenants catch 8 of the 10 in trouble; the other nine add 2, and 101 false alarms.”
  assert.equal(three.trouble, 10);
  assert.deepEqual([all.caught - three.caught, all.alarms - three.alarms], [2, 101]);
});

test('the year: with three covenants a breach means trouble one in five, two in five, about three in four', () => {
  const calm = year(3, 'calm');
  const normal = year(3, 'normal');
  const crisis = year(3, 'crisis');
  assert.deepEqual([calm.caught, calm.breaches], [3, 15]);
  assert.equal(frac(calm), 1 / 5);
  assert.deepEqual([normal.caught, normal.breaches], [8, 20]);
  assert.equal(frac(normal), 2 / 5);
  assert.deepEqual([crisis.caught, crisis.breaches], [34, 44]);
  near(frac(crisis), 3 / 4, 0.03);
  // The exact rule tells the same story.
  near(posterior(3, 0.02), 0.21, 0.01);
  near(posterior(3, 0.05), 0.41, 0.01);
  near(posterior(3, 0.2), 0.77, 0.01);
});

test('Bayes by hand: a covenant that trips for 80% in trouble and 10% of healthy borrowers, 5 in 100 in trouble', () => {
  // The design note's illustration, as a check on the arithmetic: about a 30% chance.
  const t = 0.05 * 0.8;
  near(t / (t + 0.95 * 0.1), 0.3, 0.01);
});
