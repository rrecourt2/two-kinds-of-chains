// Waiting-line mathematics for chapter 4 and the busy approvers in the check-up tool (chapter 15).

import { exponential } from './rng.js';

/** Probability an arriving request has to wait in an M/M/c queue (Erlang C). */
export function erlangC(c, rho) {
  if (rho <= 0) return 0;
  if (rho >= 1) return 1;
  const a = c * rho;
  let term = 1;
  let sum = 1;
  for (let k = 1; k < c; k++) {
    term *= a / k;
    sum += term;
  }
  const last = (term * a) / c / (1 - rho);
  return last / (sum + last);
}

/** Average wait before work starts, in multiples of the work time itself. */
export function meanWait(c, rho) {
  if (rho >= 1) return Infinity;
  return erlangC(c, rho) / (c * (1 - rho));
}

/**
 * A live queue for the animation: `servers` approvers, Poisson arrivals and
 * exponential work times of mean 1 hour. In "named" mode each request is
 * assigned to one approver at random and waits in that approver's line; in
 * "pooled" mode there is one shared line and the next free approver takes it.
 */
export class LiveQueue {
  constructor({ servers = 4, rho = 0.85, mode = 'named', rng }) {
    this.servers = servers;
    this.rng = rng;
    this.rho = rho;
    this.mode = mode;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.nextId = 1;
    this.lines = Array.from({ length: this.servers }, () => []);
    this.shared = [];
    this.busy = Array.from({ length: this.servers }, () => null);
    this.nextArrival = exponential(this.rng, 1 / this.arrivalRate());
    this.waits = [];
    this.served = 0;
  }

  arrivalRate() {
    return this.servers * this.rho;
  }

  setRho(rho) {
    this.rho = rho;
    this.nextArrival = this.t + exponential(this.rng, 1 / this.arrivalRate());
    this.waits = [];
  }

  setMode(mode) {
    if (mode === this.mode) return;
    // Move everyone already waiting into the new arrangement, oldest first.
    const waiting = [...this.shared, ...this.lines.flat()].sort((a, b) => a.arrived - b.arrived);
    this.mode = mode;
    this.shared = [];
    this.lines = Array.from({ length: this.servers }, () => []);
    for (const job of waiting) this.enqueue(job);
    this.waits = [];
  }

  enqueue(job) {
    if (this.mode === 'pooled') {
      this.shared.push(job);
    } else {
      if (job.server == null) job.server = Math.floor(this.rng() * this.servers);
      this.lines[job.server].push(job);
    }
  }

  startWork() {
    for (let s = 0; s < this.servers; s++) {
      if (this.busy[s]) continue;
      const line = this.mode === 'pooled' ? this.shared : this.lines[s];
      if (!line.length) continue;
      const job = line.shift();
      job.started = this.t;
      job.done = this.t + exponential(this.rng, 1);
      job.at = s;
      this.waits.push(job.started - job.arrived);
      if (this.waits.length > 400) this.waits.shift();
      this.busy[s] = job;
    }
  }

  /** Advance simulated time by dt hours. */
  advance(dt) {
    const end = this.t + dt;
    for (;;) {
      let nextDone = Infinity;
      for (const job of this.busy) if (job && job.done < nextDone) nextDone = job.done;
      const next = Math.min(this.nextArrival, nextDone);
      if (next > end) break;
      this.t = next;
      if (next === this.nextArrival) {
        this.enqueue({ id: this.nextId++, arrived: this.t, server: null });
        this.nextArrival = this.t + exponential(this.rng, 1 / this.arrivalRate());
      } else {
        const s = this.busy.findIndex((job) => job && job.done === next);
        this.busy[s] = null;
        this.served++;
      }
      this.startWork();
    }
    this.t = end;
    this.startWork();
  }

  averageWait() {
    if (!this.waits.length) return 0;
    return this.waits.reduce((a, b) => a + b, 0) / this.waits.length;
  }

  sampleSize() {
    return this.waits.length;
  }

  waitingCount() {
    return this.shared.length + this.lines.reduce((n, line) => n + line.length, 0);
  }

  /** Approvers with nothing to do while someone else's line has requests waiting. */
  idleButNeeded() {
    if (this.mode === 'pooled') return 0;
    const anyWaiting = this.lines.some((line) => line.length > 0);
    if (!anyWaiting) return 0;
    return this.busy.filter((job, s) => !job && this.lines[s].length === 0).length;
  }
}
