// A chain tied in a knot. One power deal: twelve documents and twenty clauses between them.
// A clause makes one document wait for another to be signed first. Documents are signed one at a
// time, each once everything it waits for is signed; that order is the chain. Clauses that close a
// ring (the PPA waits for the decree, the decree for the loan, the loan for the PPA) leave no first
// document, so nothing on the ring can be signed, nor anything that waits for it. A clause moved
// after the money becomes an undertaking with a deadline: it still binds, but nothing waits for it.
//
// Also random deals of twelve documents (how often a deal can be signed in order, against the
// number of clauses), and Kauffman's NK model, for the complexity catastrophe the chapter ends on.
import { makeRng } from './rng.js';

/**
 * The twelve documents, in the order the chain takes when it has a choice (land first, the loan's
 * own circle last). `the` is the name in a sentence.
 */
export const DOCS = [
  { key: 'land', name: 'Land lease', the: 'the land lease' },
  { key: 'permit', name: 'Permit', the: 'the permit' },
  { key: 'epc', name: 'EPC contract', the: 'the EPC contract' },
  { key: 'insurance', name: 'Insurance', the: 'the insurance' },
  { key: 'tariff', name: 'Tariff decree', the: 'the tariff decree' },
  { key: 'ppa', name: 'PPA', the: 'the PPA' },
  { key: 'guarantee', name: 'Guarantee', the: 'the guarantee' },
  { key: 'security', name: 'Security', the: 'the security' },
  { key: 'loan', name: 'Loan', the: 'the loan' },
  { key: 'colender', name: 'Co-lender', the: 'the co-lender' },
  { key: 'equity', name: 'Equity', the: 'the equity' },
  { key: 'hedge', name: 'Hedge', the: 'the hedge' },
];
export const N = DOCS.length;
const at = Object.fromEntries(DOCS.map((d, i) => [d.key, i]));

/**
 * The twenty clauses. `from` is signed first and `to` waits for it. A clause that can move after
 * the money has `after`, its new wording as an undertaking with a deadline; one that cannot has
 * `lock`, the reason.
 */
const C = (from, to, text, rest) => ({ from: at[from], to: at[to], text, ...rest });
export const CLAUSES = [
  C('equity', 'loan', 'The loan disburses only once the sponsors’ equity is paid in.', {
    after: 'The sponsors pay in alongside the loan, within 30 days of each disbursement, backed by a letter of credit.',
  }),
  C('loan', 'equity', 'The sponsors pay in their equity only once the loan is signed.', {
    after: 'The sponsors pay in now, and may take it back if the first disbursement has not come within 90 days.',
  }),
  C('loan', 'colender', 'The co-lender signs only once the lead loan is signed, on the same terms.', {
    after: 'The co-lender signs now; its terms are matched to the loan’s within 30 days of the first disbursement.',
  }),
  C('colender', 'equity', 'The sponsors pay in only once all the debt is signed, the co-lender’s included.', {
    after: 'The sponsors pay in now, and may stop if the co-lender has not signed within 30 days of the first disbursement.',
  }),
  C('loan', 'tariff', 'The regulator sets the tariff only once the plant’s financing cost is known.', {
    after: 'The regulator sets a provisional tariff, adjusted to the financing cost within 90 days of the first disbursement.',
  }),
  C('tariff', 'ppa', 'The utility signs the PPA only at a tariff the regulator has set.', {
    lock: 'by law, a utility may buy power only at a regulated tariff.',
  }),
  C('ppa', 'loan', 'The loan disburses only once the PPA is signed.', {
    lock: 'the PPA is what repays the loan; no lender pays out without it.',
  }),
  C('ppa', 'guarantee', 'The government guarantees the utility’s payments only once the PPA is signed.', {
    lock: 'until the PPA is signed, there is nothing to guarantee.',
  }),
  C('guarantee', 'loan', 'The loan disburses only once the government guarantee is issued.', {
    after: 'The guarantee is issued within 90 days of the first disbursement.',
  }),
  C('ppa', 'security', 'The PPA is pledged to the lenders, so the security waits for it.', {
    after: 'The PPA joins the security within 30 days of the first disbursement.',
  }),
  C('security', 'loan', 'The loan disburses only once the security is registered.', {
    lock: 'money paid out before the security is registered is unsecured.',
  }),
  C('land', 'permit', 'The environmental permit is issued only for land the project holds.', {
    lock: 'by law, a permit needs a site.',
  }),
  C('permit', 'epc', 'The EPC contract takes effect only once the permit is issued.', {
    lock: 'by law, no works start without a permit.',
  }),
  C('land', 'security', 'The mortgage over the site waits for the land lease.', {
    lock: 'until the lease is signed, there is nothing to mortgage.',
  }),
  C('epc', 'insurance', 'The works are insured only once the EPC contract defines them.', {
    after: 'A provisional cover now, and the full policy within 30 days of the first disbursement.',
  }),
  C('insurance', 'loan', 'The loan disburses only once the works are insured.', {
    after: 'The works are insured within 30 days of the first disbursement, before they start.',
  }),
  C('loan', 'hedge', 'The rate hedge is struck only once the loan is signed, to match it.', {
    after: 'The hedge is struck on the expected loan, and matched to it within 30 days of the first disbursement.',
  }),
  C('guarantee', 'colender', 'The co-lender signs only once the government guarantee is issued.', {
    after: 'The co-lender signs now, and may withdraw if the guarantee is not issued within 90 days of the first disbursement.',
  }),
  C('land', 'ppa', 'The PPA names the site, so it waits for the land lease.', {
    after: 'The PPA is signed now, and lapses if the lease is not signed within 60 days of the first disbursement.',
  }),
  C('epc', 'security', 'The EPC contract is pledged to the lenders, so the security waits for it.', {
    after: 'The EPC contract joins the security within 30 days of the first disbursement.',
  }),
];
export const MOVABLE = CLAUSES.map((c, k) => k).filter((k) => !CLAUSES[k].lock);
const clauseOf = (from, to) => CLAUSES.findIndex((c) => c.from === at[from] && c.to === at[to]);
/** The intended answer: the equity goes in alongside the loan, and the tariff is provisional. */
export const ANSWER = [clauseOf('equity', 'loan'), clauseOf('loan', 'tariff')];

/** The clauses still in force: every clause not moved after the money. */
const active = (moved) => {
  const m = new Set(moved);
  return CLAUSES.map((c, k) => k).filter((k) => !m.has(k));
};

/**
 * Elementary rings among the clauses in force, each as the list of its clause indices in order
 * round the ring, starting from its lowest document. Small graph: a plain depth-first search.
 */
export function rings(moved = []) {
  const live = active(moved);
  const out = Array.from({ length: N }, () => []);
  for (const k of live) out[CLAUSES[k].from].push(k);
  const found = [];
  for (let s = 0; s < N; s++) {
    const path = [];
    const on = new Set([s]);
    const walk = (v) => {
      for (const k of out[v]) {
        const w = CLAUSES[k].to;
        if (w < s) continue;
        if (w === s) {
          found.push([...path, k]);
          continue;
        }
        if (on.has(w)) continue;
        on.add(w);
        path.push(k);
        walk(w);
        path.pop();
        on.delete(w);
      }
    };
    walk(s);
  }
  return found;
}

/**
 * The deal with some clauses moved after the money. Documents are numbered in the order they can
 * be signed, one at a time, taking the earliest in DOCS whenever several are free; `number[d]` is
 * 0 for a document that cannot be signed. A document that cannot be signed is on a ring (`onRing`)
 * or waits, directly or through others, for one (`behind`). `ringsOf[k]` counts the rings clause k
 * lies on among the clauses in force (0 for a moved clause).
 */
export function chain(moved = []) {
  const live = active(moved);
  const waits = Array.from({ length: N }, () => []);
  for (const k of live) waits[CLAUSES[k].to].push(CLAUSES[k].from);
  const number = new Array(N).fill(0);
  const order = [];
  for (;;) {
    const next = DOCS.findIndex((_, d) => !number[d] && waits[d].every((w) => number[w]));
    if (next < 0) break;
    order.push(next);
    number[next] = order.length;
  }
  const all = rings(moved);
  const onRing = new Array(N).fill(false);
  const ringsOf = new Array(CLAUSES.length).fill(0);
  for (const r of all)
    for (const k of r) {
      ringsOf[k]++;
      onRing[CLAUSES[k].from] = true;
    }
  const behind = number.map((n, d) => !n && !onRing[d]);
  return { number, order, signed: order.length, onRing, behind, rings: all, ringsOf, moved: [...moved] };
}

/** Every set of `size` movable clauses that, moved after the money, lets all twelve be signed. */
export function solutions(size) {
  const out = [];
  const pick = (start, chosen) => {
    if (chosen.length === size) {
      if (chain(chosen).signed === N) out.push([...chosen]);
      return;
    }
    for (let i = start; i < MOVABLE.length; i++) pick(i + 1, [...chosen, MOVABLE[i]]);
  };
  pick(0, []);
  return out;
}

/** The fewest clauses that must move, by exhaustive search. */
export function fewest(limit = 4) {
  for (let size = 0; size <= limit; size++) if (solutions(size).length) return size;
  return Infinity;
}
export const FEWEST = 2;

/** The rings a clause would close if it were in force, given the other moves. */
export function ringsThrough(k, moved = []) {
  return rings(moved.filter((m) => m !== k)).filter((r) => r.includes(k));
}

// ---- Two drawings of the deal ----
// Unit positions on a grid of `cols` by `rows` cells; each document sits at the centre of a cell
// (fractions allowed). `bend` curves an arrow (a fraction of its length, to its left as drawn);
// two clauses between the same pair of documents bend apart. `lines` splits a long name.
export const LAYOUTS = {
  wide: {
    cols: 5,
    rows: 3,
    at: {
      land: [0, 0],
      permit: [0, 1],
      epc: [0, 2],
      ppa: [1, 0],
      security: [1, 1],
      insurance: [1, 2],
      tariff: [2, 1],
      loan: [2, 2],
      guarantee: [3, 0],
      colender: [4, 0],
      equity: [3.6, 1.15],
      hedge: [4, 2],
    },
    bend: {},
    lines: {},
  },
  tall: {
    cols: 3,
    rows: 5,
    at: {
      land: [0, 0],
      permit: [1, 0],
      epc: [2, 0],
      ppa: [0, 1],
      security: [1, 1],
      insurance: [2, 1],
      tariff: [1, 2],
      loan: [2, 2],
      guarantee: [0, 3],
      colender: [0, 4],
      equity: [1.15, 3.6],
      hedge: [2, 4],
    },
    bend: {},
    lines: { land: ['Land', 'lease'], epc: ['EPC', 'contract'], tariff: ['Tariff', 'decree'] },
  },
};

// ---- Random deals ----

/** A random deal: every possible clause between twelve documents in a random order; the first m make a deal of m clauses. */
export function randomDeal(seed, n = N) {
  const rng = makeRng(seed);
  const pairs = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) pairs.push({ a, b, u: rng() });
  pairs.sort((x, y) => x.u - y.u);
  return pairs.map(({ a, b }) => [a, b]);
}

/** How many of n documents can be signed, one at a time, with these clauses ([first, waits]). */
export function signable(n, clauses) {
  const waits = Array.from({ length: n }, () => []);
  for (const [a, b] of clauses) waits[b].push(a);
  const done = new Array(n).fill(false);
  let count = 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (let d = 0; d < n; d++)
      if (!done[d] && waits[d].every((w) => done[w])) {
        done[d] = true;
        count++;
        changed = true;
      }
  }
  return count;
}

/** Largest set of documents tied together by rings (a strongly connected component). */
export function largestKnot(n, clauses) {
  const out = Array.from({ length: n }, () => []);
  for (const [a, b] of clauses) out[a].push(b);
  let index = 0;
  let best = 1;
  const idx = new Array(n).fill(-1);
  const low = new Array(n).fill(0);
  const on = new Array(n).fill(false);
  const stack = [];
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
      let size = 0;
      let w;
      do {
        w = stack.pop();
        on[w] = false;
        size++;
      } while (w !== v);
      best = Math.max(best, size);
    }
  };
  for (let v = 0; v < n; v++) if (idx[v] < 0) strong(v);
  return best;
}

/** The fewest clauses to move so that a deal can be signed in order (minimum feedback arc set, over orders of the documents). */
export function fewestCuts(n, clauses) {
  const waitsOn = new Array(n).fill(0);
  for (const [a, b] of clauses) waitsOn[b] |= 1 << a;
  const full = 1 << n;
  const best = new Int32Array(full).fill(1 << 30);
  best[0] = 0;
  for (let s = 0; s < full; s++) {
    if (best[s] === 1 << 30) continue;
    for (let v = 0; v < n; v++) {
      if (s & (1 << v)) continue;
      let x = waitsOn[v] & ~s;
      let c = 0;
      for (; x; c++) x &= x - 1;
      const t = s | (1 << v);
      if (best[s] + c < best[t]) best[t] = best[s] + c;
    }
  }
  return best[full - 1];
}

/** Random deals in the summary, and the most clauses on its axis. */
export const DEALS = 1000;
export const MAX_CLAUSES = 30;

/**
 * The summary, computed once by `randomDeals()` (test/knot.test.js recomputes it): for 0…30
 * clauses, the percentage of deals that can be signed in order, and the average size of the
 * largest knot, in documents.
 */
export const DEAL_TABLE = {
  inOrder: [100, 100, 98.9, 97.8, 95.5, 91.1, 84.1, 78.1, 70.8, 64.1, 55.2, 46.1, 37.1, 28.8, 21.2, 16.5, 12.6, 9.4, 6.1, 4.1, 2.3, 1.4, 0.8, 0.7, 0.5, 0.2, 0.2, 0.1, 0.1, 0.1, 0],
  largest: [1, 1, 1.01, 1.02, 1.05, 1.1, 1.2, 1.29, 1.42, 1.57, 1.77, 2.01, 2.3, 2.66, 3.06, 3.51, 3.98, 4.5, 5.02, 5.55, 6.14, 6.77, 7.25, 7.8, 8.26, 8.72, 9.09, 9.49, 9.82, 10.07, 10.37],
};

/**
 * Across `runs` random deals of twelve documents: for each number of clauses 0…max, the share of
 * deals that can be signed in order, the average share of documents that can be signed, and the
 * average size of the largest knot.
 */
export function randomDeals({ runs = DEALS, max = MAX_CLAUSES, n = N } = {}) {
  const rows = Array.from({ length: max + 1 }, (_, m) => ({ clauses: m, inOrder: 0, signable: 0, largest: 0 }));
  for (let s = 1; s <= runs; s++) {
    const deal = randomDeal(s, n);
    for (let m = 0; m <= max; m++) {
      const cl = deal.slice(0, m);
      const k = signable(n, cl);
      rows[m].inOrder += (k === n) / runs;
      rows[m].signable += k / n / runs;
      rows[m].largest += largestKnot(n, cl) / runs;
    }
  }
  return rows;
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
