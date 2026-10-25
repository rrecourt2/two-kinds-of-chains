// A chain tied in a knot. A programme of forty conditions, linked at random: each link makes
// one condition wait for another. A condition can be met once everything it waits for is met;
// conditions that wait for each other, directly or through others (a knot, in graph terms a
// strongly connected component), have no first link, so none of them can be met, and neither
// can anything that waits for them. A joint closing meets every condition of a small knot at
// the same moment, as a simultaneous signing does.
//
// Also Kauffman's NK model, for the complexity catastrophe the chapter ends on.
import { makeRng } from './rng.js';

export const N = 40;
/** The programme in the figure: close to the average programme at 40 and at 80 links. */
export const SEED = 131510;
/** The slider: links between the forty conditions, in tens (40 is one per condition). */
export const LINKS = Array.from({ length: 13 }, (_, i) => i * 10);
/** The puzzle: the programme opens at START links and asks about ASKED; before the first answer, the slider stops at START. */
export const START = 40;
export const ASKED = 80;
/** A joint closing unties knots of up to this many conditions. */
export const JOINT = 3;
/** Programmes in the across-many-runs summary. */
export const RUNS = 3000;

/**
 * The figure's forty conditions, by index: a power plant co-financed by equity and loans, with a
 * reform of the utility alongside. The names are illustrative; the links are random, but the
 * names are placed so that the links up to 40 read naturally, and so that the reform's own knot
 * (tariff rise → regulator → law → proof that tariffs cover costs → tariff rise) closes by 80.
 */
export const NAMES = [
  'Land allocated', // 0
  'Loan ready to disburse', // 1
  'Tariff rise', // 2
  'Grid study', // 3
  'Construction started', // 4
  'Equity paid in', // 5
  'Tariffs cover costs', // 6
  'Grid connection agreed', // 7
  'Tax exemption granted', // 8
  'Intercreditor agreement', // 9
  'Co-lender’s loan signed', // 10
  'Social tariff set', // 11
  'Co-lender’s approval', // 12
  'Transmission line funded', // 13
  'Hedging in place', // 14
  'Security registered', // 15
  'Feasibility study', // 16
  'Financing plan agreed', // 17
  'EPC contract signed', // 18
  'Utility law passed', // 19
  'Environmental permit', // 20
  'Regulator appointed', // 21
  'Cabinet approval', // 22
  'Loan agreement signed', // 23
  'Resettlement plan', // 24
  'Concession granted', // 25
  'E&S due diligence', // 26
  'E&S action plan', // 27
  'Procurement plan agreed', // 28
  'Legal opinions issued', // 29
  'EPC advance paid', // 30
  'Subsidy plan agreed', // 31
  'Government guarantee', // 32
  'PPA signed', // 33
  'Project accounts opened', // 34
  'Detailed design', // 35
  'Public consultation', // 36
  'Generation licence', // 37
  'Board approval', // 38
  'Sector study', // 39
];

/**
 * One programme: every possible "waits for" link (i waits for j, i ≠ j) gets a random number u,
 * and the links are taken in order of u, so more links only add links to the same programme.
 */
export function programme(seed = SEED, n = N) {
  const rng = makeRng(seed);
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) pairs.push({ i, j, u: rng() });
  pairs.sort((a, b) => a.u - b.u);
  return { n, seed, pairs };
}

/** The first `count` links of a programme, as [waiting, waited-for] pairs, in the order they arrive. */
export function linksAt(prog, count) {
  return prog.pairs.slice(0, Math.max(0, Math.round(count))).map((e) => [e.i, e.j]);
}

/** out[i]: the conditions i waits for. */
export function adjacency(n, links) {
  const out = Array.from({ length: n }, () => []);
  for (const [i, j] of links) out[i].push(j);
  return out;
}

/** Tarjan's strongly connected components: comp[v] and the size of each component. */
export function knots(out) {
  const n = out.length;
  let index = 0;
  let c = 0;
  const idx = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const on = new Array(n).fill(false);
  const comp = new Array(n).fill(-1);
  const stack = [];
  const sizes = [];
  const strong = (v) => {
    idx[v] = low[v] = index++;
    stack.push(v);
    on[v] = true;
    for (const w of out[v]) {
      if (idx[w] < 0) {
        strong(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (on[w]) low[v] = Math.min(low[v], idx[w]);
    }
    if (low[v] === idx[v]) {
      let w;
      let s = 0;
      do {
        w = stack.pop();
        on[w] = false;
        comp[w] = c;
        s++;
      } while (w !== v);
      sizes.push(s);
      c++;
    }
  };
  for (let v = 0; v < n; v++) if (idx[v] < 0) strong(v);
  return { comp, sizes };
}

/**
 * Which conditions can ever be met. One at a time, a condition is met once all it waits for
 * is met; with `joint`, a knot of up to `joint` conditions is met all at once, once everything
 * outside it that it waits for is met.
 */
export function resolve(out, joint = 1) {
  const n = out.length;
  const { comp, sizes } = knots(out);
  const members = sizes.map(() => []);
  comp.forEach((c, v) => members[c].push(v));
  const met = new Array(n).fill(false);
  const round = new Array(n).fill(-1);
  // Tarjan numbers a component only after everything it waits for, so one pass in that order
  // settles every component; `round` counts how many steps after the start each is met.
  for (let c = 0; c < sizes.length; c++) {
    if (sizes[c] > 1 && sizes[c] > joint) continue;
    const vs = members[c];
    let r = 0;
    let ok = true;
    for (const v of vs)
      for (const w of out[v]) {
        if (comp[w] === c) continue;
        if (!met[w]) ok = false;
        else r = Math.max(r, round[w] + 1);
      }
    if (!ok) continue;
    for (const v of vs) {
      met[v] = true;
      round[v] = r;
    }
  }
  const largest = Math.max(1, ...sizes);
  return {
    met,
    round,
    metCount: met.filter(Boolean).length,
    comp,
    sizes,
    largest,
    // A knot is a component of two or more; `closed` marks those met by a joint closing.
    inKnot: comp.map((c) => sizes[c] > 1),
    closed: comp.map((c) => sizes[c] > 1 && met[members[c][0]]),
  };
}

/** The figure: programme `seed` with its first `count` links. */
export function stateAt(count, { seed = SEED, joint = 1, prog = null } = {}) {
  const p = prog ?? programme(seed);
  const links = linksAt(p, count);
  const out = adjacency(p.n, links);
  const r = resolve(out, joint);
  return { ...r, count, links, out, joint, n: p.n };
}

/**
 * Why a condition stands where it does, for the figure's read-out: a path of "waits for" links.
 * - A condition in a knot: the shortest way round the knot from it back to itself.
 * - A stuck condition outside a knot: the shortest way, through stuck conditions, to a knot.
 * - A condition that can be met: no path.
 * Returns { kind: 'met' | 'knot' | 'closed' | 'behind', path: [v, …] }; for 'knot' and 'closed'
 * the path ends where it began, for 'behind' it ends on a member of a knot.
 */
export function trace(state, v) {
  const { out, met, comp, inKnot, closed } = state;
  if (met[v] && !closed[v]) return { kind: 'met', path: [] };
  const inside = inKnot[v];
  // Breadth first, so the path is a shortest one; `prev` leads back to v.
  const prev = new Map([[v, -1]]);
  const back = (x) => {
    const path = [];
    for (; x !== -1; x = prev.get(x)) path.unshift(x);
    return path;
  };
  const queue = [v];
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q];
    for (const w of out[u]) {
      if (inside) {
        if (comp[w] !== comp[v]) continue;
        if (w === v) return { kind: closed[v] ? 'closed' : 'knot', path: [...back(u), v] };
      } else if (met[w]) continue;
      if (prev.has(w)) continue;
      prev.set(w, u);
      if (!inside && inKnot[w]) return { kind: 'behind', path: back(w) };
      queue.push(w);
    }
  }
  return { kind: 'met', path: [] };
}

/** Across many programmes: the average number that can be met, how many programmes can be met in full, the largest knot. */
export function cliff(counts = LINKS, { runs = RUNS, joint = 1, n = N } = {}) {
  const acc = counts.map(() => ({ met: 0, full: 0, largest: 0 }));
  for (let s = 1; s <= runs; s++) {
    const p = programme(s, n);
    counts.forEach((c, k) => {
      const r = resolve(adjacency(n, linksAt(p, c)), joint);
      acc[k].met += r.metCount / runs;
      acc[k].full += (r.metCount === n) / runs;
      acc[k].largest += r.largest / runs;
    });
  }
  return counts.map((c, k) => ({ count: c, met: acc[k].met, share: acc[k].met / n, full: acc[k].full, largest: acc[k].largest }));
}

/**
 * The across-many-runs summary, computed once by `cliff()` over RUNS programmes (test/knot.test.js
 * recomputes it): average conditions that can be met at each slider stop, one at a time and with
 * joint closings of knots up to three; the percentage of programmes that can be met in full, and
 * the average size of the largest knot, one at a time.
 */
export const CLIFF = {
  one: [40, 39.9, 39.34, 37.23, 31.82, 23.42, 15.83, 10.66, 7.39, 5.24, 3.78, 2.75, 2.01],
  joint: [40, 40, 39.88, 39, 35.21, 27.17, 18.05, 11.59, 7.8, 5.46, 3.88, 2.81, 2.04],
  full: [100, 96.3, 84, 59.6, 29.5, 8.5, 1.4, 0.1, 0, 0, 0, 0, 0],
  largest: [1, 1.04, 1.24, 1.84, 3.39, 6.86, 12.74, 19.63, 25.56, 29.67, 32.53, 34.54, 36.01],
};

/**
 * Fixed positions for the figure, so that more links do not move the dots. A force layout of the
 * programme at 80 links (the first 40 pull harder), in a box `aspect` wide and 1 high, with a
 * margin of `pad`.
 */
export function layout(prog, { aspect = 1, count = 80, iterations = 500, pad = 0.04, gravity = 3, pull = 3, gap = 0.055 } = {}) {
  const n = prog.n;
  const links = linksAt(prog, count);
  const strong = Math.min(START, count);
  const rng = makeRng(prog.seed * 7 + 3);
  const W = aspect;
  const H = 1;
  // A sunflower spiral start, jittered, so the result does not depend on chance alone.
  const pts = Array.from({ length: n }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / n) * 0.45;
    const a = i * 2.399963 + rng() * 0.3;
    return { x: W / 2 + r * Math.cos(a) * W, y: H / 2 + r * Math.sin(a) * H };
  });
  const k = Math.sqrt((W * H) / n) * 0.9;
  let t = 0.12 * Math.max(W, H);
  for (let it = 0; it < iterations; it++) {
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        let ex = pts[i].x - pts[j].x;
        let ey = pts[i].y - pts[j].y;
        let dist = Math.hypot(ex, ey);
        if (dist < 1e-6) {
          ex = 1e-3 * (i - j);
          ey = 1e-3;
          dist = Math.hypot(ex, ey);
        }
        const f = (k * k) / dist;
        dx[i] += (ex / dist) * f;
        dy[i] += (ey / dist) * f;
        dx[j] -= (ex / dist) * f;
        dy[j] -= (ey / dist) * f;
      }
    links.forEach(([i, j], e) => {
      const ex = pts[i].x - pts[j].x;
      const ey = pts[i].y - pts[j].y;
      const dist = Math.max(1e-6, Math.hypot(ex, ey));
      const f = ((dist * dist) / k) * (e < strong ? pull : 1);
      dx[i] -= (ex / dist) * f;
      dy[i] -= (ey / dist) * f;
      dx[j] += (ex / dist) * f;
      dy[j] += (ey / dist) * f;
    });
    for (let i = 0; i < n; i++) {
      // A gentle pull to the centre keeps loose conditions from drifting to the corners.
      dx[i] += (W / 2 - pts[i].x) * gravity * k;
      dy[i] += (H / 2 - pts[i].y) * gravity * k * (W / H);
      const len = Math.hypot(dx[i], dy[i]);
      if (len > 0) {
        pts[i].x += (dx[i] / len) * Math.min(len, t);
        pts[i].y += (dy[i] / len) * Math.min(len, t);
      }
      pts[i].x = Math.min(W - pad, Math.max(pad, pts[i].x));
      pts[i].y = Math.min(H - pad, Math.max(pad, pts[i].y));
    }
    t = Math.max(0.002, t * 0.985);
  }
  // Stretch to fill the box, then push apart any two dots closer than `gap`.
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const out = pts.map((p) => ({
    x: pad + ((p.x - x0) / (x1 - x0 || 1)) * (W - 2 * pad),
    y: pad + ((p.y - y0) / (y1 - y0 || 1)) * (H - 2 * pad),
  }));
  for (let it = 0; it < 60; it++) {
    let moved = false;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const ex = out[i].x - out[j].x;
        const ey = out[i].y - out[j].y;
        const dist = Math.hypot(ex, ey) || 1e-6;
        if (dist >= gap) continue;
        const push = (gap - dist) / 2 + 1e-4;
        out[i].x += (ex / dist) * push;
        out[i].y += (ey / dist) * push;
        out[j].x -= (ex / dist) * push;
        out[j].y -= (ey / dist) * push;
        moved = true;
      }
    for (const p of out) {
      p.x = Math.min(W - pad, Math.max(pad, p.x));
      p.y = Math.min(H - pad, Math.max(pad, p.y));
    }
    if (!moved) break;
  }
  return out;
}

/**
 * Places a few name labels beside their dots, for the figure. Each label has eight places (right,
 * left, above, below, and the four corners); every combination is tried, and the one that stays in
 * the box with the fewest overlaps (with each other, with dots, with the marked points along links)
 * wins. A label that cannot be placed without leaving the box or covering another label is
 * dropped, the last in `ids` first. `width(text)` estimates a label's width in pixels.
 */
export function placeLabels({ ids, pos, text, width, box, r, marks = [] }) {
  const cands = (v) => {
    const p = pos[v];
    const w = width(text(v));
    const gap = r + 5;
    const lift = r + 6;
    const drop = r + 15;
    return [
      [p.x + gap, p.y + 4, 'start'],
      [p.x - gap, p.y + 4, 'end'],
      [p.x, p.y - lift, 'middle'],
      [p.x, p.y + drop, 'middle'],
      [p.x + 2, p.y - lift, 'start'],
      [p.x - 2, p.y - lift, 'end'],
      [p.x + 2, p.y + drop, 'start'],
      [p.x - 2, p.y + drop, 'end'],
    ].map(([x, y, anchor], k) => {
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      const c = { v, x, y, anchor, x0, x1: x0 + w, y0: y - 11, y1: y + 3 };
      let cost = k * 0.1;
      if (c.x0 < 2 || c.x1 > box.width - 2 || c.y0 < 1 || c.y1 > box.height - 1) cost += 1000;
      for (const q of pos) if (q !== p && q.x + r > c.x0 && q.x - r < c.x1 && q.y + r > c.y0 && q.y - r < c.y1) cost += 12;
      for (const m of marks) if (m.x > c.x0 && m.x < c.x1 && m.y > c.y0 && m.y < c.y1) cost += m.weight;
      return { ...c, cost };
    });
  };
  const clash = (a, b) => a.x0 < b.x1 + 4 && a.x1 > b.x0 - 4 && a.y0 < b.y1 + 2 && a.y1 > b.y0 - 2;
  for (let n = ids.length; n > 0; n--) {
    const options = ids.slice(0, n).map(cands);
    let best = null;
    let bestCost = Infinity;
    const pick = (k, chosen, cost) => {
      if (cost >= bestCost) return;
      if (k === options.length) {
        best = chosen;
        bestCost = cost;
        return;
      }
      for (const c of options[k]) {
        const extra = c.cost + chosen.reduce((s, d) => s + (clash(c, d) ? 500 : 0), 0);
        pick(k + 1, [...chosen, c], cost + extra);
      }
    };
    pick(0, [], 0);
    if (bestCost < 500) return best;
  }
  return [];
}

// ---- Kauffman's NK model ----
// A design of 12 settings, each one of two ways (4,096 designs). Each setting's contribution
// depends on its own value and on K others, through a random table; the design's worth is the
// average contribution. A team improves the design one change at a time, keeping a change if the
// whole gets better, and stops when no single change helps: a dead end (a local peak).

export const NK_N = 12;

export function nkLandscape(K, rng, { modular = false, N = NK_N, size = 4 } = {}) {
  const deps = [];
  for (let i = 0; i < N; i++) {
    if (modular) {
      const m = Math.floor(i / size) * size;
      deps.push(Array.from({ length: size }, (_, k) => m + k).filter((j) => j !== i).slice(0, K));
    } else {
      const o = [...Array(N).keys()].filter((j) => j !== i);
      for (let a = o.length - 1; a > 0; a--) {
        const b = Math.floor(rng() * (a + 1));
        [o[a], o[b]] = [o[b], o[a]];
      }
      deps.push(o.slice(0, K));
    }
  }
  const tables = deps.map((d) => Float64Array.from({ length: 2 ** (d.length + 1) }, () => rng()));
  const f = new Float64Array(2 ** N);
  for (let x = 0; x < f.length; x++) {
    let s = 0;
    for (let i = 0; i < N; i++) {
      let idx = (x >> i) & 1;
      for (let k = 0; k < deps[i].length; k++) idx |= ((x >> deps[i][k]) & 1) << (k + 1);
      s += tables[i][idx];
    }
    f[x] = s / N;
  }
  return f;
}

/** Dead ends: designs where no single change improves the whole. */
export function nkPeaks(f, N = NK_N) {
  let p = 0;
  for (let x = 0; x < f.length; x++) {
    let peak = true;
    for (let i = 0; i < N; i++)
      if (f[x ^ (1 << i)] > f[x]) {
        peak = false;
        break;
      }
    if (peak) p++;
  }
  return p;
}

/**
 * A team's climb from a random design. 'one': try single changes in random order and keep the
 * first that helps. 'module': a module's team tries every setting of its own four together and
 * keeps the best for the whole.
 */
export function nkClimb(f, rng, { style = 'one', N = NK_N, size = 4 } = {}) {
  let x = Math.floor(rng() * f.length);
  for (;;) {
    let moved = false;
    if (style === 'one') {
      const order = [...Array(N).keys()];
      for (let a = N - 1; a > 0; a--) {
        const b = Math.floor(rng() * (a + 1));
        [order[a], order[b]] = [order[b], order[a]];
      }
      for (const i of order)
        if (f[x ^ (1 << i)] > f[x]) {
          x ^= 1 << i;
          moved = true;
          break;
        }
    } else {
      const M = N / size;
      const mods = [...Array(M).keys()];
      for (let a = M - 1; a > 0; a--) {
        const b = Math.floor(rng() * (a + 1));
        [mods[a], mods[b]] = [mods[b], mods[a]];
      }
      for (const m of mods) {
        const mask = ((1 << size) - 1) << (m * size);
        let best = x;
        for (let c = 0; c < 1 << size; c++) {
          const y = (x & ~mask) | (c << (m * size));
          if (f[y] > f[best]) best = y;
        }
        if (best !== x) {
          x = best;
          moved = true;
          break;
        }
      }
    }
    if (!moved) return x;
  }
}

/** Share of teams that reach the best design, and the average number of dead ends. */
export function nkStudy(K, { worlds = 400, teams = 40, seed = 1000 + K, modular = false, style = 'one' } = {}) {
  const rng = makeRng(seed);
  let best = 0;
  let peaks = 0;
  for (let w = 0; w < worlds; w++) {
    const f = nkLandscape(K, rng, { modular });
    let top = 0;
    for (let x = 1; x < f.length; x++) if (f[x] > f[top]) top = x;
    peaks += nkPeaks(f) / worlds;
    for (let t = 0; t < teams; t++) if (nkClimb(f, rng, { style }) === top) best += 1 / (worlds * teams);
  }
  return { best, peaks };
}
