// Three ways to add the same AI to a process (chapter 6). On each task the AI's
// answer is worth X hours: positive when it helps, negative when it is wrong.
// X is normally distributed around MEAN_HELP with the given spread.

export const MEAN_HELP = 0.5;
export const CHECK_COST = 0.1; // time spent looking at a suggestion before deciding to use it
export const GATE_CAP = 0.5; // a gate saves at most what the process was designed around
export const GATE_MULTIPLIER = 3; // when a gate gets it wrong, the work behind it waits too

export const DESIGNS = [
  { id: 'tool', label: 'A tool people may use', short: 'Tool', payoff: (x) => Math.max(x, 0) - CHECK_COST },
  { id: 'rule', label: 'A rule: always use its answer', short: 'Rule', payoff: (x) => x },
  { id: 'gate', label: 'A gate every task must pass', short: 'Gate', payoff: (x) => (x >= 0 ? Math.min(x, GATE_CAP) : GATE_MULTIPLIER * x) },
];

const density = (x, sd) => Math.exp(-0.5 * ((x - MEAN_HELP) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

/** Average hours saved per task for a design when the AI's usefulness has the given spread. */
export function averagePayoff(design, spread) {
  if (spread <= 1e-9) return design.payoff(MEAN_HELP);
  const steps = 1200;
  const lo = MEAN_HELP - 7 * spread;
  const hi = MEAN_HELP + 7 * spread;
  const dx = (hi - lo) / steps;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const x = lo + (i + 0.5) * dx;
    sum += design.payoff(x) * density(x, spread) * dx;
  }
  return sum;
}

export { density };

/** Chance a rigid workflow of `steps` steps, each `reliability` likely to succeed, succeeds end to end. */
export const chainSuccess = (steps, reliability) => reliability ** steps;
