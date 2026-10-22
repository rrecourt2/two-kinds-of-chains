// Chapter 14, Time to disbursement: the model, the puzzle's constraints and every number the text prints.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONDITIONS,
  TOTAL,
  MIN_BEFORE,
  REMOVAL_ORDER,
  PARAMS,
  TARGET,
  SAMPLE_LOAN,
  requiredIds,
  simulateLoans,
  typical,
  nineInTen,
  within,
  shareWithin,
  histogram,
  inTime,
  dateSetters,
} from '../src/lib/sim/disbursement.js';

const run = (o = {}) => {
  const s = simulateLoans(o);
  return { s, mid: typical(s.days), p90: nineInTen(s.days) };
};
const byId = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

test('disbursement: twelve conditions with short names, four that never move, and the removal order', () => {
  assert.equal(TOTAL, 12);
  assert.equal(MIN_BEFORE, 4);
  for (const c of CONDITIONS) assert.ok(c.name.length <= 19, c.name);
  assert.deepEqual(
    CONDITIONS.filter((c) => c.fixed).map((c) => c.name),
    ['KYC checks', 'Board approval', 'Security signed', 'Legal opinion'],
  );
  assert.deepEqual(REMOVAL_ORDER, ['agent', 'hedging', 'registered', 'insurance', 'equity', 'permits', 'esap', 'central']);
  assert.deepEqual(
    CONDITIONS.filter((c) => c.alt).map((c) => c.id),
    ['board', 'permits', 'equity', 'insurance', 'registered'],
  );
  assert.equal(byId.opinion.after, 'signed');
  assert.equal(byId.registered.after, 'signed');
  assert.equal(byId.fees, undefined);
  assert.deepEqual(requiredIds(8), ['kyc', 'board', 'signed', 'opinion', 'central', 'esap', 'permits', 'equity']);
  assert.equal(requiredIds(2).length, 4);
  assert.equal(requiredIds(20).length, 12);
  assert.equal(PARAMS.loans, 2000);
  assert.equal(PARAMS.returned, 0.15);
});

test('disbursement: with no spread and no returns, every condition is met on its typical day', () => {
  const s = simulateLoans({ loans: 50, params: { sigma: { unpredictable: 0 }, returned: 0 } });
  for (let l = 0; l < 50; l++) {
    CONDITIONS.forEach((c, i) => assert.equal(s.met[l * TOTAL + i], c.median, c.id));
    assert.equal(s.days[l], Math.max(...CONDITIONS.map((c) => c.median)) + PARAMS.check);
  }
});

test('disbursement: deterministic, and a change of settings changes the rules, never the luck', () => {
  assert.deepEqual(simulateLoans({ before: 9, alternatives: true }).days, simulateLoans({ before: 9, alternatives: true }).days);
  for (const predictable of [false, true]) {
    let prev = null;
    for (let before = 4; before <= 12; before++) {
      const wait = simulateLoans({ before, predictable }).days;
      const alt = simulateLoans({ before, alternatives: true, predictable }).days;
      for (let l = 0; l < wait.length; l++) assert.ok(alt[l] <= wait[l], 'an alternative never makes a loan slower');
      if (prev) for (let l = 0; l < wait.length; l++) assert.ok(wait[l] >= prev[l], 'another condition never makes a loan faster');
      prev = wait;
    }
  }
});

test('disbursement: the puzzle needs both levers, with a visible margin', () => {
  const start = run();
  assert.ok(start.p90 >= TARGET + 25, `the start misses clearly (${start.p90})`);
  // The slider alone: no setting of eight or more meets the target without alternatives.
  for (let before = 8; before <= 12; before++) assert.ok(run({ before }).p90 >= TARGET + 10, `slider alone at ${before}`);
  // Alternatives alone, at twelve, miss.
  assert.ok(run({ alternatives: true }).p90 >= TARGET + 5);
  assert.ok(run({ before: 11, alternatives: true }).p90 >= TARGET + 5);
  // Eight conditions with alternatives meet it with a margin.
  const answer = run({ before: 8, alternatives: true });
  assert.ok(answer.p90 <= TARGET - 5, `answer ${answer.p90}`);
  // Without alternatives it would take fewer than eight conditions, which fails the first check.
  assert.ok(run({ before: 6 }).p90 <= TARGET);
  assert.ok(run({ before: 7 }).p90 > TARGET);
  // Predictable parties alone would meet it: that is why the puzzle insists on unpredictable ones.
  assert.ok(run({ predictable: true }).p90 <= TARGET);
});

test('disbursement: the numbers in the found text, stats and after-text', () => {
  const start = run();
  const pred = run({ predictable: true });
  const slider = run({ before: 8 });
  const alt = run({ alternatives: true });
  const answer = run({ before: 8, alternatives: true });
  const predAlt = run({ alternatives: true, predictable: true });
  assert.deepEqual([start.mid, start.p90], [58, 91]);
  assert.deepEqual([pred.mid, pred.p90], [43, 56]);
  assert.deepEqual([slider.mid, slider.p90], [45, 76]);
  assert.deepEqual([alt.mid, alt.p90], [42, 67]);
  assert.deepEqual([answer.mid, answer.p90], [32, 52]);
  assert.deepEqual([predAlt.mid, predAlt.p90], [32, 43]);
  // Spread, not averages: 15 more days for the typical loan, 35 for the slow tail.
  assert.equal(start.mid - pred.mid, 15);
  assert.equal(start.p90 - pred.p90, 35);
  // Alternatives are worth more when the parties are unpredictable: 24 days against 13.
  assert.equal(start.p90 - alt.p90, 24);
  assert.equal(pred.p90 - predAlt.p90, 13);
  // Each condition alone is in time in at least 77 loans in 100; all twelve together in 55.
  const each = inTime(start.s, TARGET);
  assert.equal(Math.floor(Math.min(...each) * 100), 77);
  assert.equal(Math.round(shareWithin(start.s.days, TARGET) * 100), 55);
  // No condition typically takes more than 35 days; Security registered sets the date in two loans in five.
  assert.equal(Math.max(...CONDITIONS.map((c) => c.median)), 35);
  const reg = dateSetters(start.s)[CONDITIONS.findIndex((c) => c.id === 'registered')];
  assert.ok(reg >= 0.375 && reg < 0.425, `registered sets the date in ${reg}`);
});

test('disbursement: the sample loan shows each lever, and both together', () => {
  assert.equal(SAMPLE_LOAN, 56);
  const story = (o) => {
    const one = simulateLoans(o).sample;
    const setter = one.conditions.find((c) => c.setsDate);
    return { day: one.day, by: setter.id, alt: setter.alt };
  };
  assert.deepEqual(story({}), { day: 83, by: 'registered', alt: false });
  assert.deepEqual(story({ before: 8 }), { day: 66, by: 'permits', alt: false });
  assert.deepEqual(story({ alternatives: true }), { day: 63, by: 'hedging', alt: false });
  assert.deepEqual(story({ before: 8, alternatives: true }), { day: 30, by: 'permits', alt: true });
  // The sample is the same loan as in the full run.
  const s = simulateLoans({});
  assert.equal(s.days[SAMPLE_LOAN], s.sample.day);
  // Moved conditions are marked; only required ones can set the date.
  const moved = simulateLoans({ before: 8 }).sample.conditions.filter((c) => !c.required).map((c) => c.id);
  assert.deepEqual(moved, ['insurance', 'registered', 'hedging', 'agent']);
});

test('disbursement: an alternative waits 20 working days, and registration’s waits for its filing', () => {
  const s = simulateLoans({ alternatives: true });
  for (const c of s.sample.conditions) if (c.alt) assert.ok(c.met > PARAMS.wait && c.met < c.good);
  for (let l = 0; l < 300; l++) {
    const one = simulateLoans({ alternatives: true, sample: l }).sample.conditions;
    const signed = one.find((c) => c.id === 'signed');
    const reg = one.find((c) => c.id === 'registered');
    if (reg.alt) assert.ok(reg.met > signed.met && reg.met > PARAMS.wait);
    for (const c of one) if (!c.hasAlt) assert.equal(c.alt, false);
  }
});

test('disbursement: one reviewer checking in order of arrival changes nine-in-ten by a day at most', () => {
  const loans = 400;
  for (const o of [{}, { before: 8, alternatives: true }]) {
    const side = simulateLoans({ ...o, loans }).days;
    const fifo = new Int32Array(loans);
    for (let l = 0; l < loans; l++) {
      const arrivals = [];
      for (const c of simulateLoans({ ...o, loans, sample: l }).sample.conditions) {
        if (!c.required) continue;
        arrivals.push(c.met);
        if (c.back && !c.alt) arrivals.push(c.first);
      }
      arrivals.sort((a, b) => a - b);
      let free = 0;
      for (const t of arrivals) free = Math.max(free, t) + PARAMS.check - 1;
      fifo[l] = free + 1;
    }
    assert.ok(Math.abs(nineInTen(fifo) - nineInTen(side)) <= 1, `${nineInTen(fifo)} vs ${nineInTen(side)}`);
  }
});

test('disbursement: summaries and histogram', () => {
  assert.equal(within(Int32Array.from([5, 1, 3, 2, 4]), 0.5), 3);
  assert.equal(within(Int32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 0.9), 9);
  const s = simulateLoans({});
  const { bins, beyond } = histogram(s.days, 120);
  assert.equal(bins.length, 121);
  assert.equal(bins.reduce((a, b) => a + b, 0) + beyond, s.days.length);
  assert.ok(shareWithin(s.days, nineInTen(s.days)) >= 0.9);
  assert.ok(shareWithin(s.days, nineInTen(s.days) - 1) < 0.9);
});

test('disbursement: fast enough to recompute on every slider step', () => {
  simulateLoans({});
  const t0 = performance.now();
  for (let before = 4; before <= 12; before++) simulateLoans({ before, alternatives: before % 2 === 0 });
  assert.ok((performance.now() - t0) / 9 < 40);
});
