import test from 'node:test';
import assert from 'node:assert/strict';

import { REQUEST, EXAMPLES, CHECK_TIME, schedule } from '../src/lib/sim/async.js';

const seq = (o = {}) => schedule(REQUEST, { mode: 'sequence', ...o });
const par = (o = {}) => schedule(REQUEST, { mode: 'parallel', ...o });

test('async: only the client request is left', () => {
  assert.deepEqual(Object.keys(EXAMPLES), ['request']);
  assert.equal(EXAMPLES.request, REQUEST);
  assert.deepEqual(
    REQUEST.pieces.map((p) => [p.label, p.time]),
    [['Client data', 1], ['Credit analysis', 4], ['E&S review', 3], ['Legal documents', 2], ['Pricing', 1]],
  );
  assert.equal(REQUEST.handoff, 1);
});

test('async: one after another takes 16 days, 5 of them waiting', () => {
  const r = seq();
  assert.equal(r.total, 16);
  assert.equal(r.waiting, 5);
  assert.equal(r.rework, 0);
  // Work plus waiting fills the whole time, with no overlap.
  const work = r.bars.filter((b) => b.kind === 'work').reduce((s, b) => s + b.end - b.start, 0);
  assert.equal(work + r.waiting, r.total);
});

test('async: in parallel the same work takes 7 days, set by credit analysis', () => {
  const r = par();
  assert.equal(r.total, 7);
  assert.equal(r.waiting, 2);
  assert.equal(r.slowest, 'credit');
});

test('async: credit analysis and the E&S review are the unique best pair, giving 5 days', () => {
  const ids = REQUEST.pieces.map((p) => p.id);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
  const totals = pairs.map((faster) => ({ faster, total: par({ faster }).total }));
  const best = Math.min(...totals.map((t) => t.total));
  assert.equal(best, 5);
  const winners = totals.filter((t) => t.total === best);
  assert.equal(winners.length, 1);
  assert.deepEqual(winners[0].faster, ['credit', 'es']);
  // Credit alone hands the pace to the E&S review; legal or pricing alone change nothing.
  assert.equal(par({ faster: ['credit'] }).total, 6);
  assert.equal(par({ faster: ['credit'] }).slowest, 'es');
  assert.equal(par({ faster: ['legal'] }).total, 7);
  assert.equal(par({ faster: ['pricing'] }).total, 7);
});

test('async: a mistake found late doubles the work; caught early it adds half a day', () => {
  assert.equal(seq({ mistake: 'end' }).total, 32);
  assert.equal(seq({ mistake: 'end' }).rework, 16);
  assert.equal(par({ mistake: 'end' }).total, 14);
  assert.equal(par({ mistake: 'end' }).rework, 7);
  assert.equal(CHECK_TIME, 0.5);
  assert.equal(seq({ mistake: 'start' }).total, 16.5);
  assert.equal(par({ mistake: 'start' }).total, 7.5);
});
