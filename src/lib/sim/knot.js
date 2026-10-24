// A chain looped back on itself. A programme of forty conditions, each waiting for others
// picked at random. A condition can be met once everything it waits for is met; a loop of
// waiting (a knot, in graph terms a strongly connected component) has no first link, so none
// of it can be met, and neither can anything that waits for it. A joint closing meets every
// condition of a small knot at the same moment, as a simultaneous signing or an escrow does.
//
// Also Kauffman's NK model, for the complexity catastrophe the chapter ends on.
import { makeRng } from './rng.js';

export const N = 40;
/** The programme in the figure: close to the average programme at one and at two links each. */
export const SEED = 131510;
/** The slider: links per condition, in quarters. */
export const LINKS = Array.from({ length: 13 }, (_, i) => i / 4);
/** A joint closing unties knots of up to this many conditions. */
export const JOINT = 3;
/** Programmes in the across-many-runs summary. */
export const RUNS = 3000;

/**
 * One programme: every possible "waits for" link (i waits for j, i ≠ j) gets a random number u,
 * and is in place when u < d / (n − 1), so each condition waits for d others on average and more
 * links per condition only add links to the same programme. Pairs are kept in order of u.
 */
export function programme(seed = SEED, n = N) {
  const rng = makeRng(seed);
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) pairs.push({ i, j, u: rng() });
  pairs.sort((a, b) => a.u - b.u);
  return { n, seed, pairs };
}

/** The links in place at d per condition, as [waiting, waited-for] pairs, in the order they arrive. */
export function linksAt(prog, d) {
  const p = d / (prog.n - 1);
  const out = [];
  for (const e of prog.pairs) {
    if (e.u >= p) break;
    out.push([e.i, e.j]);
  }
  return out;
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

/** The figure: programme `seed` at d links per condition. */
export function stateAt(d, { seed = SEED, joint = 1, prog = null } = {}) {
  const p = prog ?? programme(seed);
  const links = linksAt(p, d);
  const r = resolve(adjacency(p.n, links), joint);
  return { ...r, d, links, n: p.n };
}

/** Across many programmes: the average number that can be met, how many programmes can be met in full, the largest knot. */
export function cliff(ds = LINKS, { runs = RUNS, joint = 1, n = N } = {}) {
  const acc = ds.map(() => ({ met: 0, full: 0, largest: 0 }));
  for (let s = 1; s <= runs; s++) {
    const p = programme(s, n);
    ds.forEach((d, k) => {
      const r = resolve(adjacency(n, linksAt(p, d)), joint);
      acc[k].met += r.metCount / runs;
      acc[k].full += (r.metCount === n) / runs;
      acc[k].largest += r.largest / runs;
    });
  }
  return ds.map((d, k) => ({ d, met: acc[k].met, share: acc[k].met / n, full: acc[k].full, largest: acc[k].largest }));
}

/**
 * The across-many-runs summary, computed once by `cliff()` over RUNS programmes (test/knot.test.js
 * recomputes it): average conditions that can be met at each slider stop, one at a time and with
 * joint closings of knots up to three.
 */
export const CLIFF = {
  one: [40, 39.88, 39.17, 36.72, 31.33, 23.88, 16.55, 11.34, 7.83, 5.55, 3.98, 2.92, 2.14],
  joint: [40, 39.99, 39.79, 38.53, 34.49, 27.22, 18.89, 12.53, 8.33, 5.82, 4.11, 3, 2.18],
};

/**
 * Fixed positions for the figure, so that more links do not move the dots. A force layout of the
 * programme at two links each (links already there at one each pull harder), in a box `aspect`
 * wide and 1 high, with a margin of `pad`.
 */
export function layout(prog, { aspect = 1, d = 2, iterations = 500, pad = 0.04, gravity = 3, pull = 3, gap = 0.055 } = {}) {
  const n = prog.n;
  const links = linksAt(prog, d);
  const strong = linksAt(prog, Math.min(1, d)).length;
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
