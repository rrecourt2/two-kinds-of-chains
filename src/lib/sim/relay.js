// The approval relay (chapters 3 and 9): one request passes a chain of
// sign-offs. Each sign-off is an hour of work. An approver who is in clears it
// the same day; the next gate picks it up the next day. A send-back costs the
// requester a day of rework and, because a changed request needs fresh
// approvals, restarts the chain.

import { makeRng, exponential, quantile } from './rng.js';
import { absenceParams, nextState } from './presence.js';
import { erlangC } from './queue.js';

export const HORIZON = 250; // one working year; longer journeys are reported as 250+
export const DEADLINE = 10; // two working weeks

// Day states for one gate in a journey log.
export const IDLE = '.';
export const AWAY = 'w';
export const QUEUED = 'q';
export const APPROVED = 'r';
export const SENT_BACK = 'x';

function queueDays(rng, o, present) {
  if (!o.busy) return 0;
  const c = Math.max(1, present);
  const waits = c === 1 ? o.busy : erlangC(c, o.busy);
  if (rng() >= waits) return 0;
  const hours = exponential(rng, (o.taskHours ?? 2) / (c * (1 - o.busy)));
  return Math.floor(hours / 8);
}

function simulateOne(rng, o, params, record) {
  const size = o.standIns + 1;
  const states = [];
  const last = [];
  for (let g = 0; g < o.gates; g++) {
    states.push(Array.from({ length: size }, () => rng() < o.availability));
    last.push(0);
  }
  // Gates evolve independently, so a gate's people only need updating when
  // the request is actually waiting on that gate.
  const sync = (g, day) => {
    let gap = day - last[g];
    if (gap > 60) {
      for (let j = 0; j < size; j++) states[g][j] = rng() < o.availability;
    } else {
      while (gap-- > 0) for (let j = 0; j < size; j++) states[g][j] = nextState(states[g][j], rng, params);
    }
    last[g] = day;
  };
  const present = (g) => {
    let n = 0;
    for (let j = 0; j < size; j++) if (states[g][j]) n++;
    return n;
  };

  const log = record ? [] : null;
  const blank = IDLE.repeat(o.gates);
  let day = 0;
  let hours = 0;
  let sendBacks = 0;

  if (!o.parallel) {
    let g = 0;
    let queued = -1;
    while (day < HORIZON) {
      sync(g, day);
      const inToday = present(g);
      let cell;
      if (inToday === 0) {
        cell = AWAY;
      } else {
        if (queued < 0) queued = queueDays(rng, o, inToday);
        if (queued > 0) {
          queued--;
          cell = QUEUED;
        } else {
          hours += 1;
          cell = rng() < o.sendBack ? SENT_BACK : APPROVED;
        }
      }
      if (log) log.push({ gates: blank.slice(0, g) + cell + blank.slice(g + 1), rework: false });
      day++;
      if (cell === APPROVED) {
        g++;
        queued = -1;
        if (g === o.gates) break;
      } else if (cell === SENT_BACK) {
        sendBacks++;
        if (log) log.push({ gates: blank, rework: true });
        hours += 2;
        day++;
        g = 0;
        queued = -1;
      }
    }
  } else {
    while (day < HORIZON) {
      const done = new Array(o.gates).fill(false);
      const queued = new Array(o.gates).fill(-1);
      let rejected = false;
      while (day < HORIZON && done.some((d) => !d)) {
        let row = '';
        for (let g = 0; g < o.gates; g++) {
          if (done[g]) {
            row += IDLE;
            continue;
          }
          sync(g, day);
          const inToday = present(g);
          if (inToday === 0) {
            row += AWAY;
            continue;
          }
          if (queued[g] < 0) queued[g] = queueDays(rng, o, inToday);
          if (queued[g] > 0) {
            queued[g]--;
            row += QUEUED;
            continue;
          }
          hours += 1;
          done[g] = true;
          if (rng() < o.sendBack) {
            rejected = true;
            row += SENT_BACK;
          } else {
            row += APPROVED;
          }
        }
        if (log) log.push({ gates: row, rework: false });
        day++;
      }
      if (!rejected) break;
      sendBacks++;
      if (log) log.push({ gates: blank, rework: true });
      hours += 2;
      day++;
    }
  }
  return { days: Math.min(day, HORIZON), hours, sendBacks, log };
}

/**
 * Run many requests through the same process.
 * options: { gates, standIns, availability, meanSpell, sendBack, parallel, busy?, taskHours? }
 */
export function simulateRelay(options, { requests = 1500, seed = 11, journeys = 0 } = {}) {
  const rng = makeRng(seed);
  const params = absenceParams(options.availability, options.meanSpell);
  const days = new Float64Array(requests);
  const logs = [];
  let hours = 0;
  let within = 0;
  let capped = 0;
  for (let i = 0; i < requests; i++) {
    const run = simulateOne(rng, options, params, i < journeys);
    days[i] = run.days;
    hours += run.hours;
    if (run.days <= DEADLINE) within++;
    if (run.days >= HORIZON) capped++;
    if (run.log) logs.push(run.log);
  }
  const total = days.reduce((a, b) => a + b, 0);
  return {
    days,
    median: quantile(days, 0.5),
    p90: quantile(days, 0.9),
    mean: total / requests,
    withinDeadline: within / requests,
    workShare: hours / (total * 8),
    capped: capped / requests,
    journeys: logs,
  };
}

/** Counts per working day, with everything past `max` gathered in a final bin. */
export function histogram(days, max = 60) {
  const bins = new Array(max + 1).fill(0);
  for (const d of days) bins[Math.min(max, Math.round(d))]++;
  return bins;
}
