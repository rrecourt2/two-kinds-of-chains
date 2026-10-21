// "Check a process you know" (chapter 15): the interlinked-systems model from
// chapter 3 plus busy approvers from chapter 4, and the effect of each single change.

import { simulateSystems } from './systems.js';

export const MEAN_ABSENCE = 4;

const LEVERS = [
  {
    id: 'shared',
    label: 'Enter it once: one shared record',
    applies: (o) => o.info === 'copies',
    apply: (o) => ({ ...o, info: 'shared' }),
  },
  {
    id: 'end',
    label: 'One approval, at the end',
    applies: (o) => o.approvals === 'each',
    apply: (o) => ({ ...o, approvals: 'end' }),
  },
  {
    id: 'standIn',
    label: 'Give every approver a stand-in',
    applies: (o) => o.standIns < 3,
    apply: (o) => ({ ...o, standIns: o.standIns + 1 }),
  },
  {
    id: 'slack',
    label: 'Free up approvers to 70% busy',
    applies: (o) => o.busy > 0.7,
    apply: (o) => ({ ...o, busy: 0.7 }),
  },
  {
    id: 'entry',
    label: 'Check data as it is typed',
    applies: (o) => o.problems > 0,
    apply: (o) => ({ ...o, problems: o.problems / 2 }),
  },
  {
    id: 'fewer',
    label: 'One system fewer',
    applies: (o) => o.systems > 2,
    apply: (o) => ({ ...o, systems: o.systems - 1 }),
  },
];

export function diagnose(process, { requests = 1000, seed = 31 } = {}) {
  const base = { ...process, meanSpell: MEAN_ABSENCE };
  const run = (o) => simulateSystems(o, { requests, seed });
  const now = run(base);
  const summary = (r) => ({ median: r.median, p90: r.p90, slipped: r.slipped, withinDeadline: r.withinDeadline });
  const options = LEVERS.filter((l) => l.applies(base)).map((l) => ({ id: l.id, label: l.label, ...summary(run(l.apply(base)))}));
  let combined = base;
  for (const l of LEVERS) if (l.id !== 'fewer' && l.applies(combined)) combined = l.apply(combined);
  options.sort((a, b) => a.median - b.median || a.p90 - b.p90);
  return {
    now,
    options,
    together: { label: 'All of these, same systems', ...summary(run(combined)) },
    // The same bundle with the approvals kept at every system, now in parallel.
    parallel: combined.approvals === base.approvals ? null : summary(run({ ...combined, approvals: base.approvals })),
  };
}
