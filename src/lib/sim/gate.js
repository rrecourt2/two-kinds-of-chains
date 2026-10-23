// The gate worth keeping. A development lender receives about 600 requests a year to send a
// payment to a new bank account; one in 200 is a fraudster's. A check before payment catches
// every fraud, but it takes one of three qualified reviewers a day, and payments are promised
// within three working days. The bank checks every payment at or above an amount it chooses.
// Each simulated year is lived through once: its losses are not averaged with the next year's,
// which is how the chapter connects to the coin game. The board's limit: no year may lose
// more than $5m.
//
// Ported from the designer's prototypes (scratchpad/r10-design/gateYear.mjs, gateYear2.mjs):
// with the same seed it draws the same random numbers in the same order. All amounts in $m.

import { makeRng, poisson, normal, quantile } from './rng.js';

export const PARAMS = Object.freeze({
  perDay: 2.4, // change-of-account requests a working day (Poisson): about 600 a year
  days: 250, // working days in a year
  median: 1, // payment sizes: lognormal, median $1m …
  sigma: 1.4, // … with this spread on the log scale,
  floor: 0.05, // kept between $50,000 …
  cap: 80, // … and $80m
  fraudEvery: 200, // one request in 200 is a fraudster's
  reviewers: 3, // qualified reviewers; a check takes one of them one working day
  presence: 0.9, // each is in nine days in ten …
  spell: 4, // … away for spells of four days on average
  promise: 3, // payment is promised within three working days of the request
  tail: 60, // working days after the year in which checks still in the queue are finished
});

export const LIMIT = 5; // the board's limit: no year may lose more than $5m
export const YEARS = 1000;
export const SEED = 12;

/** The slider's stops: check every payment at or above this amount ($m). */
export const STOPS = Object.freeze([
  Object.freeze({ at: 0, label: 'Every payment' }),
  Object.freeze({ at: 0.25, label: '$250,000' }),
  Object.freeze({ at: 0.5, label: '$500,000' }),
  Object.freeze({ at: 1, label: '$1m' }),
  Object.freeze({ at: 2, label: '$2m' }),
  Object.freeze({ at: 5, label: '$5m' }),
  Object.freeze({ at: 10, label: '$10m' }),
  Object.freeze({ at: 20, label: '$20m' }),
  Object.freeze({ at: Infinity, label: 'None' }),
]);

/** One year of requests, in the order they arrive: day, size ($m), fraud (1 or 0), named reviewer. */
export function yearOf(rng, p = PARAMS) {
  let cap = Math.ceil(p.perDay * p.days * 1.5) + 16;
  let day = new Int32Array(cap);
  let size = new Float64Array(cap);
  let fraud = new Uint8Array(cap);
  let reviewer = new Uint8Array(cap);
  let n = 0;
  for (let d = 0; d < p.days; d++) {
    const k = poisson(rng, p.perDay);
    for (let i = 0; i < k; i++) {
      if (n === cap) {
        cap *= 2;
        const grow = (a) => {
          const b = new a.constructor(cap);
          b.set(a);
          return b;
        };
        [day, size, fraud, reviewer] = [day, size, fraud, reviewer].map(grow);
      }
      day[n] = d;
      size[n] = Math.max(p.floor, Math.min(p.cap, p.median * Math.exp(p.sigma * normal(rng))));
      fraud[n] = rng() < 1 / p.fraudEvery ? 1 : 0;
      reviewer[n] = Math.floor(rng() * p.reviewers);
      n++;
    }
  }
  return { day: day.subarray(0, n), size: size.subarray(0, n), fraud: fraud.subarray(0, n), reviewer: reviewer.subarray(0, n), n };
}

/** Who is in on each working day: a two-state chain with mean absence `spell` and presence `presence`. */
export function calendars(rng, p = PARAMS, days = p.days + p.tail) {
  const leave = (1 - p.presence) / (p.presence * p.spell); // in today, away tomorrow
  const back = 1 / p.spell; // away today, in tomorrow
  return Array.from({ length: p.reviewers }, () => {
    const c = new Uint8Array(days);
    let inNow = rng() < p.presence;
    for (let d = 0; d < days; d++) {
      c[d] = inNow ? 1 : 0;
      inNow = inNow ? rng() >= leave : rng() < back;
    }
    return c;
  });
}

/**
 * One year under one rule. Requests below `threshold` are paid the day they arrive (a fraud
 * among them is lost in full); the rest queue for a check, first come first served, either for
 * any qualified reviewer who is in (`pooled`) or for their own named reviewer. A check done on
 * day d pays a valid request the next day: its wait is d − arrival + 1 working days.
 */
export function runYear(y, cal, { threshold, pooled = true }, p = PARAMS) {
  const horizon = cal[0].length;
  const { n, day, size, fraud, reviewer } = y;
  const lanes = pooled ? 1 : p.reviewers;
  // Each queue is a slice of one buffer: queue q holds its requests from q * n onwards.
  const buf = new Int32Array(lanes * n);
  const head = new Int32Array(lanes);
  const tail = new Int32Array(lanes);
  for (let q = 0; q < lanes; q++) head[q] = tail[q] = q * n;
  const order = new Int32Array(n);
  let checked = 0;
  let loss = 0;
  let moneyChecked = 0;
  let valid = 0;
  let late = 0;
  let waitSum = 0;
  for (let i = 0; i < n; i++) {
    if (size[i] >= threshold) {
      order[checked++] = i;
      moneyChecked += size[i];
    } else if (fraud[i]) loss += size[i]; // paid at once to a fraudster: lost in full
    else valid++; // paid at once, no wait
  }
  let next = 0;
  let waiting = 0;
  for (let d = 0; d < horizon && (next < checked || waiting > 0); d++) {
    while (next < checked && day[order[next]] === d) {
      const i = order[next++];
      const q = pooled ? 0 : reviewer[i];
      buf[tail[q]++] = i;
      waiting++;
    }
    for (let r = 0; r < p.reviewers; r++) {
      if (!cal[r][d]) continue;
      const q = pooled ? 0 : r;
      if (head[q] === tail[q]) continue;
      const i = buf[head[q]++];
      waiting--;
      if (!fraud[i]) {
        const wait = d - day[i] + 1;
        valid++;
        waitSum += wait;
        if (wait > p.promise) late++;
      }
    }
  }
  // Anything still queued at the horizon (only when nearly every payment is checked) counts as very late.
  for (let q = 0; q < lanes; q++) {
    for (let h = head[q]; h < tail[q]; h++) {
      const i = buf[h];
      if (fraud[i]) continue;
      valid++;
      waitSum += horizon - day[i] + 5;
      late++;
    }
  }
  return { loss, checked, n, valid, late, waitSum, moneyChecked };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * A thousand years (by default), every rule in `runs` applied to the same years in one pass.
 * Returns one summary per run, in order: the loss of every year, its average, typical (median)
 * and worst, the years over the limit, the share of valid payments that were late, the share
 * of payments checked and of the money they carry, and how busy the reviewers were.
 */
export function simulate(options = {}) {
  const steps = simulation(options);
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
  }
}

/**
 * The same, in steps: yields the share of years done after every `chunk` years and returns the
 * summaries, so a page can spread the work over several moments instead of one long pause.
 */
export function* simulation({ runs = STOPS.map((s) => ({ threshold: s.at, pooled: true })), years = YEARS, seed = SEED, p = PARAMS, chunk = years } = {}) {
  const rng = makeRng(seed);
  const acc = runs.map(() => ({ losses: new Float64Array(years), checked: 0, valid: 0, late: 0, waitSum: 0, moneyChecked: 0 }));
  let n = 0;
  let money = 0;
  let present = 0; // reviewer-days in, within the working year
  for (let t = 0; t < years; t++) {
    const y = yearOf(rng, p);
    const cal = calendars(rng, p);
    n += y.n;
    for (let i = 0; i < y.n; i++) money += y.size[i];
    for (const c of cal) for (let d = 0; d < p.days; d++) present += c[d];
    for (let k = 0; k < runs.length; k++) {
      const r = runYear(y, cal, runs[k], p);
      const a = acc[k];
      a.losses[t] = r.loss;
      a.checked += r.checked;
      a.valid += r.valid;
      a.late += r.late;
      a.waitSum += r.waitSum;
      a.moneyChecked += r.moneyChecked;
    }
    if ((t + 1) % chunk === 0 && t + 1 < years) yield (t + 1) / years;
  }
  return runs.map((run, k) => {
    const a = acc[k];
    const losses = Array.from(a.losses);
    let worstYear = 0;
    for (let t = 1; t < years; t++) if (losses[t] > losses[worstYear]) worstYear = t;
    return {
      threshold: run.threshold,
      pooled: run.pooled !== false,
      losses,
      mean: mean(losses),
      median: quantile(losses, 0.5),
      worst: losses[worstYear],
      worstYear,
      over: losses.filter((l) => l > LIMIT).length,
      lossless: losses.filter((l) => l === 0).length,
      late: a.late / a.valid,
      avgWait: a.waitSum / a.valid,
      checkedShare: a.checked / n,
      moneyShare: a.moneyChecked / money,
      // Checks asked of the reviewers against the days they are in: how busy the gate keeps them.
      busy: a.checked / present,
      perYear: n / years,
    };
  });
}

/** Whether a rule meets the board's limit and the promise to pay on time (fewer than 1 in 100 late). */
export const meetsLimit = (r) => r.worst <= LIMIT;
export const onTime = (r) => r.late < 0.01;

// The chapter's own runs: every stop with any qualified reviewer, then the $1m stop with named
// reviewers only (for the model note). Worked out once, the first time the chapter opens, in
// steps of 50 years; a later visit, or a reset, picks up the finished result or the same job.
const CHAPTER_RUNS = [...STOPS.map((s) => ({ threshold: s.at, pooled: true })), { threshold: 1, pooled: false }];
const split = (out) => ({ stops: out.slice(0, STOPS.length), named: out[STOPS.length] });
let finished = null;
let job = null;

/** The chapter's results if they are ready, otherwise null. */
export const chapterReady = () => finished;

/** Advances the chapter's simulation by one step; returns the results once they are complete. */
export function chapterStep() {
  if (finished) return finished;
  job ??= simulation({ runs: CHAPTER_RUNS, chunk: 50 });
  const step = job.next();
  if (step.done) {
    finished = split(step.value);
    job = null;
  }
  return finished;
}

/** All of it at once (for tests and scripts). */
export function chapterRuns() {
  while (!chapterStep());
  return finished;
}
