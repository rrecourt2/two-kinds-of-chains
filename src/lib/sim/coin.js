// Ole Peters' coin game (chapter 7). Heads: wealth grows 50%. Tails: it
// shrinks 40%. Players may stake only part of their wealth, and may pool:
// a pool shares everything equally after every round.

import { makeRng } from './rng.js';

export const UP = 0.5;
export const DOWN = 0.4;

/** Expected (ensemble-average) growth factor per round. */
export function expectedFactor(stake) {
  return 1 + stake * (UP - DOWN) / 2;
}

function logChoose(n, k) {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i);
  return s;
}

/** Growth factor per round that a typical (median) player experiences in the long run. */
export function typicalFactor(stake, pool = 1) {
  let g = 0;
  for (let h = 0; h <= pool; h++) {
    const p = Math.exp(logChoose(pool, h) - pool * Math.LN2);
    const factor = 1 + (stake * (UP * h - DOWN * (pool - h))) / pool;
    g += p * Math.log(factor);
  }
  return Math.exp(g);
}

/**
 * Simulate `players` players for `rounds` rounds. Returns log10 wealth for a
 * sample of pools, the median over all players per round, and summary shares.
 */
export function simulateCoin({ players = 2000, rounds = 100, stake = 1, pool = 1, seed = 5, sample = 40 }) {
  const rng = makeRng(seed);
  const pools = Math.floor(players / pool);
  const wealth = new Float64Array(pools).fill(1);
  const median = new Float64Array(rounds + 1);
  const paths = Array.from({ length: Math.min(sample, pools) }, () => new Float64Array(rounds + 1));
  median[0] = 1;
  const scratch = new Float64Array(pools);
  const lost = new Float64Array(rounds + 1);
  for (let t = 1; t <= rounds; t++) {
    for (let i = 0; i < pools; i++) {
      let sum = 0;
      for (let m = 0; m < pool; m++) sum += rng() < 0.5 ? 1 + stake * UP : 1 - stake * DOWN;
      wealth[i] *= sum / pool;
    }
    scratch.set(wealth);
    scratch.sort();
    median[t] = pools % 2 ? scratch[(pools - 1) / 2] : (scratch[pools / 2 - 1] + scratch[pools / 2]) / 2;
    for (let i = 0; i < paths.length; i++) paths[i][t] = wealth[i];
    let below = 0;
    for (let i = 0; i < pools; i++) if (wealth[i] < 1) below++;
    lost[t] = below / pools;
  }
  for (const p of paths) p[0] = 1;
  return {
    median,
    paths,
    lost,
    lostShare: lost[rounds],
    expected: Array.from({ length: rounds + 1 }, (_, t) => Math.pow(expectedFactor(stake), t)),
  };
}
