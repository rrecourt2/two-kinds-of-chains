// Running to stand still: every number the chapter quotes, from the model.
// In the model's words a pattern is a red flag, a check is a review, an attempt is a rigged contract, and a review
// (the `review` option) is a move of the reviews.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PATTERNS,
  P,
  CHECKS,
  CATCH,
  ATTEMPTS,
  MONTHS,
  PARAMS,
  SEED,
  RUNS,
  NUMBERS,
  CURVES,
  MODES,
  curveKey,
  curveOf,
  yearOf,
  allCheckedFrom,
  simulate,
  summary,
  caughtShare,
  study,
} from '../src/lib/sim/redqueen.js';

const pct = (v) => Math.round(v * 100);
const S = study(RUNS);
const y3 = (review, mode) => Math.round(yearOf(curveOf(review, mode), 2));

test('redqueen: a run has 36 months of 50 rigged contracts over twelve red flags, three reviewed', () => {
  assert.equal(PATTERNS.length, 12);
  assert.equal(new Set(PATTERNS).size, 12);
  assert.equal(P, 12);
  // The model note's words: a review catches nine in ten; half of what got through is found later; the mix moves a
  // quarter of the way to the payoff each month; 80% of the rigged contracts start on the three flags reviewed first.
  assert.equal(CATCH, 0.9);
  assert.deepEqual(PARAMS, { learn: 0.25, innovate: 0.03, seen: 0.5, start: 0.8 });
  for (const review of ['never', 'yearly', 'quarterly', 'monthly'])
    for (const random of [false, true]) {
      const run = simulate({ review, random });
      assert.equal(run.length, MONTHS);
      for (const m of run) {
        assert.equal(m.n.reduce((a, b) => a + b, 0), ATTEMPTS);
        assert.equal(m.caught + m.lost, ATTEMPTS);
        assert.equal(m.checked.length, CHECKS, `${review} ${random}`);
        assert.equal(new Set(m.checked).size, CHECKS);
        // Only rigged contracts carrying a reviewed flag can be caught.
        assert.ok(m.caught <= m.checked.reduce((s, p) => s + m.n[p], 0));
      }
    }
});

test('redqueen: the same seed gives the same run; the reviews move only when they are moved', () => {
  assert.deepEqual(simulate({ review: 'yearly' }), simulate({ review: 'yearly', seed: SEED }));
  const never = simulate({ review: 'never' });
  assert.ok(never.every((m) => m.checked.join() === '0,1,2'), 'never moved: the three seen most, for good');
  const yearly = simulate({ review: 'yearly' });
  for (let m = 1; m < MONTHS; m++) if (m % 12) assert.equal(yearly[m].checked.join(), yearly[m - 1].checked.join(), `month ${m + 1}`);
  // Until the first move, every setting without a random review is the same run.
  const monthly = simulate({ review: 'monthly' });
  assert.deepEqual(monthly[0], yearly[0]);
  assert.deepEqual(never.slice(0, 12), yearly.slice(0, 12));
  // At random: two reviews follow the findings, the third changes from month to month.
  const rnd = simulate({ review: 'never', random: true });
  assert.ok(rnd.every((m) => m.checked.includes(0) && m.checked.includes(1)));
  assert.ok(new Set(rnd.map((m) => m.checked.join())).size > 5);
});

test('redqueen: the growing chain adds a review at each move and never drops one', () => {
  for (const [review, every] of [['yearly', 12], ['quarterly', 3], ['monthly', 1]]) {
    const run = simulate({ review, grow: true });
    for (let m = 1; m < MONTHS; m++) {
      for (const p of run[m - 1].checked) assert.ok(run[m].checked.includes(p), 'never dropped');
      assert.equal(run[m].checked.length, Math.min(P, CHECKS + Math.floor(m / every)));
    }
  }
  assert.equal(simulate({ review: 'yearly', grow: true })[MONTHS - 1].checked.length, 5);
  assert.equal(simulate({ review: 'monthly', grow: true })[MONTHS - 1].checked.length, 12);
  assert.equal(allCheckedFrom('monthly'), 10, 'all twelve reviewed from the tenth month');
  assert.equal(allCheckedFrom('yearly'), 0);
  assert.equal(S['monthly-grow'].checks.toFixed(6), (12).toFixed(6), 'every run reviews all twelve by month 36');
  // With no moves nothing is added: the same as the reviews left alone.
  assert.equal(curveKey('never', 'grow'), 'never');
  assert.deepEqual(simulate({ review: 'never', grow: true }), simulate({ review: 'never' }));
});

test('redqueen: the curves on the card are the averages over 400 runs', () => {
  const keys = new Set();
  for (const review of ['never', 'yearly', 'monthly']) for (const mode of MODES) keys.add(curveKey(review, mode));
  assert.deepEqual([...keys].sort(), Object.keys(CURVES).sort());
  for (const key of keys) {
    const a = S[key];
    assert.equal(CURVES[key].length, MONTHS);
    assert.deepEqual(CURVES[key], a.curve.map((v) => Math.round(v * 10000) / 100), key);
    // The year's catch from the rounded curve is the year's catch over the runs.
    for (let y = 0; y < 3; y++) assert.equal(Math.round(yearOf(CURVES[key], y)), pct(a.years[y]), `${key} year ${y + 1}`);
    assert.equal(Math.round(CURVES[key][0]), pct(a.first), `${key} first month`);
  }
  // Every single month the text quotes rounds as the month over the runs does.
  for (const [key, i] of [['yearly', 0], ['yearly', 12], ['yearly', 24], ['yearly-random', 0], ['monthly-grow', 9]])
    assert.equal(Math.round(CURVES[key][i]), pct(S[key].curve[i]), `${key} month ${i + 1}`);
});

test('redqueen: the figure’s run (seed 108) is one run near the average', () => {
  const at = (opts) => summary(simulate({ ...opts, seed: SEED }));
  const y = at({ review: 'yearly' });
  assert.equal(y.caughtFirst, 36);
  assert.equal(pct(y.years[2]), y3('yearly'));
  assert.ok(Math.abs(pct(at({ review: 'monthly' }).years[2]) - y3('monthly')) <= 1);
  assert.ok(Math.abs(pct(at({ review: 'never' }).years[2]) - y3('never')) <= 1);
  assert.ok(Math.abs(pct(at({ review: 'yearly', random: true }).years[2]) - y3('yearly', 'random')) <= 1);
  assert.equal(caughtShare(simulate({ review: 'yearly' }), 24, 36), y.years[2]);
});

test('redqueen: the puzzle — moved every month, about one in four in year three', () => {
  assert.equal(Math.round(curveOf('monthly')[0]), 72); // the first month: before any move
  assert.equal(y3('monthly'), 24);
  assert.equal(y3('yearly'), 14); // on the tile before the answer, and in the wrong-answer note for one in ten
  // The closest of the four choices (three in four, half, one in four, one in ten) is one in four.
  const choices = [0.75, 0.5, 0.25, 0.1];
  const nearest = (v) => choices.reduce((a, c) => (Math.abs(c - v) < Math.abs(a - v) ? c : a));
  assert.equal(nearest(yearOf(curveOf('monthly'), 2) / 100), 0.25);
  // One in ten is the nearest choice to what yearly moves manage, so the wrong-answer note says it is more than that.
  assert.equal(nearest(yearOf(curveOf('yearly'), 2) / 100), 0.1);
  assert.ok(yearOf(curveOf('yearly'), 2) > 10);
  // Even the month right after a yearly move catches less than half (hint and wrong-answer note).
  const c = curveOf('yearly');
  assert.equal(Math.round(c[12]), 27);
  assert.equal(Math.round(c[24]), 35);
  assert.ok(c[12] < 50 && c[24] < 50);
  // Moved monthly, the catch levels off: no month in year three strays more than two points from the year's catch.
  const m = curveOf('monthly');
  for (let i = 24; i < 36; i++) assert.ok(Math.abs(m[i] - yearOf(m, 2)) < 2, `month ${i + 1}`);
});

test('redqueen: after-text numbers — the reviews stay put, the schemes move within a year', () => {
  assert.equal(pct(S.drift[0]), NUMBERS.onFirstThree[1]);
  assert.equal(pct(S.drift[11]), NUMBERS.onFirstThree[12]);
  // Left alone, the reviews lose most of their catch within a year (the caption): by the twelfth month it is under a
  // tenth of the first month's, and not before.
  const n = curveOf('never');
  assert.ok(n[11] < n[0] / 10);
  assert.ok(n[10] > n[0] / 10);
  // The drift note on the chart sits at month five, where the line has fallen well below the first month's.
  assert.ok(n[4] < n[0] / 2);
});

test('redqueen: after-text numbers — moving more often never gets back to the start', () => {
  assert.equal(y3('never'), 3);
  assert.ok(y3('never') < y3('yearly') && y3('yearly') < y3('monthly'));
  const best = Math.max(...curveOf('monthly').slice(4));
  assert.ok(best < curveOf('monthly')[0] / 2, 'after the fourth month, no month comes back to even half the first');
  // Why: chased every month, the schemes spread almost evenly over the twelve flags (a quarter would be 25%), so three
  // reviews meet only 27% of year three's rigged contracts, and catch nine in ten of those: the 24%.
  assert.equal(pct(S.onReviewedMonthly), NUMBERS.onReviewedYear3.monthly);
  assert.ok(Math.abs(S.onReviewedMonthly - CHECKS / P) < 0.03);
  assert.ok(Math.abs(CATCH * S.onReviewedMonthly * 100 - yearOf(curveOf('monthly'), 2)) < 0.5);
});

test('redqueen: after-text numbers — the growing chain and the random review', () => {
  // A review added every month, none dropped: from month 10 all twelve are reviewed and the catch holds at 90%.
  const g = curveOf('monthly', 'grow');
  assert.equal(Math.round(g[9]), 90);
  assert.ok(g[8] < 80);
  assert.equal(y3('monthly', 'grow'), 90);
  assert.equal(y3('yearly', 'grow'), 8); // yearly: five reviews by year three, most on flags the schemes have left
  // One review at random: less in the first month, more where moves are slow, the same where they are fast.
  assert.equal(Math.round(curveOf('yearly', 'random')[0]), 52);
  assert.equal(y3('yearly', 'random'), 17);
  assert.equal(y3('never', 'random'), 11);
  assert.ok(y3('yearly', 'random') > y3('yearly') && y3('never', 'random') > y3('never'));
  assert.equal(y3('monthly', 'random'), 24);
  assert.ok(Math.abs(yearOf(curveOf('monthly', 'random'), 2) - yearOf(curveOf('monthly'), 2)) < 1);
});
