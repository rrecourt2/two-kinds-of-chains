// Specialist versus generalist (chapter 10). Each year, each of four food
// plants has a good year (×(1+v)) or a bad year (×(1−v)), where v is how
// variable the years are. The specialist eats one plant and converts it
// efficiently; the generalist eats all four, less efficiently.

import { makeRng, poisson } from './rng.js';

export const SPECIALIST_RATE = 1.1;
export const GENERALIST_RATE = 1.06;
export const PLANTS = 4;
export const CAPACITY = 5000;

/** Long-run (geometric-mean) growth factor per year. */
export function longRunGrowth(kind, v) {
  if (kind === 'specialist') {
    return SPECIALIST_RATE * Math.sqrt(Math.max(1e-12, (1 + v) * (1 - v)));
  }
  let g = 0;
  let ways = 1;
  for (let good = 0; good <= PLANTS; good++) {
    if (good > 0) ways = (ways * (PLANTS - good + 1)) / good;
    const mean = 1 + (v * (2 * good - PLANTS)) / PLANTS;
    g += (ways / 2 ** PLANTS) * Math.log(Math.max(1e-12, mean));
  }
  return GENERALIST_RATE * Math.exp(g);
}

/** Average growth factor per year (what a one-year spreadsheet would show). */
export function averageGrowth(kind) {
  return kind === 'specialist' ? SPECIALIST_RATE : GENERALIST_RATE;
}

/**
 * Simulate both species on the same islands with the same weather, so the
 * comparison is fair. Returns population paths and survivor counts.
 */
export function simulateIslands({ v, start, islands = 40, years = 100, seed = 21 }) {
  const rng = makeRng(seed);
  const result = { specialist: [], generalist: [] };
  for (let i = 0; i < islands; i++) {
    const weather = [];
    for (let t = 0; t < years; t++) {
      const plants = [];
      for (let p = 0; p < PLANTS; p++) plants.push(rng() < 0.5 ? 1 + v : 1 - v);
      weather.push(plants);
    }
    for (const kind of ['specialist', 'generalist']) {
      const path = new Float64Array(years + 1);
      let pop = start;
      path[0] = pop;
      let extinctAt = null;
      for (let t = 0; t < years; t++) {
        const food = kind === 'specialist' ? weather[t][0] : weather[t].reduce((a, b) => a + b, 0) / PLANTS;
        const rate = (kind === 'specialist' ? SPECIALIST_RATE : GENERALIST_RATE) * food;
        pop = pop > 0 ? Math.min(CAPACITY, poisson(rng, pop * rate)) : 0;
        if (pop === 0 && extinctAt === null) extinctAt = t + 1;
        path[t + 1] = pop;
      }
      result[kind].push({ path, extinctAt });
    }
  }
  const survivors = (kind) => result[kind].filter((r) => r.extinctAt === null).length;
  return { ...result, survivors: { specialist: survivors('specialist'), generalist: survivors('generalist') } };
}
