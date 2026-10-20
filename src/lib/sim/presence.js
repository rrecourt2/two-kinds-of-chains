// Absence model shared by the calendar (chapter 1) and the approval relay
// (chapters 3 and 9). Each person is either in or away; absences come in
// spells (a week of holiday, three days of training), not single random days.

import { makeRng } from './rng.js';

/** Daily transition probabilities for a long-run availability and mean absence length. */
export function absenceParams(availability, meanSpell) {
  const back = 1 / Math.max(1, meanSpell); // chance an absent person is back tomorrow
  const leave = Math.min(1, (back * (1 - availability)) / availability); // chance a present person leaves
  return { back, leave };
}

export function nextState(isIn, rng, params) {
  return isIn ? rng() >= params.leave : rng() < params.back;
}

export const ROLES = [
  'Relationship manager',
  'Credit analyst',
  'Credit officer',
  'Risk',
  'Compliance',
  'Legal',
  'Treasury',
  'Operations',
  'Product owner',
  'Head of desk',
];

/**
 * One month of working days for each role. A role is covered on a day when
 * its named person or any of its stand-ins is in.
 */
export function simulateMonth({ roles, standIns, availability, meanSpell = 3, days = 21, seed = 1 }) {
  const rng = makeRng(seed);
  const params = absenceParams(availability, meanSpell);
  const grid = [];
  for (let r = 0; r < roles; r++) {
    const people = Array.from({ length: standIns + 1 }, () => rng() < availability);
    const row = [];
    for (let d = 0; d < days; d++) {
      if (d > 0) for (let p = 0; p < people.length; p++) people[p] = nextState(people[p], rng, params);
      const main = people[0];
      const covered = people.some(Boolean);
      row.push({ main, covered });
    }
    grid.push(row);
  }
  const allIn = Array.from({ length: days }, (_, d) => grid.every((row) => row[d].covered));
  return { grid, allIn, possibleDays: allIn.filter(Boolean).length };
}

/** Long-run share of days on which every role is covered. */
export function coverageOdds(roles, standIns, availability) {
  const roleCovered = 1 - Math.pow(1 - availability, standIns + 1);
  return { roleCovered, allCovered: Math.pow(roleCovered, roles) };
}
