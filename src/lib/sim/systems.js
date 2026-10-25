// Interlinked systems (chapter 3).
//
// A request has to be entered into a chain of systems, each built by a different
// specialist team. Entering it into one system takes a day of work and can leave
// a hidden problem: a wrong or missing field that nobody sees yet. Approvers are
// named people who are sometimes away.
//
// Information
//   'copies'  each system copies its data from the one before, so entries happen in
//             order and a hidden problem spreads into every later system.
//   'shared'  every system reads one shared record, filled in once.
// Approvals
//   'each'    an approval at every system. Each approver sees only their own system
//             and spots a hidden problem half the time.
//   'end'     one approval at the end, by someone who sees the whole request and
//             spots 90% of hidden problems.
//
// A spotted problem stops the request. With copies it must be corrected in the
// system where it started and in every system it has spread to, and each of
// those is approved again. With a shared record it is corrected once.

import { makeRng, exponential, quantile } from './rng.js';
import { absenceParams, nextState } from './presence.js';
import { erlangC } from './queue.js';

export const HORIZON = 250;
export const DEADLINE = 10;
export const SPOT_EACH = 0.5;
export const SPOT_END = 0.9;
// Hours of real work. Each step still takes a day, because the next system picks it up the next day.
const ENTRY_HOURS = 2;
const FIX_HOURS = 2;
const REVIEW_HOURS = 1;

export const SYSTEMS = [
  'Client file',
  'Risk model',
  'E&S register',
  'Limits register',
  'Pricing tool',
  'Loan booking',
  'Document vault',
  'Impact reporting',
];

// Cell states in a journey log.
export const IDLE = '.';
export const ENTER = 'e'; // entering the request into this system
export const FIX = 'f'; // correcting a problem that spread here
export const AWAY = 'w'; // waiting: the approver is away
export const QUEUED = 'q'; // waiting: the approver is busy with other work
export const OK = 'a'; // approved
export const STOP = 'x'; // a problem was spotted here: the request stops

function queueDays(rng, o, present) {
  if (!o.busy) return 0;
  const c = Math.max(1, present);
  const waits = c === 1 ? o.busy : erlangC(c, o.busy);
  if (rng() >= waits) return 0;
  const hours = exponential(rng, 2 / (c * (1 - o.busy)));
  return Math.floor(hours / 8);
}

function makePools(rng, o, count) {
  const size = o.standIns + 1;
  return Array.from({ length: count }, () => ({
    people: Array.from({ length: size }, () => rng() < o.availability),
    last: 0,
  }));
}

function simulateOne(rng, o, params, record) {
  const n = o.systems;
  const pools = makePools(rng, o, n + 1); // one per system, plus the final approver
  const sync = (pool, day) => {
    let gap = day - pool.last;
    if (gap > 60) pool.people = pool.people.map(() => rng() < o.availability);
    else while (gap-- > 0) pool.people = pool.people.map((p) => nextState(p, rng, params));
    pool.last = day;
  };
  const presentIn = (pool) => pool.people.filter(Boolean).length;

  const log = record ? [] : null;
  const blank = IDLE.repeat(n);
  const row = (cells) => {
    if (!log) return;
    log.push(cells);
  };
  const set = (i, c, base = blank) => base.slice(0, i) + c + base.slice(i + 1);

  let day = 0;
  let workHours = 0;
  let stops = 0;
  let spread = 0;
  const hidden = []; // origin index of each hidden problem
  const enter = (i) => {
    workHours += ENTRY_HOURS;
    if (rng() < o.problems) hidden.push(i);
  };
  // An approver at `pool` decides today: returns 'away' | 'queued' | 'done'.
  const approverStep = (pool, state) => {
    sync(pool, day);
    const present = presentIn(pool);
    if (present === 0) return AWAY;
    if (state.queued < 0) state.queued = queueDays(rng, o, present);
    if (state.queued > 0) {
      state.queued--;
      return QUEUED;
    }
    return 'done';
  };
  const spot = (candidates, p) => candidates.filter(() => rng() < p);

  if (o.info === 'copies' && o.approvals === 'each') {
    // Entry and approval are separate: a system is entered once per request. A correction
    // sends the approvals back to where the problem started, but a system that was already
    // entered is corrected and approved again, never entered afresh.
    let k = 0;
    const entered = new Array(n).fill(false);
    const state = { queued: -1 };
    while (day < HORIZON && k < n) {
      if (!entered[k]) {
        enter(k);
        row({ gates: set(k, ENTER), final: IDLE });
        day++;
        entered[k] = true;
        state.queued = -1;
        continue;
      }
      const r = approverStep(pools[k], state);
      if (r !== 'done') {
        row({ gates: set(k, r), final: IDLE });
        day++;
        continue;
      }
      workHours += REVIEW_HOURS;
      const visible = hidden.filter((origin) => origin <= k);
      const found = spot(visible, SPOT_EACH);
      if (!found.length) {
        row({ gates: set(k, OK), final: IDLE });
        day++;
        k++;
        state.queued = -1; // the next system's approver has their own queue
        continue;
      }
      // The request stops. Correct the problem where it started and everywhere it spread.
      stops++;
      const origin = Math.min(...found);
      spread += k - origin + 1;
      for (const f of found) hidden.splice(hidden.indexOf(f), 1);
      row({ gates: set(k, STOP), final: IDLE });
      day++;
      for (let i = origin; i <= k && day < HORIZON; i++) {
        row({ gates: set(i, FIX), final: IDLE });
        workHours += FIX_HOURS;
        day++;
      }
      k = origin; // every corrected system is approved again, in order; none is entered again
      state.queued = -1;
    }
  } else if (o.info === 'copies' && o.approvals === 'end') {
    for (let k = 0; k < n; k++) {
      enter(k);
      row({ gates: set(k, ENTER), final: IDLE });
      day++;
    }
    const state = { queued: -1 };
    while (day < HORIZON) {
      const r = approverStep(pools[n], state);
      if (r !== 'done') {
        row({ gates: blank, final: r });
        day++;
        continue;
      }
      workHours += n * REVIEW_HOURS;
      const found = spot(hidden, SPOT_END);
      if (!found.length) {
        row({ gates: blank, final: OK });
        day++;
        break;
      }
      stops++;
      const origin = Math.min(...found);
      spread += n - origin;
      for (const f of found) hidden.splice(hidden.indexOf(f), 1);
      row({ gates: blank, final: STOP });
      day++;
      for (let i = origin; i < n && day < HORIZON; i++) {
        row({ gates: set(i, FIX), final: IDLE });
        workHours += FIX_HOURS;
        day++;
      }
      state.queued = -1;
    }
  } else {
    // One shared record: filled in once, then every system reads it.
    for (let k = 0; k < n; k++) if (rng() < o.problems) hidden.push(k);
    workHours += ENTRY_HOURS * 1.5; // one longer form instead of n short ones
    row({ gates: ENTER.repeat(n), final: IDLE });
    day++;
    if (o.approvals === 'each') {
      while (day < HORIZON) {
        const states = Array.from({ length: n }, () => ({ queued: -1 }));
        const done = new Array(n).fill(false);
        let foundAny = [];
        while (day < HORIZON && done.some((d) => !d)) {
          let cells = '';
          for (let k = 0; k < n; k++) {
            if (done[k]) {
              cells += IDLE;
              continue;
            }
            const r = approverStep(pools[k], states[k]);
            if (r !== 'done') {
              cells += r;
              continue;
            }
            done[k] = true;
            workHours += REVIEW_HOURS;
            const found = spot(hidden, SPOT_EACH).filter((f) => !foundAny.includes(f));
            foundAny = foundAny.concat(found);
            cells += found.length ? STOP : OK;
          }
          row({ gates: cells, final: IDLE });
          day++;
        }
        if (!foundAny.length) break;
        stops++;
        spread += 1;
        for (const f of foundAny) hidden.splice(hidden.indexOf(f), 1);
        row({ gates: blank.replace(/./g, (c, i) => (foundAny.includes(i) ? FIX : IDLE)), final: IDLE });
        workHours += FIX_HOURS;
        day++;
      }
    } else {
      const state = { queued: -1 };
      while (day < HORIZON) {
        const r = approverStep(pools[n], state);
        if (r !== 'done') {
          row({ gates: blank, final: r });
          day++;
          continue;
        }
        workHours += n * REVIEW_HOURS;
        const found = spot(hidden, SPOT_END);
        if (!found.length) {
          row({ gates: blank, final: OK });
          day++;
          break;
        }
        stops++;
        spread += 1;
        for (const f of found) hidden.splice(hidden.indexOf(f), 1);
        row({ gates: blank, final: STOP });
        day++;
        row({ gates: blank.replace(/./g, (c, i) => (found.includes(i) ? FIX : IDLE)), final: IDLE });
        workHours += FIX_HOURS;
        day++;
        state.queued = -1;
      }
    }
  }
  return { days: Math.min(day, HORIZON), workHours, stops, spread, slipped: hidden.length > 0, log };
}

/**
 * Many requests through the same design.
 * options: { systems, problems, info: 'copies'|'shared', approvals: 'each'|'end',
 *            availability, meanSpell, standIns, busy? }
 */
export function simulateSystems(options, { requests = 1500, seed = 13, journeys = 0 } = {}) {
  const rng = makeRng(seed);
  const params = absenceParams(options.availability, options.meanSpell);
  const days = new Float64Array(requests);
  const logs = [];
  const logWork = []; // hours of work in each recorded journey
  let work = 0;
  let within = 0;
  let slipped = 0;
  let stopped = 0;
  let spread = 0;
  let stops = 0;
  for (let i = 0; i < requests; i++) {
    const run = simulateOne(rng, options, params, i < journeys);
    days[i] = run.days;
    work += run.workHours;
    if (run.days <= DEADLINE) within++;
    if (run.slipped) slipped++;
    if (run.stops) stopped++;
    stops += run.stops;
    spread += run.spread;
    if (run.log) logs.push(run.log), logWork.push(run.workHours);
  }
  const total = days.reduce((a, b) => a + b, 0);
  return {
    days,
    median: quantile(days, 0.5),
    p90: quantile(days, 0.9),
    mean: total / requests,
    withinDeadline: within / requests,
    workShare: work / (total * 8),
    slipped: slipped / requests,
    stopped: stopped / requests,
    spreadPerStop: stops ? spread / stops : 0,
    journeys: logs,
    journeyWork: logWork,
  };
}

export function histogram(days, max = 60) {
  const bins = new Array(max + 1).fill(0);
  for (const d of days) bins[Math.min(max, Math.round(d))]++;
  return bins;
}
