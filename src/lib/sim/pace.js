// How fast to forget: a lender's cushion for one country, sized to the worst year it remembers.
//
// The world: a normal year's losses (as a share of the country's loan book, about 2% to start) drift slowly, a
// random walk in log terms kept between 0.5% and 8%. Each year has some noise, and one year in twenty is a crisis
// with four times a normal year's losses.
//
// The lender: each year it holds a cushion equal to the worst year it remembers. After the year, that memory fades:
// the remembered worst moves a share 1 / memory of the way towards the year just seen, and never below it:
//   R <- max(loss, R - (R - loss) / memory).
// With a memory of one year the cushion is last year's losses; with fifty it barely comes down between crises.
//
// The cost, over 60 years after 40 years of warming up: losses beyond the cushion, plus lending held back, which is
// a share `carry` of the cushion each year (an idle cushion is lending the country does not get). Both are in
// percent of the book, added up over the 60 years.
import { makeRng, normal } from './rng.js';

/** The slider's stops, in years of memory. */
export const MEMORIES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50];
export const YEARS = 60;
export const BURN = 40;
export const PARAMS = { start: 2, drift: 0.06, noise: 0.25, crisisEvery: 20, mult: 4, low: 0.5, high: 8 };
/** What a year of idle cushion costs, in lending held back, as a share of the cushion. */
export const COSTS = { little: 0.05, some: 0.1, lot: 0.15 };
/** The history the figure shows: crises in years 10 and 39 of the 60. */
export const SEED = 2;
/** Histories the tiles and the puzzle average over. */
export const HISTORIES = 3000;
/** The puzzle's limits, in percent of the book over 60 years, judged on the whole percent the tiles show. */
export const LIMITS = { through: 22, held: 30 };

/** One country's 100 years of losses, in percent of the book. */
export function world(seed = SEED, { drift = PARAMS.drift, noise = PARAMS.noise, crisisP = 1 / PARAMS.crisisEvery, mult = PARAMS.mult, start = PARAMS.start, years = BURN + YEARS } = {}) {
  const rng = makeRng(seed);
  let lvl = Math.log(start);
  const lo = Math.log(PARAMS.low);
  const hi = Math.log(PARAMS.high);
  const base = [];
  const loss = [];
  const crisis = [];
  for (let t = 0; t < years; t++) {
    lvl = Math.max(lo, Math.min(hi, lvl + drift * normal(rng)));
    const c = rng() < crisisP;
    const b = Math.exp(lvl);
    base.push(b);
    crisis.push(c);
    loss.push(b * Math.exp(noise * normal(rng) - (noise * noise) / 2) * (c ? mult : 1));
  }
  return { base, loss, crisis };
}

/**
 * The lender with a given memory, over the 60 scored years of a world. `through` is losses beyond the cushion,
 * `cushion` the cushion held added up over the years, `held` the lending held back (carry x cushion), `broken`
 * the years in which losses went beyond the cushion. `path` has one entry per scored year.
 */
export function run(w, memory, { carry = COSTS.some, burn = BURN, years = YEARS } = {}) {
  const fade = 1 / memory;
  let R = Math.max(...w.loss.slice(0, 10));
  let through = 0;
  let cushion = 0;
  let broken = 0;
  const path = [];
  for (let t = 0; t < burn + years; t++) {
    const B = R;
    if (t >= burn) {
      const x = Math.max(0, w.loss[t] - B);
      through += x;
      broken += x > 0 ? 1 : 0;
      cushion += B;
      path.push({ year: t - burn + 1, cushion: B, loss: w.loss[t], beyond: x, crisis: w.crisis[t] });
    }
    R = Math.max(w.loss[t], R - fade * (R - w.loss[t]));
  }
  const held = carry * cushion;
  return { through, cushion, held, total: through + held, broken, path };
}

/**
 * Averages over many histories for every memory on the slider: losses beyond the cushion, cushion held and years
 * broken. Lending held back is carry x cushion, so one table serves every cost of the idle cushion.
 */
export function table(options = {}) {
  const job = tabulate({ ...options, chunk: Infinity });
  let step = job.next();
  while (!step.done) step = job.next();
  return step.value;
}

/** The same table in steps of `chunk` histories, so a page can work it out without stalling. */
function* tabulate({ histories = HISTORIES, memories = MEMORIES, chunk = 300, ...wopts } = {}) {
  const rows = memories.map((memory) => ({ memory, through: 0, cushion: 0, broken: 0 }));
  for (let s = 1; s <= histories; s++) {
    const w = world(s, wopts);
    for (const row of rows) {
      const r = run(w, row.memory);
      row.through += r.through / histories;
      row.cushion += r.cushion / histories;
      row.broken += r.broken / histories;
    }
    if (s % chunk === 0 && s < histories) yield s;
  }
  return rows;
}

/** One row of the table at a given cost of the idle cushion. */
export const costs = (row, carry = COSTS.some) => {
  const held = carry * row.cushion;
  return { memory: row.memory, through: row.through, held, total: row.through + held, broken: row.broken };
};

/** The memory with the lowest total cost at a given cost of the idle cushion. */
export function best(rows, carry = COSTS.some) {
  return rows.map((row) => costs(row, carry)).reduce((a, b) => (b.total < a.total ? b : a));
}

/** The puzzle's two checks, on the whole percent shown. */
export const checks = ({ through, held }) => ({ through: Math.round(through) <= LIMITS.through, held: Math.round(held) <= LIMITS.held });

/** The figure's history at every memory on the slider. */
export const figureRuns = () => {
  const w = world(SEED);
  return MEMORIES.map((m) => run(w, m));
};

let finished = null;
let job = null;
/** The chapter's table, once worked out; null until then. */
export const chapterReady = () => finished;

/** Advances the chapter's table by one step; returns it once it is complete. */
export function chapterStep() {
  if (finished) return finished;
  job ??= tabulate();
  const step = job.next();
  if (step.done) {
    finished = step.value;
    job = null;
  }
  return finished;
}
