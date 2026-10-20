// "Check a process you know" (chapter 9): the relay model plus busy
// approvers, and the effect of each single change.

import { simulateRelay } from './relay.js';

export const MEAN_ABSENCE = 4;

const LEVERS = [
  {
    id: 'standIn',
    label: 'Give every sign-off a stand-in',
    applies: (o) => o.standIns < 3,
    apply: (o) => ({ ...o, standIns: o.standIns + 1 }),
  },
  {
    id: 'parallel',
    label: 'Run the reviews at the same time',
    applies: (o) => !o.parallel,
    apply: (o) => ({ ...o, parallel: true }),
  },
  {
    id: 'slack',
    label: 'Free up approver time to 70% busy',
    applies: (o) => o.busy > 0.7,
    apply: (o) => ({ ...o, busy: 0.7 }),
  },
  {
    id: 'clearer',
    label: 'Halve the send-backs',
    applies: (o) => o.sendBack > 0,
    apply: (o) => ({ ...o, sendBack: o.sendBack / 2 }),
  },
  {
    id: 'fewer',
    label: 'Drop one sign-off',
    applies: (o) => o.gates > 1,
    apply: (o) => ({ ...o, gates: o.gates - 1 }),
  },
];

export function diagnose(process, { requests = 1200, seed = 31 } = {}) {
  const base = { ...process, meanSpell: MEAN_ABSENCE };
  const run = (o) => simulateRelay(o, { requests, seed });
  const now = run(base);
  const options = LEVERS.filter((l) => l.applies(base)).map((l) => {
    const r = run(l.apply(base));
    return { id: l.id, label: l.label, median: r.median, p90: r.p90, withinDeadline: r.withinDeadline };
  });
  let combined = base;
  for (const l of LEVERS) if (l.applies(combined) && l.id !== 'fewer') combined = l.apply(combined);
  const all = run(combined);
  options.sort((a, b) => a.median - b.median || a.p90 - b.p90);
  return {
    now,
    options,
    together: { label: 'All but dropping a sign-off', median: all.median, p90: all.p90, withinDeadline: all.withinDeadline },
  };
}
