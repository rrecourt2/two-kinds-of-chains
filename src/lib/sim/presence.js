// Absence model shared by the calendar (chapter 1) and the linked-systems
// model (chapter 3). Each person is either in or away; absences come in
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
  'Investment officer',
  'Credit analyst',
  'E&S specialist',
  'Legal',
  'Compliance',
  'Risk',
  'Treasury',
  'Operations',
  'Credit officer',
  'Department head',
];

// The systems a normal working day leans on, all at the same time.
export const DAY_SYSTEMS = [
  'Remote access',
  'Sign-in',
  'Client file',
  'Risk model',
  'Market data',
  'Booking platform',
  'Document vault',
  'Email',
  'Reporting feed',
  'Payments hub',
];

/**
 * One person's month: true on the days they are in. Each person draws from
 * their own stream, and a day's draw is compared with a threshold that only
 * falls as availability rises, so adding a stand-in leaves everyone else's
 * month as it was, and better attendance only ever removes absences.
 */
function personMonth(rng, availability, { back, leave }, days) {
  const month = [];
  let away = rng() < 1 - availability;
  for (let d = 0; d < days; d++) {
    if (d > 0) away = rng() < (away ? 1 - back : leave);
    month.push(!away);
  }
  return month;
}

/**
 * One month of working days for each role. A role is covered on a day when
 * its named person or any of its stand-ins is in. The decision can be made on
 * a day when at least `need` roles are covered: all of them by default (an AND),
 * fewer for a quorum.
 */
export function simulateMonth({ roles, standIns, availability, meanSpell = 3, days = 21, seed = 1, need = roles }) {
  const params = absenceParams(availability, meanSpell);
  const grid = [];
  for (let r = 0; r < roles; r++) {
    const people = Array.from({ length: standIns + 1 }, (_, p) => personMonth(makeRng(seed * 1000 + r * 10 + p + 1), availability, params, days));
    grid.push(Array.from({ length: days }, (_, d) => ({ main: people[0][d], covered: people.some((m) => m[d]) })));
  }
  const allIn = Array.from({ length: days }, (_, d) => grid.filter((row) => row[d].covered).length >= need);
  // The longest run of working days on which the work had to wait for someone.
  let longestWait = 0;
  let run = 0;
  for (const ok of allIn) {
    run = ok ? 0 : run + 1;
    longestWait = Math.max(longestWait, run);
  }
  return { grid, allIn, possibleDays: allIn.filter(Boolean).length, longestWait };
}

/**
 * Long-run share of days on which every role is covered (`allCovered`), and on which at
 * least `need` of the roles are (`enough`): a quorum of k of n. All n of n is an AND,
 * any one of n an OR, and the quorums in between.
 */
export function coverageOdds(roles, standIns, availability, need = roles) {
  const roleCovered = 1 - Math.pow(1 - availability, standIns + 1);
  return { roleCovered, allCovered: Math.pow(roleCovered, roles), enough: atLeast(roles, need, roleCovered) };
}

/** Chance that at least k of n independent links hold, each with chance p. */
export function atLeast(n, k, p) {
  let sum = 0;
  let choose = 1; // n choose j, built up as j runs from 0
  for (let j = 0; j <= n; j++) {
    if (j > 0) choose = (choose * (n - j + 1)) / j;
    if (j >= k) sum += choose * Math.pow(p, j) * Math.pow(1 - p, n - j);
  }
  return sum;
}
