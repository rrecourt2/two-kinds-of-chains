// Andrew Grove's breakfast factory (chapter 5): a three-minute egg, toast and
// coffee, each started so that all three are ready together. `bankness` (0..1)
// slides from Grove's kitchen to a bank request: step times get variable,
// steps are sometimes held up (a person away, a system down), and problems are
// harder to see early on.

import { makeRng, normal, exponential } from './rng.js';

export const STEPS = [
  { id: 'egg', label: 'Egg', letter: 'E', planned: 3 },
  { id: 'toast', label: 'Toast', letter: 'T', planned: 1 },
  { id: 'coffee', label: 'Coffee', letter: 'C', planned: 1 },
];
export const READY_AT = 3;
export const LATE_VISIBILITY = 0.95;

export function settings(bankness) {
  return {
    variability: 0.6 * bankness, // spread of each step's time (coefficient of variation)
    heldUp: 0.15 * bankness, // chance a step is held up on a given morning
    heldUpDelay: 3, // average extra time when it is
    earlyVisibility: 0.9 - 0.7 * bankness, // chance a check before a step spots a problem
  };
}

/** Each morning: actual step times, finish times on Grove's schedule, and which step was slowest. */
export function simulateMornings({ bankness, mornings = 40, seed = 8 }) {
  const s = settings(bankness);
  const rng = makeRng(seed);
  const sigma = Math.sqrt(Math.log(1 + s.variability ** 2));
  const out = [];
  for (let d = 0; d < mornings; d++) {
    const times = STEPS.map((step) => {
      let t = step.planned * Math.exp(sigma * normal(rng) - (sigma * sigma) / 2);
      if (rng() < s.heldUp) t += exponential(rng, s.heldUpDelay);
      return t;
    });
    const starts = STEPS.map((step) => READY_AT - step.planned);
    const finish = times.map((t, i) => starts[i] + t);
    const ready = Math.max(...finish);
    out.push({ times, starts, finish, ready, slowest: times.indexOf(Math.max(...times)), onTime: ready <= READY_AT * 1.1 });
  }
  return out;
}

/** Grove's rule (check before every step) against one check at the end, for `steps` steps. */
export function checks(bankness, steps = STEPS.length) {
  const { earlyVisibility } = settings(bankness);
  return {
    early: { caught: 1 - (1 - earlyVisibility) ** steps, checks: steps },
    late: { caught: LATE_VISIBILITY, checks: 1 },
  };
}
