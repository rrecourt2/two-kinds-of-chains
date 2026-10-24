// Requisite variety: local offices with a menu of answers, a long-tailed world of client requests, and a
// head-office committee that hears whatever the menu cannot answer.
//
// Request kinds follow Zipf's law: the k-th most common kind is asked for in proportion to 1 / k^EXPONENT.
// A menu of m answers covers the m most common kinds. Every other request is an exception and goes to a
// committee that meets once a week and can hear ROOM of them, oldest first; the rest wait for the next week.

import { makeRng, poisson } from './rng.js';

export const REQUESTS = 40; // client requests a week, across all the offices
export const ROOM = 5; // exceptions the committee can hear a week
export const EXPONENT = 1.34;
export const WORLDS = { today: 60, varied: 120 }; // kinds of request
export const TARGET_DAYS = 10; // two working weeks
export const DAYS_A_WEEK = 5;
export const WEEKS_A_YEAR = 52;
export const MENU = { min: 5, max: 60, start: 10 };

/** Share of all requests of each kind, most common first. */
export function kindShares(kinds, exponent = EXPONENT) {
  const w = Array.from({ length: kinds }, (_, i) => Math.pow(i + 1, -exponent));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / total);
}

const SHARES = Object.fromEntries(Object.entries(WORLDS).map(([id, n]) => [id, kindShares(n)]));

/** Requests a week of each kind, most common first. */
export function weeklyRates(world) {
  return SHARES[world].map((s) => s * REQUESTS);
}

/** Share of requests the menu does not answer. */
export function unanswered(world, menu) {
  return SHARES[world].slice(menu).reduce((a, b) => a + b, 0);
}

/**
 * Exceptions sent to head office a week. `principles` is the share of unlisted cases an office could
 * settle by applying principles instead of a listed answer (0 for a plain menu).
 */
export function escalations(world, menu, { principles = 0 } = {}) {
  return REQUESTS * unanswered(world, menu) * (1 - principles);
}

/**
 * Average number of exceptions carried over after a weekly meeting, in the long run, when `lam` new ones
 * arrive a week (Poisson) and the committee hears up to `room`. Exact: with z_k the room − 1 roots of
 * z^room = exp(lam (z − 1)) inside the unit disk other than z = 1,
 * E[carried] = Σ 1 / (1 − z_k) − (room (room − 1) − lam²) / (2 (room − lam)).
 */
export function meanBacklog(lam, room = ROOM) {
  if (lam <= 0) return 0;
  if (lam >= room) return Infinity;
  let sum = 0;
  for (let k = 1; k < room; k++) {
    const wr = Math.cos((2 * Math.PI * k) / room);
    const wi = Math.sin((2 * Math.PI * k) / room);
    // Fixed point z = w · exp(lam (z − 1) / room), a contraction inside the unit disk.
    let zr = 0;
    let zi = 0;
    for (let it = 0; it < 100000; it++) {
      const r = Math.exp((lam * (zr - 1)) / room);
      const a = (lam * zi) / room;
      const ur = r * Math.cos(a);
      const ui = r * Math.sin(a);
      const nr = wr * ur - wi * ui;
      const ni = wr * ui + wi * ur;
      const step = Math.abs(nr - zr) + Math.abs(ni - zi);
      zr = nr;
      zi = ni;
      if (step < 1e-15) break;
    }
    const ar = 1 - zr;
    const ai = -zi;
    sum += ar / (ar * ar + ai * ai);
  }
  return sum - (room * (room - 1) - lam * lam) / (2 * (room - lam));
}

/**
 * Average wait for an exception, in working days, from the day it is raised to the meeting that hears it:
 * half a week on average to the next meeting, plus a week for every meeting that has no room for it
 * (Little's law: carried-over cases ÷ arrivals a week). Infinite when exceptions arrive as fast as the
 * committee can hear them, or faster: the queue then has no long-run level and grows every week.
 */
export function averageWait(lam, room = ROOM) {
  if (lam <= 0) return 0;
  if (lam >= room) return Infinity;
  return DAYS_A_WEEK * (0.5 + meanBacklog(lam, room) / lam);
}

/** Everything the figure shows for one world and one menu. */
export function outcome(world, menu, opts = {}) {
  const lam = escalations(world, menu, opts);
  const wait = averageWait(lam);
  return {
    world,
    kinds: WORLDS[world],
    menu,
    answered: 1 - unanswered(world, menu),
    escalated: lam,
    load: lam / ROOM,
    wait,
    jammed: lam >= ROOM,
    // When jammed, how many more cases wait at the end of each year than at its start.
    growth: lam >= ROOM ? (lam - ROOM) * WEEKS_A_YEAR : 0,
    met: wait < TARGET_DAYS,
  };
}

/** The smallest menu whose exceptions wait less than `target` working days on average. */
export function smallestMenu(world, target = TARGET_DAYS, opts = {}) {
  for (let m = 0; m <= WORLDS[world]; m++) if (averageWait(escalations(world, m, opts)) < target) return m;
  return null;
}

/**
 * A seeded simulation of the same committee, week by week, as a check on the formula. Exceptions arrive
 * at random through the week and are heard oldest first; returns the average wait in working days.
 */
export function simulateCommittee(lam, { room = ROOM, weeks = 200000, warmup = 1000, seed = 7 } = {}) {
  const rng = makeRng(seed);
  let queue = []; // arrival times (in weeks) of cases waiting
  let total = 0;
  let heard = 0;
  for (let w = 0; w < weeks; w++) {
    const n = poisson(rng, lam);
    const arrivals = Array.from({ length: n }, () => w + rng()).sort((a, b) => a - b);
    queue = queue.concat(arrivals);
    const meeting = w + 1;
    const today = queue.slice(0, room);
    queue = queue.slice(room);
    if (w >= warmup) {
      for (const t of today) total += meeting - t;
      heard += today.length;
    }
  }
  return heard ? (DAYS_A_WEEK * total) / heard : 0;
}
