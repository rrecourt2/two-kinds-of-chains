// The gate worth keeping (chapter 12): three payment instructions, three designs.
import test from 'node:test';
import assert from 'node:assert/strict';

import { INSTRUCTIONS, DESIGNS, NEXT, REVIEW_DAYS, LAST_DAY, reviewerFor, follow, stateOn, runDesign } from '../src/lib/sim/gate.js';

const byId = (run) => Object.fromEntries(run.rows.map((r) => [r.id, r]));
const legal = (row) => {
  for (let i = 1; i < row.history.length; i++) {
    const a = row.history[i - 1];
    const b = row.history[i];
    assert.ok(NEXT[a.state].includes(b.state), `${row.id}: ${a.state} → ${b.state}`);
    assert.ok(b.day >= a.day, `${row.id}: time runs forwards`);
  }
};

test('gate: the fixed scenario', () => {
  assert.equal(REVIEW_DAYS, 1);
  assert.equal(LAST_DAY, 6);
  assert.deepEqual(
    INSTRUCTIONS.map((i) => [i.id, i.fraud, i.named, i.deputy]),
    [['A', false, 0, 0], ['B', false, 4, 0], ['C', true, 4, 0]],
  );
  assert.deepEqual(DESIGNS.map((d) => d.id), ['named', 'any', 'pay-first']);
});

test('gate: check first, named reviewer only — A day 1, B day 5, C flagged and held on day 5', () => {
  const run = runDesign('named');
  const r = byId(run);
  assert.equal(r.A.paidAt, 1);
  assert.equal(r.A.checkedBy, 'named');
  assert.equal(r.B.reviewStart, 4);
  assert.equal(r.B.paidAt, 5);
  assert.equal(r.C.outcome, 'held');
  assert.equal(r.C.foundAt, 5);
  assert.equal(r.C.paidAt, null);
  assert.equal(r.C.prevented, true);
  assert.deepEqual(r.B.history.map((h) => h.state), ['waiting', 'reviewing', 'passed', 'paid']);
  assert.deepEqual(r.C.history.map((h) => h.state), ['waiting', 'reviewing', 'flagged', 'held']);
  assert.equal(run.avgValidDays, 3);
  assert.equal(run.fraudPaid, 0);
  assert.equal(run.fraudHeld, 1);
});

test('gate: check first, any qualified reviewer — A and B day 1, C flagged and held on day 1', () => {
  const run = runDesign('any');
  const r = byId(run);
  assert.equal(r.A.paidAt, 1);
  assert.equal(r.A.checkedBy, 'named'); // the named reviewer is in, so takes it
  assert.equal(r.B.paidAt, 1);
  assert.equal(r.B.checkedBy, 'deputy');
  assert.equal(r.C.checkedBy, 'deputy');
  assert.equal(r.C.outcome, 'held');
  assert.equal(r.C.foundAt, 1);
  assert.equal(run.avgValidDays, 1);
  assert.equal(run.fraudPaid, 0);
  assert.equal(run.fraudHeld, 1);
});

test('gate: pay first, check after — all three paid on day 0; the fraud is found on day 1, too late', () => {
  const run = runDesign('pay-first');
  const r = byId(run);
  for (const id of ['A', 'B', 'C']) assert.equal(r[id].paidAt, 0);
  assert.equal(r.C.outcome, 'paid-fraud');
  assert.equal(r.C.foundAt, 1);
  assert.equal(r.C.prevented, false);
  assert.deepEqual(r.C.history.map((h) => h.state), ['waiting', 'paid', 'reviewing', 'flagged']);
  assert.equal(run.avgValidDays, 0);
  assert.equal(run.fraudPaid, 1);
  assert.equal(run.fraudFoundAfterPayment, 1);
});

test('gate: detection after payment never prevents, whoever checks and however fast', () => {
  const late = { id: 'late', checkFirst: false, anyQualified: false }; // pay first, named reviewer checks after
  const r = byId(runDesign(late));
  assert.equal(r.C.foundAt, 5);
  assert.equal(r.C.outcome, 'paid-fraud');
  for (const reviewDays of [0, 1, 3]) {
    for (const d of [late, 'pay-first']) assert.equal(runDesign(d, { reviewDays }).fraudPaid, 1);
  }
});

test('gate: every history uses only legal moves, and the state on each day follows it', () => {
  for (const d of DESIGNS) {
    for (const row of runDesign(d).rows) {
      legal(row);
      assert.equal(stateOn(row, 0), d.checkFirst ? (row.reviewStart === 0 ? 'reviewing' : 'waiting') : row.reviewStart === 0 ? 'reviewing' : 'paid');
      assert.equal(stateOn(row, LAST_DAY), row.history[row.history.length - 1].state);
    }
  }
  const b = byId(runDesign('named')).B;
  assert.deepEqual([0, 3, 4, 5, 6].map((day) => stateOn(b, day)), ['waiting', 'waiting', 'reviewing', 'paid', 'paid']);
  const c = byId(runDesign('pay-first')).C;
  assert.deepEqual([0, 1, 2].map((day) => stateOn(c, day)), ['reviewing', 'flagged', 'flagged']);
});

test('gate: deterministic; nothing changes when a design is run again or in another order', () => {
  const first = DESIGNS.map((d) => runDesign(d));
  const again = [...DESIGNS].reverse().map((d) => runDesign(d)).reverse();
  assert.deepEqual(again, first);
  assert.deepEqual(runDesign('any'), runDesign('any'));
  assert.ok(Object.isFrozen(INSTRUCTIONS) && INSTRUCTIONS.every(Object.isFrozen));
  assert.deepEqual(
    INSTRUCTIONS.map((i) => ({ ...i })),
    [
      { id: 'A', fraud: false, named: 0, deputy: 0 },
      { id: 'B', fraud: false, named: 4, deputy: 0 },
      { id: 'C', fraud: true, named: 4, deputy: 0 },
    ],
  );
});

test('gate: with no fraudulent instruction, paying first is quickest and loses nothing', () => {
  const honest = INSTRUCTIONS.map((i) => ({ ...i, fraud: false }));
  const runs = Object.fromEntries(DESIGNS.map((d) => [d.id, runDesign(d, { instructions: honest })]));
  for (const run of Object.values(runs)) {
    assert.equal(run.fraudTotal, 0);
    assert.equal(run.fraudPaid, 0);
    assert.equal(run.fraudHeld, 0);
  }
  assert.equal(runs.named.avgValidDays, 11 / 3); // A day 1, B and C day 5
  assert.equal(runs.any.avgValidDays, 1);
  assert.equal(runs['pay-first'].avgValidDays, 0);
});

test('gate: with every reviewer away, check first pays nothing and pay first never finds the fraud', () => {
  const nobody = INSTRUCTIONS.map((i) => ({ ...i, named: null, deputy: null }));
  for (const id of ['named', 'any']) {
    const run = runDesign(id, { instructions: nobody });
    assert.equal(run.avgValidDays, Infinity);
    assert.equal(run.validUnpaid, 2);
    assert.equal(run.fraudPaid, 0);
    assert.equal(run.fraudHeld, 0);
    for (const row of run.rows) {
      assert.equal(row.outcome, 'waiting');
      assert.equal(stateOn(row, LAST_DAY), 'waiting');
    }
  }
  const pay = runDesign('pay-first', { instructions: nobody });
  assert.equal(pay.avgValidDays, 0);
  assert.equal(pay.fraudPaid, 1);
  assert.equal(byId(pay).C.foundAt, null);
  assert.equal(reviewerFor(nobody[0], 'any'), null);
  // Only the deputy away: the named reviewer still does every check.
  const noDeputy = INSTRUCTIONS.map((i) => ({ ...i, deputy: null }));
  assert.deepEqual(runDesign('any', { instructions: noDeputy }).rows, runDesign('named').rows);
});

test('gate: a zero-day check — any qualified reviewer pays at once and still holds the fraud', () => {
  const zero = { reviewDays: 0 };
  const named = byId(runDesign('named', zero));
  assert.equal(named.A.paidAt, 0);
  assert.equal(named.B.paidAt, 4); // still waits for the named reviewer
  assert.equal(runDesign('named', zero).avgValidDays, 2);
  const any = runDesign('any', zero);
  assert.equal(any.avgValidDays, 0);
  assert.equal(any.fraudPaid, 0);
  assert.equal(byId(any).C.foundAt, 0);
  assert.deepEqual(byId(any).C.history, [
    { state: 'waiting', day: 0 },
    { state: 'reviewing', day: 0 },
    { state: 'flagged', day: 0 },
    { state: 'held', day: 0 },
  ]);
  assert.equal(stateOn(byId(any).A, 0), 'paid'); // a later move on the same day wins
  const pay = runDesign('pay-first', zero);
  assert.equal(pay.fraudPaid, 1); // found on the day it was paid, and still paid
  assert.equal(byId(pay).C.foundAt, 0);
});

test('gate: the puzzle — only the qualified deputy is both quicker and safe', () => {
  const [named, any, pay] = DESIGNS.map((d) => runDesign(d));
  assert.ok(any.avgValidDays < named.avgValidDays && any.fraudPaid === 0);
  assert.ok(pay.avgValidDays < named.avgValidDays && pay.fraudPaid > 0);
  assert.equal(pay.avgValidDays, any.avgValidDays - 1); // paying first is a day quicker still
  // Delay and loss stay separate outcomes: no blended score.
  for (const run of [named, any, pay]) assert.equal(Object.keys(run).some((k) => /score|cost/i.test(k)), false);
});

test('gate: illegal moves are refused', () => {
  assert.throws(() => follow(INSTRUCTIONS[0], 'nonsense'), /Unknown design/);
  assert.equal(NEXT.held.length, 0);
  assert.ok(!NEXT.flagged.includes('paid'));
});
