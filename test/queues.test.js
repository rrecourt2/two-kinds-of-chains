// The queues chapter (Queues.svelte): the tipping point and six reviews in a row.
import test from 'node:test';
import assert from 'node:assert/strict';

import { meanWait, tippingPoint } from '../src/lib/sim/queue.js';

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
