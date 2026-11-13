// The hover notes on the story's named ideas (src/lib/ideas.js): each points at a chapter that exists, each way the
// text names an idea finds its note, and each number in a note is what the models give.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IDEAS, ideaOf } from '../src/lib/ideas.js';
import { atLeast } from '../src/lib/sim/presence.js';
import { meanWait, slowestOf } from '../src/lib/sim/queue.js';
import { PARAMS as GATE } from '../src/lib/sim/gate.js';
import { BANKS, CAPITAL } from '../src/lib/sim/network.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

// The chapter ids, read from the index (which imports Svelte components and cannot be loaded here).
const index = readFileSync(new URL('../src/chapters/index.js', import.meta.url), 'utf8');
const chapters = [...index.slice(index.indexOf('export const CHAPTERS')).matchAll(/\{ id: '([a-z-]+)'/g)].map((m) => m[1]);

test('ideas: every note points at a chapter of the story, the one where the idea is first met', () => {
  assert.equal(chapters.length, 14); // the opening, twelve puzzles, the playbook
  for (const [key, idea] of Object.entries(IDEAS)) assert.ok(chapters.includes(idea.first), `${key}: ${idea.first}`);
  const first = Object.fromEntries(Object.entries(IDEAS).map(([k, v]) => [k, v.first]));
  assert.deepEqual(first, {
    and: 'riddle',
    or: 'riddle',
    if: 'contagion',
    quorum: 'riddle',
    tipping: 'queues',
    loop: 'contagion',
    sequence: 'queues',
    parallel: 'queues',
    falsePositive: 'gate',
  });
  // An idea is never introduced after a chapter that uses it: its first chapter comes no later than the others'.
  const at = (id) => chapters.indexOf(id);
  assert.ok(at('riddle') < at('queues') && at('queues') < at('contagion') && at('contagion') < at('gate'));
});

test('ideas: the text finds its note whatever its case, article or plural', () => {
  const cases = {
    AND: 'and', ANDs: 'and', OR: 'or', ORs: 'or', IF: 'if',
    quorum: 'quorum', 'a quorum': 'quorum',
    'tipping point': 'tipping', 'Tipping points': 'tipping',
    loop: 'loop', loops: 'loop', 'a loop': 'loop',
    'one after another': 'sequence', 'side by side': 'parallel',
    'false positive': 'falsePositive', 'false positives': 'falsePositive', 'False alarm': 'falsePositive',
  };
  for (const [text, key] of Object.entries(cases)) assert.equal(ideaOf(text), key, text);
  for (const text of ['Good complexity', 'Bad complexity', 'Scale', '']) assert.equal(ideaOf(text), null, text);
});

test('ideas: the numbers in the notes are the models’ own', () => {
  // AND: six links at 95% all hold 74% of the time. OR: a 95% check with a backup fails once in 400.
  near(0.95 ** 6, 0.74, 0.005);
  near(0.05 ** 2, 1 / 400, 1e-12);
  // IF: the stress test's banks hold capital of 5% of their assets; there are 48 of them (the loop's note).
  assert.equal(CAPITAL, 5);
  assert.equal(BANKS, 48);
  // Quorum: six people each in on nine days in ten are all in on 53% of days; any four, on 98%.
  near(atLeast(6, 6, 0.9), 0.53, 0.005);
  near(atLeast(6, 4, 0.9), 0.98, 0.005);
  // Tipping point: a one-hour review waits four hours at 80% busy, nine at 90%, nineteen at 95%.
  near(meanWait(1, 0.8), 4, 1e-9);
  near(meanWait(1, 0.9), 9, 1e-9);
  near(meanWait(1, 0.95), 19, 1e-9);
  // One after another: six such reviewers cost 114 hours, nearly three working weeks. Side by side: about 48.
  near(6 * meanWait(1, 0.95), 114, 1e-9);
  assert.ok((6 * meanWait(1, 0.95)) / 8 > 14 && (6 * meanWait(1, 0.95)) / 8 < 15);
  near(slowestOf(6, 0.95), 48, 0.5);
  // False positive: one request in 200 is a fraud.
  assert.equal(GATE.fraudEvery, 200);
  for (const idea of Object.values(IDEAS)) assert.ok(idea.text.split(/\s+/).length <= 45, idea.name);
});
