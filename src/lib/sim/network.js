// Interbank contagion: the stress test, after Watts (2002) and Gai & Kapadia (2010).
// Each bank lends 20% of its balance sheet to the banks it is linked to, split
// evenly. A failed borrower's loan is lost in full. A bank fails when its
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
 * The failure condition. A bank with `borrowers` borrowers lends each of them
 * 20% ÷ borrowers of its assets; with `lost` of them failed, its losses are
 * lost × 20 ÷ borrowers percent, and it fails when they exceed its capital.
 * Integer arithmetic keeps the threshold exact: losses equal to capital leave
 * the bank standing.
 */
export function fails(lost, borrowers, capitalPct) {
  return lost * INTERBANK_PCT > capitalPct * borrowers;
}

/** How many failed borrowers a bank with `borrowers` borrowers survives at this capital. */
export function absorbs(capitalPct, borrowers) {
  let lost = 0;
  while (lost < borrowers && !fails(lost + 1, borrowers, capitalPct)) lost++;
  return lost;
}

/**
 * Failure waves after the seed banks fail (see `fails` for the threshold).
 * `capital` is one percentage for every bank, or an array with one per bank.
 */
export function cascade(adj, capital, seeds) {
  const capOf = typeof capital === 'number' ? () => capital : (i) => capital[i];
  const failed = new Uint8Array(adj.length);
  for (const s of seeds) failed[s] = 1;
  const waves = [[...seeds]];
  for (;;) {
    const next = [];
    for (let i = 0; i < adj.length; i++) {
      if (failed[i] || adj[i].length === 0) continue;
      let lost = 0;
      for (const j of adj[i]) lost += failed[j];
      if (fails(lost, adj[i].length, capOf(i))) next.push(i);
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

/** Every bank, most connected first (ties in the order the banks joined). */
export function byLinks(adj) {
  return adj
    .map((links, i) => [links.length, i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .map(([, i]) => i);
}

// ---------------------------------------------------------------------------
// The chapter's stress test. 48 banks grown around a few hubs; today each holds
// 5% capital. One bank loses 8% of its assets on its own loans: it fails only if
// that is more than its capital, and then its lenders take the loss. The reader
// chooses where the loss lands, the capital every bank holds (2–10% of assets),
// and whether the most connected banks hold extra on top (48 percentage points
// in all). The supervisor may add at most 48 percentage points to today's capital.

export const BANKS = 48;
export const HUB_LINKS = 4; // about four links per bank on average; each newcomer links to two
export const CAPITAL = 5; // % of assets, every bank, today
export const CAPITALS = [2, 3, 4, 5, 6, 7, 8, 9, 10]; // the slider: capital for every bank, % of assets
export const LOSS = 8; // % of assets the bank where the loss lands loses on its own loans
export const EXTRA = 48; // percentage points of extra capital for the hubs, in all; also the budget
export const LIMIT = 5; // the puzzle: wherever the loss lands, at most this many banks fail

/**
 * The hub networks of earlier versions of the chapter used seeds 15200–15239;
 * network 7 is the one whose results came closest to the average of the 40.
 * The figure draws it; the others check that the answer is not a fluke of one
 * network (test/contagion.test.js).
 */
export const HUB_SEED = 15200;
export const EXAMPLE = 7;
export const ALTERNATIVES = 40;

/** Hub network number `t` (the figure's is EXAMPLE). */
export function hubSystem(t = EXAMPLE) {
  return buildNetwork('hubs', BANKS, HUB_LINKS, HUB_SEED + t);
}

/**
 * The other banking system, shown once the puzzle is solved: the same 48 banks
 * linked as many similar banks, every pair with the same chance, about ten
 * partners each (the earlier chapter's random networks, seeds 2100–2139).
 * Network 8 is the one whose worst landings come closest to the average of the
 * 40 (test/contagion.test.js).
 */
export const SIMILAR_LINKS = 10;
export const SIMILAR_SEED = 2100;
export const SIMILAR_EXAMPLE = 8;

/** Similar-bank network number `t` (the figure's is SIMILAR_EXAMPLE). */
export function similarSystem(t = SIMILAR_EXAMPLE) {
  return buildNetwork('random', BANKS, SIMILAR_LINKS, SIMILAR_SEED + t);
}

/** The two banking systems: as it is (grown around hubs), and many similar banks. */
export const SYSTEMS = [
  { value: 'hubs', label: 'As it is', seed: HUB_SEED + EXAMPLE, network: hubSystem },
  { value: 'similar', label: 'Many similar banks', seed: SIMILAR_SEED + SIMILAR_EXAMPLE, network: similarSystem },
];
export const systemOf = (value) => SYSTEMS.find((s) => s.value === value);

/**
 * Extra capital for the hubs, on top of what every bank holds: the `top` most
 * connected banks get EXTRA ÷ top percentage points each (48 in all).
 */
export const SHARES = [
  { value: 'none', label: 'None', top: 0 },
  { value: 'top3', label: '3 biggest +16', top: 3 },
  { value: 'top12', label: '12 biggest +4', top: 12 },
];
export const shareOf = (value) => SHARES.find((s) => s.value === value);

/** Each bank's capital, in % of assets: `base` for every bank, plus the extra for the `top` most connected. */
export function capitalFor(adj, top, base = CAPITAL, extra = EXTRA) {
  const capital = new Array(adj.length).fill(base);
  if (top > 0) {
    const order = byLinks(adj);
    for (let r = 0; r < top; r++) capital[order[r]] += extra / top;
  }
  return capital;
}

/** The loss lands on bank `at`: absorbed if it does not exceed the bank's capital, otherwise a cascade. */
export function landing(adj, capital, at, loss = LOSS) {
  if (loss <= capital[at]) return { absorbed: true, waves: [], failed: new Uint8Array(adj.length), count: 0 };
  return { absorbed: false, ...cascade(adj, capital, [at]) };
}

/** Banks that fail, for every place the loss can land; and the worst of them. */
export function everywhere(adj, capital, loss = LOSS) {
  const sizes = adj.map((_, i) => landing(adj, capital, i, loss).count);
  const worst = Math.max(...sizes);
  return { sizes, worst, worstAt: sizes.map((s, i) => (s === worst ? i : -1)).filter((i) => i >= 0) };
}

/**
 * Percentage points of capital added to today's (CAPITAL for every bank): the
 * change for every bank plus the extra for the hubs. Negative when every bank
 * holds less than today.
 */
export function added(base, top, extra = EXTRA) {
  return BANKS * (base - CAPITAL) + (top > 0 ? extra : 0);
}

/** The puzzle's budget: capital is raised, never cut below today's, by at most EXTRA percentage points. */
export function withinBudget(base, top) {
  return base >= CAPITAL && added(base, top) <= EXTRA;
}

/**
 * The curve: for every capital on the slider, the banks that fail at the worst
 * place to land (and where that is), with the `top` most connected holding extra.
 */
export function worstCurve(adj, top, capitals = CAPITALS) {
  return capitals.map((capital) => ({ capital, ...everywhere(adj, capitalFor(adj, top, capital)) }));
}

/** Where a curve tips: the index `i` of its steepest fall, between capitals[i] and capitals[i + 1]. */
export function tippingPoint(curve) {
  let at = 0;
  for (let i = 1; i < curve.length - 1; i++) if (curve[i].worst - curve[i + 1].worst > curve[at].worst - curve[at + 1].worst) at = i;
  return at;
}

/**
 * A bank's rule as a quorum of its partners: it fails once `k` of its
 * `partners` have failed (null if it stands even when all of them fail).
 */
export function partnersToFail(capitalPct, partners) {
  const k = absorbs(capitalPct, partners) + 1;
  return k > partners ? null : k;
}

/** In how many of the networks of one system this capital keeps the worst place to `limit` failures or fewer. */
export function holdsAcross(top, limit = LIMIT, networks = ALTERNATIVES, base = CAPITAL, system = 'hubs') {
  const network = systemOf(system).network;
  let held = 0;
  for (let t = 0; t < networks; t++) {
    const adj = network(t);
    if (everywhere(adj, capitalFor(adj, top, base)).worst <= limit) held++;
  }
  return held;
}

/** The most banks any one landing brings down, across the networks of one system, at this capital. */
export function worstAcross(system, base = CAPITAL, top = 0, networks = ALTERNATIVES) {
  const network = systemOf(system).network;
  let most = 0;
  for (let t = 0; t < networks; t++) {
    const adj = network(t);
    most = Math.max(most, everywhere(adj, capitalFor(adj, top, base)).worst);
  }
  return most;
}

/**
 * Monte Carlo sweep by number of counterparties (random networks): for each
 * average number of counterparties, the share of banks that end up failing
 * after a shock. No longer drawn in the chapter; kept for the tests.
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

/**
 * Fruchterman–Reingold layout, with a pull toward the centre for loose banks.
 * The banks are laid out in a frame `aspect` times as wide as it is high, and
 * returned in unit coordinates (x and y from 0 to 1, with a margin), so a
 * drawing of that shape shows them undistorted.
 */
export function layout(adj, seed = 1, iterations = 320, aspect = 1) {
  const rng = makeRng(seed);
  const n = adj.length;
  const a = aspect;
  const x = Float64Array.from({ length: n }, () => rng() * a);
  const y = Float64Array.from({ length: n }, () => rng());
  const k = Math.sqrt(a / n) * 0.9;
  let temp = 0.12 * Math.sqrt(a);
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
      // In a wide frame the pull is weaker across and stronger up and down, so the banks spread sideways.
      dx[i] += ((a / 2 - x[i]) * pull[i]) / (a * a);
      dy[i] += (0.5 - y[i]) * pull[i] * a * a;
    }
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const step = Math.min(d, temp);
      x[i] += (dx[i] / d) * step;
      y[i] += (dy[i] / d) * step;
    }
    temp *= 0.985;
  }
  // Fit into the frame with a margin, keeping the shape.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, x[i]);
    maxX = Math.max(maxX, x[i]);
    minY = Math.min(minY, y[i]);
    maxY = Math.max(maxY, y[i]);
  }
  const s = Math.min((0.88 * a) / (maxX - minX || 1), 0.88 / (maxY - minY || 1));
  const ox = (a - (maxX - minX) * s) / 2;
  const oy = (1 - (maxY - minY) * s) / 2;
  return Array.from({ length: n }, (_, i) => ({ x: ((x[i] - minX) * s + ox) / a, y: (y[i] - minY) * s + oy }));
}
