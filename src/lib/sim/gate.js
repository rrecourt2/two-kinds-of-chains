// The gate worth keeping: a false-positive case. A development lender receives about 600
// requests a year to send a payment to a new bank account; one in 200 is a fraudster's. An
// automatic screen scores every request for signs of fraud, and a flagged payment waits for a
// call-back to the client on a number already on file, which stops any fraud. The call takes one
// of three qualified reviewers a day, and payments are promised within three working days.
//
// Fraud is rare, so at every sensitivity most flags are genuine clients: false positives. Turned
// up, the screen floods the reviewers; turned down, it misses frauds; and one fraud in four shows
// no sign at all, so no setting stops a large one for sure. The way out sizes the gate to the
// loss: call back every payment above an amount, whatever the screen says, and screen the rest
// lightly. Each simulated year is lived through once, as in the coin game: the board's limit is on
// the worst of 1,000 years, not the average. All amounts in $m.

import { makeRng, poisson, normal, quantile } from './rng.js';

export const PARAMS = Object.freeze({
  perDay: 2.4, // change-of-account requests a working day (Poisson): about 600 a year
  days: 250, // working days in a year
  median: 1, // payment sizes: lognormal, median $1m …
  sigma: 1.4, // … with this spread on the log scale,
  floor: 0.05, // redrawn unless between $50,000 …
  cap: 80, // … and $80m
  fraudEvery: 200, // one request in 200 is a fraudster's
  hidden: 0.25, // one fraud in four shows no sign: it scores like a genuine request
  signal: 3, // the others score this many standard deviations above a genuine request, on average
  reviewers: 3, // qualified reviewers; a call-back takes one of them one working day
  presence: 0.9, // each is in nine days in ten …
  spell: 4, // … away for spells of four days on average
  promise: 3, // payment is promised within three working days of the request
  tail: 60, // working days after the year in which call-backs still in the line are finished
});

export const LIMIT = 5; // the board's limit: no year may lose more than $5m
export const YEARS = 1000;
export const SEED = 12;
export const LATE = 0.01; // the promise: fewer than 1 payment in 100 late

/** The screen's settings: the share of genuine requests each one flags. */
export const SENSITIVITY = Object.freeze([
  Object.freeze({ label: 'Low', flags: 0.1 }),
  Object.freeze({ label: 'Medium', flags: 0.35 }),
  Object.freeze({ label: 'High', flags: 0.5 }),
  Object.freeze({ label: 'Very high', flags: 0.7 }),
]);

/** Call back every payment above this amount, whatever the screen says ($m). */
export const CALLBACK = Object.freeze([
  Object.freeze({ at: Infinity, label: 'None' }),
  Object.freeze({ at: 10, label: '$10m' }),
  Object.freeze({ at: 1, label: '$1m' }),
]);

export const START = Object.freeze({ sens: 1, callback: 0 }); // the screen alone, at Medium
export const ANSWER = Object.freeze({ sens: 0, callback: 2 }); // a light screen, and every payment above $1m

/** The standard normal quantile (Acklam's rational approximation, accurate to about 1e-9). */
export function qnorm(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const tail = (q) => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 0.97575) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** The score above which a setting flags a request: it flags the share `flags` of genuine requests. */
export const cutoff = (flags) => (flags <= 0 ? Infinity : qnorm(1 - flags));

/** One payment size: lognormal, redrawn until it falls between the floor and the cap. */
function sizeOf(rng, p) {
  for (;;) {
    const s = p.median * Math.exp(p.sigma * normal(rng));
    if (s >= p.floor && s <= p.cap) return s;
  }
}

/**
 * One year of requests, in the order they arrive: day, size ($m), fraud (1 or 0), hidden (a fraud
 * that shows no sign), the screen's score and the reviewer who would make the call if each had
 * their own line.
 */
export function yearOf(rng, p = PARAMS) {
  let cap = Math.ceil(p.perDay * p.days * 1.5) + 16;
  let day = new Int32Array(cap);
  let size = new Float64Array(cap);
  let fraud = new Uint8Array(cap);
  let hidden = new Uint8Array(cap);
  let score = new Float64Array(cap);
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
        [day, size, fraud, hidden, score, reviewer] = [day, size, fraud, hidden, score, reviewer].map(grow);
      }
      day[n] = d;
      size[n] = sizeOf(rng, p);
      fraud[n] = rng() < 1 / p.fraudEvery ? 1 : 0;
      hidden[n] = fraud[n] && rng() < p.hidden ? 1 : 0;
      score[n] = normal(rng) + (fraud[n] && !hidden[n] ? p.signal : 0);
      reviewer[n] = Math.floor(rng() * p.reviewers);
      n++;
    }
  }
  const cut = (a) => a.subarray(0, n);
  return { n, day: cut(day), size: cut(size), fraud: cut(fraud), hidden: cut(hidden), score: cut(score), reviewer: cut(reviewer) };
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

/** Whether request i waits for a call-back: above the amount, or flagged by the screen. */
export const calledBack = (y, i, threshold, cut) => y.size[i] > threshold || y.score[i] > cut;

/**
 * One year under one rule: call back every payment above `threshold`, and any the screen flags
 * (score above `cut`). The rest are paid the day they arrive, and a fraud among them is lost in
 * full. Call-backs wait in one line, first come first served, for any qualified reviewer who is in
 * (`pooled`), or each for their own named reviewer. A call made on day d pays a genuine request
 * the next day: its wait is d − arrival + 1 working days.
 */
export function runYear(y, cal, { threshold, cut, pooled = true }, p = PARAMS) {
  const horizon = cal[0].length;
  const { n, day, size, fraud, reviewer } = y;
  const lanes = pooled ? 1 : p.reviewers;
  // Each line is a slice of one buffer: line q holds its requests from q * n onwards.
  const buf = new Int32Array(lanes * n);
  const head = new Int32Array(lanes);
  const tail = new Int32Array(lanes);
  for (let q = 0; q < lanes; q++) head[q] = tail[q] = q * n;
  const order = new Int32Array(n);
  const r = { n, money: 0, called: 0, genuineCalled: 0, bySize: 0, bySizeMoney: 0, flagged: 0, flaggedFraud: 0, frauds: 0, stopped: 0, loss: 0, fraudMoney: 0, valid: 0, late: 0, waitSum: 0 };
  for (let i = 0; i < n; i++) {
    r.money += size[i];
    if (y.score[i] > cut) {
      r.flagged++;
      r.flaggedFraud += fraud[i];
    }
    if (fraud[i]) {
      r.frauds++;
      r.fraudMoney += size[i];
    }
    if (calledBack(y, i, threshold, cut)) {
      order[r.called++] = i;
      if (size[i] > threshold) {
        r.bySize++;
        r.bySizeMoney += size[i];
      }
      if (fraud[i]) r.stopped++;
      else r.genuineCalled++;
    } else if (fraud[i]) r.loss += size[i]; // paid at once to a fraudster: lost in full
    else r.valid++; // paid at once, no wait
  }
  let next = 0;
  let waiting = 0;
  for (let d = 0; d < horizon && (next < r.called || waiting > 0); d++) {
    while (next < r.called && day[order[next]] === d) {
      const i = order[next++];
      const q = pooled ? 0 : reviewer[i];
      buf[tail[q]++] = i;
      waiting++;
    }
    for (let k = 0; k < p.reviewers; k++) {
      if (!cal[k][d]) continue;
      const q = pooled ? 0 : k;
      if (head[q] === tail[q]) continue;
      const i = buf[head[q]++];
      waiting--;
      if (!fraud[i]) {
        const wait = d - day[i] + 1;
        r.valid++;
        r.waitSum += wait;
        if (wait > p.promise) r.late++;
      }
    }
  }
  // Anything still in the line at the horizon (only when nearly every payment is called) counts as very late.
  for (let q = 0; q < lanes; q++) {
    for (let h = head[q]; h < tail[q]; h++) {
      const i = buf[h];
      if (fraud[i]) continue;
      r.valid++;
      r.waitSum += horizon - day[i] + 5;
      r.late++;
    }
  }
  return r;
}

/** Every setting of the card, in order: sensitivity by sensitivity, each with every call-back amount. */
export const SETTINGS = Object.freeze(
  SENSITIVITY.flatMap((s, si) => CALLBACK.map((c, ci) => Object.freeze({ sens: si, callback: ci, threshold: c.at, cut: cutoff(s.flags), pooled: true }))),
);
export const settingIndex = (sens, callback) => sens * CALLBACK.length + callback;

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const FIELDS = ['n', 'money', 'called', 'genuineCalled', 'bySize', 'bySizeMoney', 'flagged', 'flaggedFraud', 'frauds', 'stopped', 'fraudMoney', 'valid', 'late', 'waitSum'];

/**
 * A thousand years (by default), every rule in `runs` applied to the same years in one pass.
 * Returns one summary per run, in order: the loss of every year, its average, typical (median) and
 * worst, the years over the limit, the share of genuine payments late, call-backs and flags a
 * year, the share of flags that were fraud, the share of frauds and of fraud money stopped, and
 * how busy the reviewers were.
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
export function* simulation({ runs = SETTINGS, years = YEARS, seed = SEED, p = PARAMS, chunk = years } = {}) {
  const rng = makeRng(seed);
  const acc = runs.map(() => {
    const a = { losses: new Float64Array(years) };
    for (const f of FIELDS) a[f] = 0;
    return a;
  });
  let present = 0; // reviewer-days in, within the working year
  for (let t = 0; t < years; t++) {
    const y = yearOf(rng, p);
    const cal = calendars(rng, p);
    for (const c of cal) for (let d = 0; d < p.days; d++) present += c[d];
    for (let k = 0; k < runs.length; k++) {
      const r = runYear(y, cal, runs[k], p);
      const a = acc[k];
      a.losses[t] = r.loss;
      for (const f of FIELDS) a[f] += r[f];
    }
    if ((t + 1) % chunk === 0 && t + 1 < years) yield (t + 1) / years;
  }
  return runs.map((run, k) => {
    const a = acc[k];
    const losses = Array.from(a.losses);
    let worstYear = 0;
    for (let t = 1; t < years; t++) if (losses[t] > losses[worstYear]) worstYear = t;
    return {
      sens: run.sens,
      callback: run.callback,
      threshold: run.threshold,
      pooled: run.pooled !== false,
      losses,
      mean: mean(losses),
      median: quantile(losses, 0.5),
      worst: losses[worstYear],
      worstYear,
      over: losses.filter((l) => l > LIMIT).length,
      late: a.late / a.valid,
      avgWait: a.waitSum / a.valid,
      perYear: a.n / years,
      calls: a.called / years, // call-backs a year
      genuineCalls: a.genuineCalled / years, // genuine clients called back a year
      bySize: a.bySize / a.n, // share of requests called back for their amount …
      bySizeMoney: a.bySizeMoney / a.money, // … and their share of the money
      flags: a.flagged / years, // requests the screen flags a year, at any amount
      flagsFraud: a.flaggedFraud / years,
      precision: a.flagged ? a.flaggedFraud / a.flagged : 0, // the share of flags that are fraud
      frauds: a.frauds / years,
      caught: a.frauds ? a.stopped / a.frauds : 1, // share of frauds stopped
      moneyStopped: a.fraudMoney ? 1 - losses.reduce((s, l) => s + l, 0) / a.fraudMoney : 1,
      // Calls asked of the reviewers against the days they are in: how busy the gate keeps them.
      busy: a.called / present,
    };
  });
}

/** Whether a rule meets the board's limit and the promise to pay on time (fewer than 1 in 100 late). */
export const meetsLimit = (r) => r.worst <= LIMIT;
export const onTime = (r) => r.late < LATE;

// ---- The year on the card ----
// One year drawn on its own seed, chosen because its three frauds show the whole case: a hidden
// one of several million that no setting of the screen sees, a clumsy small one that every setting
// flags, and a hidden small one that only the two highest settings catch.
// Found by searching seeds for those three frauds among about 600 requests (test/gate.test.js
// checks them).
export const SHOW_SEED = 255017;

/** The year shown on the card. */
export const shownYear = (seed = SHOW_SEED, p = PARAMS) => yearOf(makeRng(seed), p);

// The chapter's own runs: every setting with any qualified reviewer, then the answer with named
// reviewers only (for the text). Worked out once, the first time the chapter opens, in steps of
// 50 years; a later visit, or a reset, picks up the finished result or the same job.
const NAMED = Object.freeze({ ...SETTINGS[settingIndex(ANSWER.sens, ANSWER.callback)], pooled: false });
const CHAPTER_RUNS = [...SETTINGS, NAMED];
const split = (out) => ({ runs: out.slice(0, SETTINGS.length), named: out[SETTINGS.length] });
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
