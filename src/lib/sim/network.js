// Interbank contagion (chapter 6), after Watts (2002) and Gai & Kapadia (2010).
// Each bank lends 20% of its balance sheet to its counterparties, split
// evenly. A failed counterparty's loan is lost in full. A bank fails when its
// losses exceed its capital.

import { makeRng } from './rng.js';

export const INTERBANK_PCT = 20;

/** Erdős–Rényi network: every pair of banks is linked with the same probability. */
export function randomNetwork(rng, n, meanLinks) {
  const p = Math.min(1, meanLinks / (n - 1));
  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng() < p) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  return adj;
}

/** Preferential attachment (Barabási–Albert): newcomers link to banks that already have many links. */
export function hubNetwork(rng, n, meanLinks) {
  const m = Math.max(1, Math.round(meanLinks / 2));
  const adj = Array.from({ length: n }, () => []);
  const ends = []; // every link end, so sampling from it is proportional to links
  const core = m + 1;
  for (let i = 0; i < core; i++) {
    for (let j = i + 1; j < core; j++) {
      adj[i].push(j);
      adj[j].push(i);
      ends.push(i, j);
    }
  }
  for (let v = core; v < n; v++) {
    const targets = new Set();
    while (targets.size < Math.min(m, v)) targets.add(ends[Math.floor(rng() * ends.length)]);
    for (const t of targets) {
      adj[v].push(t);
      adj[t].push(v);
      ends.push(v, t);
    }
  }
  return adj;
}

export function buildNetwork(shape, n, meanLinks, seed) {
  const rng = makeRng(seed);
  return shape === 'hubs' ? hubNetwork(rng, n, meanLinks) : randomNetwork(rng, n, meanLinks);
}

/**
 * Failure waves after the seed banks fail. Integer arithmetic keeps the
 * threshold exact: a bank with k counterparties fails once
 * failed × 20 > capitalPct × k.
 */
export function cascade(adj, capitalPct, seeds) {
  const failed = new Uint8Array(adj.length);
  for (const s of seeds) failed[s] = 1;
  const waves = [[...seeds]];
  for (;;) {
    const next = [];
    for (let i = 0; i < adj.length; i++) {
      if (failed[i] || adj[i].length === 0) continue;
      let lost = 0;
      for (const j of adj[i]) lost += failed[j];
      if (lost * INTERBANK_PCT > capitalPct * adj[i].length) next.push(i);
    }
    if (!next.length) break;
    for (const i of next) failed[i] = 1;
    waves.push(next);
  }
  let count = 0;
  for (const f of failed) count += f;
  return { waves, failed, count };
}

/** Pick `k` distinct random banks that have at least one counterparty. */
export function pickSeeds(rng, adj, k) {
  const linked = adj.map((links, i) => (links.length ? i : -1)).filter((i) => i >= 0);
  const pool = linked.length ? linked : adj.map((_, i) => i);
  const chosen = new Set();
  while (chosen.size < Math.min(k, pool.length)) chosen.add(pool[Math.floor(rng() * pool.length)]);
  return [...chosen];
}

export function mostConnected(adj) {
  let best = 0;
  for (let i = 1; i < adj.length; i++) if (adj[i].length > adj[best].length) best = i;
  return best;
}

/**
 * Monte Carlo sweep for the strip chart: for each average number of
 * counterparties, the share of banks that end up failing after a shock.
 */
export function sweep({ n = 48, capitalPct = 4, shock = 1, trials = 40, maxLinks = 12, seed = 99 }) {
  const rng = makeRng(seed);
  const out = [];
  for (let z = 1; z <= maxLinks; z++) {
    const shares = [];
    for (let t = 0; t < trials; t++) {
      const adj = randomNetwork(rng, n, z);
      const { count } = cascade(adj, capitalPct, pickSeeds(rng, adj, shock));
      shares.push(count / n);
    }
    out.push({ z, shares });
  }
  return out;
}

/** Fruchterman–Reingold layout in the unit square, with a pull toward the centre for loose banks. */
export function layout(adj, seed = 1, iterations = 320) {
  const rng = makeRng(seed);
  const n = adj.length;
  const x = Float64Array.from({ length: n }, () => rng());
  const y = Float64Array.from({ length: n }, () => rng());
  const k = Math.sqrt(1 / n) * 0.9;
  let temp = 0.12;
  // Banks outside the main group get a stronger pull to the centre, so small islands stay close.
  const group = new Int32Array(n).fill(-1);
  const groupSize = [];
  for (let s = 0; s < n; s++) {
    if (group[s] >= 0) continue;
    const id = groupSize.length;
    const stack = [s];
    group[s] = id;
    let size = 0;
    while (stack.length) {
      const v = stack.pop();
      size++;
      for (const w of adj[v]) if (group[w] < 0) (group[w] = id), stack.push(w);
    }
    groupSize.push(size);
  }
  const pull = Float64Array.from({ length: n }, (_, i) => (groupSize[group[i]] < n / 3 ? 1.6 : 0.6));
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  for (let it = 0; it < iterations; it++) {
    dx.fill(0);
    dy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = x[i] - x[j];
        let ey = y[i] - y[j];
        let d2 = ex * ex + ey * ey;
        if (d2 < 1e-6) {
          ex = (rng() - 0.5) * 1e-3;
          ey = (rng() - 0.5) * 1e-3;
          d2 = 1e-6;
        }
        const f = (k * k) / d2;
        dx[i] += ex * f;
        dy[i] += ey * f;
        dx[j] -= ex * f;
        dy[j] -= ey * f;
      }
    }
    for (let i = 0; i < n; i++) {
      for (const j of adj[i]) {
        if (j < i) continue;
        const ex = x[i] - x[j];
        const ey = y[i] - y[j];
        const d = Math.sqrt(ex * ex + ey * ey) || 1e-3;
        const f = d / k;
        dx[i] -= ex * f;
        dy[i] -= ey * f;
        dx[j] += ex * f;
        dy[j] += ey * f;
      }
      dx[i] += (0.5 - x[i]) * pull[i];
      dy[i] += (0.5 - y[i]) * pull[i];
    }
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const step = Math.min(d, temp);
      x[i] += (dx[i] / d) * step;
      y[i] += (dy[i] / d) * step;
    }
    temp *= 0.985;
  }
  // Fit into the unit square with a margin.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, x[i]);
    maxX = Math.max(maxX, x[i]);
    minY = Math.min(minY, y[i]);
    maxY = Math.max(maxY, y[i]);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const ox = (1 - (maxX - minX) / span) / 2;
  const oy = (1 - (maxY - minY) / span) / 2;
  return Array.from({ length: n }, (_, i) => ({
    x: 0.06 + 0.88 * ((x[i] - minX) / span + ox),
    y: 0.06 + 0.88 * ((y[i] - minY) / span + oy),
  }));
}
