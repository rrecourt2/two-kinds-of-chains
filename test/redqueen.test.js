// Running to stand still: every number the chapter quotes, from the model.
import test from 'node:test';
import assert from 'node:assert/strict';

import { PATTERNS, P, CHECKS, ATTEMPTS, MONTHS, SEED, RUNS, NUMBERS, simulate, summary, caughtShare, study } from '../src/lib/sim/redqueen.js';

const pct = (v) => Math.round(v * 100);
const S = study(RUNS);

test('redqueen: a run has 36 months of 50 attempts over twelve patterns, three checked', () => {
  assert.equal(PATTERNS.length, 12);
  assert.equal(P, 12);
  for (const review of ['never', 'yearly', 'quarterly', 'monthly'])
    for (const random of [false, true]) {
      const run = simulate({ review, random });
      assert.equal(run.length, MONTHS);
      for (const m of run) {
        assert.equal(m.n.reduce((a, b) => a + b, 0), ATTEMPTS);
        assert.equal(m.caught + m.lost, ATTEMPTS);
        assert.equal(m.checked.length, CHECKS, `${review} ${random}`);
        assert.equal(new Set(m.checked).size, CHECKS);
        // Only attempts on checked patterns can be caught.
        assert.ok(m.caught <= m.checked.reduce((s, p) => s + m.n[p], 0));
      }
    }
});

test('redqueen: the same seed gives the same run; the checks move only at reviews', () => {
  assert.deepEqual(simulate({ review: 'yearly' }), simulate({ review: 'yearly', seed: SEED }));
  const never = simulate({ review: 'never' });
  assert.ok(never.every((m) => m.checked.join() === '0,1,2'), 'never reviewed: the three in use most, for good');
  const yearly = simulate({ review: 'yearly' });
  for (let m = 1; m < MONTHS; m++) if (m % 12) assert.equal(yearly[m].checked.join(), yearly[m - 1].checked.join(), `month ${m + 1}`);
  // Until the first review, every setting without a random check is the same run.
  const monthly = simulate({ review: 'monthly' });
  assert.deepEqual(monthly[0], yearly[0]);
  assert.deepEqual(never.slice(0, 12), yearly.slice(0, 12));
  // At random: two checks follow the review, the third changes from month to month.
  const rnd = simulate({ review: 'never', random: true });
  assert.ok(rnd.every((m) => m.checked.includes(0) && m.checked.includes(1)));
  assert.ok(new Set(rnd.map((m) => m.checked.join())).size > 5);
});

test('redqueen: the growing chain adds a check at each review and never drops one', () => {
  const run = simulate({ review: 'quarterly', grow: true });
  for (let m = 1; m < MONTHS; m++) {
    for (const p of run[m - 1].checked) assert.ok(run[m].checked.includes(p), 'never dropped');
    assert.equal(run[m].checked.length, Math.min(P, CHECKS + Math.floor(m / 3)));
  }
  assert.equal(run[MONTHS - 1].checked.length, 12);
  assert.equal(S.grow.checks.toFixed(6), (12).toFixed(6), 'every run checks all twelve by month 36');
});

test('redqueen: the figure’s run (seed 159) is close to the average run', () => {
  const at = (opts) => summary(simulate({ ...opts, seed: SEED }));
  const y = at({ review: 'yearly' });
  assert.equal(y.caughtFirst, 37); // “about three in four”: 74%
  assert.equal(pct(y.first), 74);
  assert.equal(y.caughtYear3, 56); // 9% of 600
  assert.equal(pct(y.years[2]), 9);
  assert.equal(pct(at({ review: 'never' }).years[2]), 1);
  assert.equal(pct(at({ review: 'monthly' }).years[2]), 26);
  assert.equal(pct(at({ review: 'yearly', random: true }).years[2]), 15);
  assert.equal(pct(at({ review: 'yearly', random: true }).first), 52);
  assert.equal(caughtShare(simulate({ review: 'yearly' }), 24, 36), y.years[2]);
});

test('redqueen: the puzzle — reviewed once a year, about one in ten in year three', () => {
  assert.equal(pct(S.yearly.first), NUMBERS.first); // about three in four in the first month
  assert.ok(S.yearly.first > 0.7 && S.yearly.first < 0.75);
  const y3 = S.yearly.years[2];
  assert.equal(pct(y3), NUMBERS.year3.yearly);
  // The closest of the four choices (three in four, half, one in four, one in ten) is one in ten.
  const choices = [0.75, 0.5, 0.25, 0.1];
  const nearest = choices.reduce((a, c) => (Math.abs(c - y3) < Math.abs(a - y3) ? c : a));
  assert.equal(nearest, 0.1);
  // In the figure's run too.
  const fig = summary(simulate({ review: 'yearly' })).years[2];
  assert.equal(choices.reduce((a, c) => (Math.abs(c - fig) < Math.abs(a - fig) ? c : a)), 0.1);
});

test('redqueen: found — a burst of catches at each yearly review, gone within six months', () => {
  const c = S.yearly.curve;
  assert.equal(pct(c[11]), NUMBERS.yearlyMonth[12]);
  assert.equal(pct(c[12]), NUMBERS.yearlyMonth[13]);
  assert.equal(pct(c[17]), NUMBERS.yearlyMonth[18]);
  assert.equal(pct(c[24]), NUMBERS.yearlyMonth[25]);
  assert.equal(pct(c[29]), NUMBERS.yearlyMonth[30]);
  for (const start of [12, 24]) {
    assert.ok(c[start] > 5 * c[start - 1], 'a burst');
    assert.ok(c[start + 5] < 0.05, 'within six months the attempts have moved');
  }
});

test('redqueen: after-text numbers — the checks stay put, the attempts move', () => {
  assert.equal(pct(S.drift[0]), NUMBERS.onFirstThree[1]);
  assert.equal(pct(S.drift[5]), NUMBERS.onFirstThree[6]);
  assert.equal(pct(S.drift[11]), NUMBERS.onFirstThree[12]);
});

test('redqueen: after-text numbers — reviewing faster never gets back to the start', () => {
  for (const k of ['never', 'yearly', 'quarterly', 'monthly']) {
    assert.equal(pct(S[k].first), NUMBERS.first, `${k} first month`);
    assert.equal(pct(S[k].years[2]), NUMBERS.year3[k], `${k} year three`);
  }
  // Faster is better, with less and less to gain.
  assert.ok(S.never.years[2] < S.yearly.years[2] && S.yearly.years[2] < S.quarterly.years[2] && S.quarterly.years[2] < S.monthly.years[2]);
  assert.ok(S.monthly.years[2] - S.quarterly.years[2] < 0.05);
  // No month after the third comes back near the first month's catch, even with monthly reviews.
  const best = Math.max(...S.monthly.curve.slice(3));
  assert.equal(pct(best), NUMBERS.monthlyBest);
  assert.ok(best < S.monthly.first / 2);
});

test('redqueen: after-text numbers — the growing chain and the random check', () => {
  assert.equal(pct(S.grow.years[2]), NUMBERS.grow);
  assert.equal(NUMBERS.growChecks, 12);
  assert.equal(pct(S.yearlyRandom.first), NUMBERS.firstRandom);
  assert.equal(pct(S.yearlyRandom.years[2]), NUMBERS.year3Random.yearly);
  assert.equal(pct(S.neverRandom.years[2]), NUMBERS.year3Random.never);
  assert.equal(pct(S.monthlyRandom.years[2]), NUMBERS.year3Random.monthly);
  // A random check pays where reviews are slow, costs a little where they are fast.
  assert.ok(S.yearlyRandom.years[2] > S.yearly.years[2] + 0.05);
  assert.ok(S.neverRandom.years[2] > S.never.years[2] + 0.05);
  assert.ok(Math.abs(S.monthlyRandom.years[2] - S.monthly.years[2]) < 0.01);
});
