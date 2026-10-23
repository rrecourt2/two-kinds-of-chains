import test from 'node:test';
import assert from 'node:assert/strict';

import { structure, outputCurve, LINK_COST, APPROVER_CAPACITY } from '../src/lib/sim/scale.js';
import { simulateSystems, ENTER, OK, STOP, FIX } from '../src/lib/sim/systems.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

// ---------------------------------------------------------------- the shape of the network (chapter 13)

test('hub: the approver’s links come out of their approving time', () => {
  near(structure('hub', 11).output, 9.6);
  assert.equal(structure('hub', 51).output, 0);
  assert.equal(structure('hub', 60).output, 0);
  near(structure('hub', 40).output, 2.64);
  // Below the crossover the makers are the limit, not the approver.
  near(structure('hub', 10).output, 9 * (1 - LINK_COST));
  assert.equal(structure('hub', 10).overloaded, false);
  assert.equal(structure('hub', 11).overloaded, true);
  // One person alone needs nobody.
  assert.deepEqual(
    { output: structure('hub', 1).output, links: structure('hub', 1).links, overhead: structure('hub', 1).overhead },
    { output: 1, links: 0, overhead: 0 },
  );
});

test('hub: nobody, approver included, spends more than a whole day', () => {
  for (let people = 2; people <= 60; people++) {
    const makers = people - 1;
    const h = structure('hub', people);
    const approvalTime = Math.max(0, 1 - makers * LINK_COST);
    near(h.approvalTime, approvalTime);
    assert.ok(h.output <= APPROVER_CAPACITY * approvalTime + 1e-12, `output ${h.output} at ${people} exceeds the approver’s free time`);
    assert.ok(h.output <= makers * (1 - LINK_COST) + 1e-12);
    // Relationship time, averaged over everyone; the approver's part is capped at one day.
    near(h.overhead, (makers * LINK_COST + Math.min(1, makers * LINK_COST)) / people);
    assert.ok(h.overhead <= 1);
  }
  near(structure('hub', 60).overhead, (59 * 0.02 + 1) / 60);
});

test('hub: output peaks at 9.6 with eleven people, then falls to nothing from 51', () => {
  const hub = outputCurve('hub', 60);
  const peak = Math.max(...hub);
  near(peak, 9.6);
  assert.equal(hub.indexOf(peak) + 1, 11);
  for (let p = 12; p <= 51; p++) assert.ok(hub[p - 1] < hub[p - 2], `hub output should fall at ${p}`);
  assert.equal(hub.findIndex((v) => v === 0) + 1, 51);
});

test('graph puzzle: sixty fully linked people still produce nothing; the mesh and teams are unchanged', () => {
  assert.equal(structure('mesh', 60).output, 0);
  const mesh = outputCurve('mesh', 60);
  near(Math.max(...mesh), 13);
  assert.equal(mesh.indexOf(Math.max(...mesh)) + 1, 25);
  near(structure('teams', 60).output, 52.2, 1e-6);
});

// ---------------------------------------------------------------- linked systems (chapter 3)

const FIXED = { systems: 6, problems: 0.1, availability: 0.85, meanSpell: 4, standIns: 0 };
const DESIGNS = [
  ['copies', 'each'],
  ['copies', 'end'],
  ['shared', 'each'],
  ['shared', 'end'],
];
const column = (journey, s) => journey.map((d) => d.gates[s]).join('');
const count = (str, c) => str.split(c).length - 1;

test('systems: each system is entered at most once per request; approvals can recur', () => {
  for (const [info, approvals] of DESIGNS) {
    const requests = 600;
    const r = simulateSystems({ ...FIXED, info, approvals }, { requests, seed: 7, journeys: requests });
    assert.equal(r.journeys.length, requests);
    let reapproved = 0;
    for (const j of r.journeys) {
      for (let s = 0; s < FIXED.systems; s++) {
        const col = column(j, s);
        // One entry event per system (each entry event is also the system's one entry-error draw).
        assert.ok(count(col, ENTER) <= 1, `${info}/${approvals}: system ${s} entered ${count(col, ENTER)} times`);
        // A correction never re-enters: no entry after the first correction or stop in that system.
        const firstFix = col.search(new RegExp(`[${FIX}${STOP}]`));
        if (firstFix >= 0) assert.equal(col.indexOf(ENTER, firstFix), -1);
        if (count(col, OK) + count(col, STOP) > 1) reapproved++;
      }
      const finals = j.map((d) => d.final).join('');
      if (count(finals, OK) + count(finals, STOP) > 1) reapproved++;
    }
    assert.ok(reapproved > 0, `${info}/${approvals}: some approval should happen again after a correction`);
  }
});

test('systems: a corrected system is approved again, not entered again (default request 2)', () => {
  const r = simulateSystems({ ...FIXED, info: 'copies', approvals: 'each' }, { journeys: 12 });
  const risk = column(r.journeys[2], 1); // the second system
  assert.equal(risk.indexOf(ENTER), 2); // entered on day 3
  assert.equal(risk[6], FIX); // corrected on day 7
  assert.equal(risk[8], OK); // approved again on day 9, with no fresh entry
  assert.equal(count(risk, ENTER), 1);
  for (const j of r.journeys) for (let s = 0; s < FIXED.systems; s++) assert.ok(count(column(j, s), ENTER) <= 1);
});

test('systems: with no problems and everyone in, every request takes the minimum', () => {
  const perfect = { ...FIXED, problems: 0, availability: 1 };
  const minimum = { 'copies/each': 12, 'copies/end': 7, 'shared/each': 2, 'shared/end': 2 };
  for (const [info, approvals] of DESIGNS) {
    const r = simulateSystems({ ...perfect, info, approvals }, { requests: 200 });
    for (const d of r.days) assert.equal(d, minimum[`${info}/${approvals}`]);
    assert.equal(r.slipped, 0);
    assert.equal(r.stopped, 0);
  }
});

test('systems puzzle: only one shared record with every approval is under two weeks and under 2%', () => {
  const runs = Object.fromEntries(DESIGNS.map(([info, approvals]) => [`${info}/${approvals}`, simulateSystems({ ...FIXED, info, approvals })]));
  const solves = Object.entries(runs).filter(([, r]) => r.median < 10 && r.slipped < 0.02).map(([k]) => k);
  assert.deepEqual(solves, ['shared/each']);
  // The numbers the chapter's text quotes.
  const start = runs['copies/each'];
  assert.equal(start.median, 16); // more than three working weeks
  assert.ok(start.workShare > 1 / 8 && start.workShare < 1 / 6); // about one hour in seven
  near(start.slipped, 0.1, 0.01); // one request in ten
  assert.ok(runs['shared/each'].median <= 6); // about a week
  assert.ok(runs['shared/each'].slipped < 0.01); // almost none, fewer than 1 in 100
  for (const k of ['copies/end', 'shared/end']) near(runs[k].slipped, 0.04, 0.005); // about 4 in 100 either way
  for (const k of ['copies/each', 'copies/end', 'shared/each']) assert.ok(runs['shared/end'].median < runs[k].median);
});

test('systems: one approval at the end lets through about as much with copies as with a shared record', () => {
  // The single run on the page shows 3.7% and 4.1%; over many requests the two agree.
  let copies = 0;
  let shared = 0;
  const seeds = 8;
  for (let seed = 1; seed <= seeds; seed++) {
    copies += simulateSystems({ ...FIXED, info: 'copies', approvals: 'end' }, { requests: 4000, seed }).slipped;
    shared += simulateSystems({ ...FIXED, info: 'shared', approvals: 'end' }, { requests: 4000, seed }).slipped;
  }
  near(copies / seeds, shared / seeds, 0.004);
});
