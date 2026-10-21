// Winner-take-all markets (chapter 14), after W. Brian Arthur's increasing
// returns (1989) and the Pólya urn. Twenty identical firms start with one
// customer each. Every new customer picks a firm with a chance proportional to
// quality × customers^returns. With returns below 1, size helps less and less;
// at 1 every customer adds the same pull; above 1, the biggest firm pulls
// hardest of all.

import { makeRng } from './rng.js';

export const FIRMS = 20;
export const CUSTOMERS = 3000;

/**
 * One market history. better: how much more attractive firm 0's product is (0 = identical).
 * Returns shares over time (one array per firm), final shares, the leader and its share.
 */
export function simulateMarket({ returns = 1, better = 0, seed = 1, firms = FIRMS, customers = CUSTOMERS, samples = 60 } = {}) {
  const rng = makeRng(seed);
  const n = new Float64Array(firms).fill(1);
  const quality = Array.from({ length: firms }, (_, i) => (i === 0 ? 1 + better : 1));
  const weight = (i) => quality[i] * Math.pow(n[i], returns);
  const w = Float64Array.from({ length: firms }, (_, i) => weight(i));
  let total = w.reduce((a, b) => a + b, 0);
  const every = Math.max(1, Math.floor(customers / samples));
  const shares = Array.from({ length: firms }, () => []);
  const record = (sold) => {
    for (let i = 0; i < firms; i++) shares[i].push(n[i] / (firms + sold));
  };
  record(0);
  for (let c = 1; c <= customers; c++) {
    let r = rng() * total;
    let pick = firms - 1;
    for (let i = 0; i < firms; i++) {
      r -= w[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    n[pick] += 1;
    total -= w[pick];
    w[pick] = weight(pick);
    total += w[pick];
    if (c % every === 0) record(c);
  }
  const final = Array.from(n, (v) => v / (firms + customers));
  const leader = final.indexOf(Math.max(...final));
  return { shares, final, leader, leaderShare: final[leader] };
}

/** Over many histories: how big the leader typically gets, and how often the better firm (firm 0) leads. */
export function manyMarkets({ returns, better = 0, runs = 100, seed = 1000, customers = 1500 }) {
  let betterWins = 0;
  const leaderShares = [];
  for (let k = 0; k < runs; k++) {
    const m = simulateMarket({ returns, better, seed: seed + k, customers, samples: 1 });
    if (m.leader === 0) betterWins++;
    leaderShares.push(m.leaderShare);
  }
  leaderShares.sort((a, b) => a - b);
  return { betterWins, runs, medianLeader: leaderShares[Math.floor(runs / 2)] };
}
