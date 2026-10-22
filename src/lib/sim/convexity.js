// The same AI built into a process in different ways (chapter "A person in the loop"). On each
// request the AI's answer is worth X hours: positive when it helps, negative when it is wrong.
// X is normally distributed around MEAN_HELP with the given spread.
//
// The chapter compares two designs: a person in the loop (the AI drafts, a person keeps a good
// draft and drops a bad one) and autopilot (every draft is used as it is, with nobody looking;
// a wrong one costs its full value because the work has to be redone). DESIGNS also keeps a
// capped mandatory step as a reference design for the tests.

import { makeRng, normal } from './rng.js';

export const MEAN_HELP = 0.5;
export const STEADY = 0.3; // spread of the steady AI's usefulness, in hours
export const ERRATIC = 2; // and of the erratic one
export const CHECK_COST = 0.1; // six minutes spent looking at a draft before keeping or dropping it
export const GATE_CAP = 0.5; // reference design only: a mandatory step saves at most its planned half hour
export const GATE_MULTIPLIER = 3; // reference design only: a wrong answer stops the work queued behind it

export const DESIGNS = [
  { id: 'tool', label: 'With a person in the loop: a person keeps a good draft and drops a bad one', short: 'Person in the loop', payoff: (x) => Math.max(x, 0) - CHECK_COST },
  { id: 'autopilot', label: 'On autopilot: every draft is used as it is, with nobody looking', short: 'On autopilot', payoff: (x) => x },
  { id: 'gate', label: 'Mandatory step: nothing moves until the AI answers', short: 'Mandatory step', payoff: (x) => (x >= 0 ? Math.min(x, GATE_CAP) : GATE_MULTIPLIER * x) },
];

/** With a person in the loop: six minutes looking, a good draft kept, a bad one dropped. */
export const PERSON = DESIGNS[0];
/** On autopilot: every draft is used as it is; it earns exactly the AI's average, whatever the spread. */
export const AUTOPILOT = DESIGNS[1];
/** The two designs the chapter compares, in the order it shows them. */
export const SHOWN = [PERSON, AUTOPILOT];

const density = (x, sd) => Math.exp(-0.5 * ((x - MEAN_HELP) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

/** Average hours saved per request for a design when the AI's usefulness has the given spread. */
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

/** Chance that the AI's answer on a request is wrong (worth less than nothing). */
export function wrongChance(spread) {
  return averagePayoff({ payoff: (x) => (x < 0 ? 1 : 0) }, spread);
}

export { density };

/** Chance a rigid workflow of `steps` steps, each `reliability` likely to succeed, succeeds end to end. */
export const chainSuccess = (steps, reliability) => reliability ** steps;

/** Draft values for `n` requests. Both AIs get the same luck, scaled by their spread, so they compare fairly. */
export function sampleRequests(n, spread, seed = 1) {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => MEAN_HELP + spread * normal(rng));
}

/** One design over a set of requests: hours saved on each, the total, and how many answers were wrong. */
export function runDesign(design, drafts) {
  const values = drafts.map(design.payoff);
  return { values, total: values.reduce((a, b) => a + b, 0), wrong: drafts.filter((x) => x < 0).length };
}
