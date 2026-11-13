// The queues chapter (Queues.svelte): the tipping point and six reviews in a row.
import test from 'node:test';
import assert from 'node:assert/strict';

import { meanWait, tippingPoint, slowestOf } from '../src/lib/sim/queue.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('queues: the tipping point is 90% busy for a named reviewer and 95% for one shared line', () => {
  assert.equal(tippingPoint(1), 0.9);
  assert.equal(tippingPoint(4), 0.95);
  // Past it, one more point adds more than the one-hour review; just before it, less.
  assert.ok(meanWait(1, 0.91) - meanWait(1, 0.9) >= 1);
  assert.ok(meanWait(1, 0.9) - meanWait(1, 0.89) < 1);
});

test('queues: six reviews in a row at 80% busy wait 24 hours with named lines, about 4.5 with one shared line', () => {
  near(6 * meanWait(1, 0.8), 24, 1e-9);
  near(6 * meanWait(4, 0.8), 4.47, 0.01);
});

test('queues: six named reviewers at 95% busy, one after another and side by side', () => {
  // One after another the waits add up: six times nineteen hours.
  near(6 * meanWait(1, 0.95), 114, 1e-9);
  // Side by side the file waits only for the slowest of the six: about 48 hours.
  near(slowestOf(6, 0.95), 47.97, 0.01);
  // One reviewer alone is the plain average, and more reviewers can only make the slowest slower.
  near(slowestOf(1, 0.95), meanWait(1, 0.95), 1e-9);
  assert.ok(slowestOf(6, 0.95) > slowestOf(3, 0.95) && slowestOf(6, 0.95) < 6 * meanWait(1, 0.95));
});
