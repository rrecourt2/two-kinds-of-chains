<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { DOCS, CLAUSES, N, ANSWER, FEWEST, LAYOUTS, DEALS, MAX_CLAUSES, DEAL_TABLE, chain, ringsThrough } from '../lib/sim/knot.js';
  import { linear, line } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  // A target puzzle: the reader moves clauses after the money until all twelve documents can be
  // signed in order, with as few moved as possible. The summary across many random deals opens
  // once the puzzle is solved or its answer shown.
  const game = getContext('tkc-game');
  const revealed = $derived(!game.isOpen('knot'));

  let moved = $state([]);
  // What the read-out describes: a clause tapped or focused, a document tapped, or nothing.
  let sel = $state(null);
  let width = $state(560);

  const st = $derived(chain(moved));
  const isMoved = (k) => moved.includes(k);
  const LOCKED = CLAUSES.filter((c) => c.lock).length;
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const say = (k) => (k < words.length ? words[k] : String(k));
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
  const ordinal = (k) => ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'][k];
  const rings = (k) => `${say(k)} ring${k === 1 ? '' : 's'}`;
  const who = (k) => `${cap(DOCS[CLAUSES[k].to].the)} waits for ${DOCS[CLAUSES[k].from].the}`;
  const whoNot = (k) => `${cap(DOCS[CLAUSES[k].to].the)} no longer waits for ${DOCS[CLAUSES[k].from].the}`;

  function toggle(k) {
    moved = isMoved(k) ? moved.filter((m) => m !== k) : [...moved, k];
  }
  // A tap reads a clause and, if it can move, moves it after the money or puts it back.
  function act(k) {
    sel = { clause: k };
    if (!CLAUSES[k].lock) toggle(k);
  }

  // The numbers the text quotes, from the model.
  const START = chain([]);
  const SOLVED = chain(ANSWER);
  // Every ring of the deal as signed has one of the two answer clauses on it.
  const answerRings = START.rings.filter((r) => r.some((k) => ANSWER.includes(k)));
  const deal = (m) => DEAL_TABLE.inOrder[m];
  const pctAt = (m) => `${Math.round(deal(m))}%`;
  // The ring the card opens on: the loan and the equity, each waiting for the other.
  const EQ_LOAN = ANSWER[0];
  const LOAN_EQ = CLAUSES.findIndex((c) => c.from === CLAUSES[EQ_LOAN].to && c.to === CLAUSES[EQ_LOAN].from);

  // ---- The drawing ----
  const wide = $derived(width >= 520);
  const lay = $derived(wide ? LAYOUTS.wide : LAYOUTS.tall);
  const fs = $derived(wide ? 12.5 : 11.5);
  const PAD = 12;
  const rowH = $derived(wide ? 92 : 72);
  const H = $derived(lay.rows * rowH + 2 * PAD);
  const cw = $derived((width - 2 * PAD) / lay.cols);
  // Text widths, estimated per character for a semibold sans at the given size.
  const em = (ch) => (/[ilj.,'’:;!|]/.test(ch) ? 0.28 : /[ftr\- ]/.test(ch) ? 0.36 : /[mwMW]/.test(ch) ? 0.86 : /[A-Z]/.test(ch) ? 0.68 : 0.57);
  const textW = (s, size) => [...s].reduce((a, ch) => a + em(ch), 0) * size * 1.04;
  const boxes = $derived(
    DOCS.map((d) => {
      const [c, r] = lay.at[d.key];
      const lines = lay.lines[d.key] ?? [d.name];
      const w = Math.max(...lines.map((l) => textW(l, fs))) + 18;
      const h = lines.length * (fs + 2) + 12;
      const cx = PAD + (c + 0.5) * cw;
      const cy = PAD + (r + 0.5) * rowH;
      return { cx, cy, w, h, x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, lines };
    }),
  );

  const HEAD = 7;
  const inBox = (p, b, m) => Math.abs(p.x - b.cx) <= b.w / 2 + m && Math.abs(p.y - b.cy) <= b.h / 2 + m;
  // Each clause as a gentle quadratic curve from one document's edge to the other's, its head at
  // the document that waits. Two clauses between the same pair bend apart.
  const geoms = $derived(
    CLAUSES.map((c, k) => {
      const a = boxes[c.from];
      const b = boxes[c.to];
      const P0 = { x: a.cx, y: a.cy };
      const P2 = { x: b.cx, y: b.cy };
      const dx = P2.x - P0.x;
      const dy = P2.y - P0.y;
      const len = Math.hypot(dx, dy) || 1;
      const pair = CLAUSES.some((o) => o.from === c.to && o.to === c.from);
      const bend = lay.bend[`${DOCS[c.from].key}-${DOCS[c.to].key}`] ?? (pair ? 0.13 : 0);
      const C = { x: (P0.x + P2.x) / 2 - (dy / len) * bend * len, y: (P0.y + P2.y) / 2 + (dx / len) * bend * len };
      const B = (t) => ({
        x: (1 - t) ** 2 * P0.x + 2 * t * (1 - t) * C.x + t * t * P2.x,
        y: (1 - t) ** 2 * P0.y + 2 * t * (1 - t) * C.y + t * t * P2.y,
      });
      const dB = (t) => ({ x: 2 * (1 - t) * (C.x - P0.x) + 2 * t * (P2.x - C.x), y: 2 * (1 - t) * (C.y - P0.y) + 2 * t * (P2.y - C.y) });
      // Where the curve leaves the first box and meets the second, by bisection.
      const edge = (lo, hi, box, leaving) => {
        for (let i = 0; i < 30; i++) {
          const mid = (lo + hi) / 2;
          if (inBox(B(mid), box, 3) === leaving) lo = mid;
          else hi = mid;
        }
        return (lo + hi) / 2;
      };
      const t0 = edge(0, 0.5, a, true);
      const t1 = edge(0.5, 1, b, false);
      const tip = B(t1);
      const d1 = dB(t1);
      const l1 = Math.hypot(d1.x, d1.y) || 1;
      const ux = d1.x / l1;
      const uy = d1.y / l1;
      const base = { x: tip.x - ux * HEAD, y: tip.y - uy * HEAD };
      const tb = Math.max(t0, t1 - HEAD / l1);
      // The piece of the curve from t0 to tb, as its own quadratic.
      const from = B(t0);
      const end = B(tb);
      const d0 = dB(t0);
      const q = { x: from.x + ((tb - t0) / 2) * d0.x, y: from.y + ((tb - t0) / 2) * d0.y };
      const w = HEAD * 0.55;
      const f = (v) => v.toFixed(1);
      const samples = Array.from({ length: 17 }, (_, i) => B(t0 + ((t1 - t0) * i) / 16));
      return {
        k,
        shaft: `M${f(from.x)} ${f(from.y)}Q${f(q.x)} ${f(q.y)} ${f(end.x)} ${f(end.y)}`,
        head: `M${f(tip.x)} ${f(tip.y)}L${f(base.x - uy * w)} ${f(base.y + ux * w)}L${f(base.x + uy * w)} ${f(base.y - ux * w)}Z`,
        samples,
      };
    }),
  );

  // A padlock sits on each clause that cannot move, at the point of its arrow furthest from the
  // other arrows and the documents.
  const boxGap = (p, b) => Math.hypot(Math.max(0, Math.abs(p.x - b.cx) - b.w / 2), Math.max(0, Math.abs(p.y - b.cy) - b.h / 2));
  const locks = $derived(
    geoms.map((g) => {
      if (!CLAUSES[g.k].lock) return null;
      const room = (p) =>
        Math.min(
          ...boxes.map((b) => boxGap(p, b) + 2),
          ...geoms.filter((o) => o.k !== g.k).flatMap((o) => o.samples.map((q) => Math.hypot(q.x - p.x, q.y - p.y))),
        );
      // On a short arrow the padlock would hide it: it sits beside the arrow instead.
      const [a, b] = [g.samples[0], g.samples[16]];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const cands =
        len < 46
          ? [1, -1].map((side) => ({ x: g.samples[8].x - ((b.y - a.y) / len) * 12 * side, y: g.samples[8].y + ((b.x - a.x) / len) * 12 * side }))
          : g.samples.slice(5, 12);
      return cands.reduce((best, p) => (room(p) > room(best) + 0.5 ? p : best), cands[Math.floor(cands.length / 2)]);
    }),
  );
  const LOCK_R = $derived(wide ? 7.5 : 6.5);

  // A document's place in the chain sits in a small badge on the corner of its box that is
  // furthest from every arrow.
  const badges = $derived(
    boxes.map((b) => {
      const corners = [
        { x: b.x0 + 5, y: b.y0 },
        { x: b.x1 - 5, y: b.y0 },
        { x: b.x0 + 5, y: b.y1 },
        { x: b.x1 - 5, y: b.y1 },
      ];
      const clear = (p) =>
        Math.min(
          ...geoms.flatMap((g) => g.samples.map((s) => Math.hypot(s.x - p.x, s.y - p.y))),
          ...locks.filter(Boolean).map((l) => Math.hypot(l.x - p.x, l.y - p.y) - 4),
        );
      return corners.reduce((best, p) => (clear(p) > clear(best) + 0.5 ? p : best));
    }),
  );

  // The rings the read-out points at: those through the clause or document picked, or, before
  // any tap, the loan and the equity waiting for each other.
  const focus = $derived.by(() => {
    if (sel?.clause !== undefined) return isMoved(sel.clause) ? [] : ringsThrough(sel.clause, moved);
    if (sel?.doc !== undefined) return st.rings.filter((r) => r.some((k) => CLAUSES[k].from === sel.doc));
    if (!sel && !isMoved(EQ_LOAN) && !isMoved(LOAN_EQ)) return st.rings.filter((r) => r.length === 2 && r.includes(EQ_LOAN));
    return [];
  });
  const focusSet = $derived(new Set(focus.flat()));
  const arrowClass = (k) => {
    const kind = isMoved(k) ? 'moved' : st.ringsOf[k] ? 'ring' : 'plain';
    return `arrow ${kind}${focusSet.has(k) ? ' em' : ''}${sel?.clause === k ? ' sel' : ''}`;
  };
  const docClass = (d) => {
    const kind = st.number[d] ? 'signed' : st.onRing[d] ? 'ring' : 'behind';
    return `doc ${kind}${sel?.doc === d ? ' sel' : ''}`;
  };

  // Tap or click: a document's box, or else the nearest arrow within reach.
  let svg = $state();
  function onTap(e) {
    const box = svg.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const d = boxes.findIndex((b) => x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 2);
    if (d >= 0) {
      sel = sel?.doc === d ? null : { doc: d };
      return;
    }
    let best = -1;
    let gap = Infinity;
    for (const g of geoms)
      for (const p of g.samples) {
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < gap) (gap = dist), (best = g.k);
      }
    if (best >= 0 && gap <= (wide ? 14 : 18)) act(best);
  }

  // ---- What the figure shows, in words ----
  const ringPath = (r, startDoc) => {
    const docs = r.map((k) => CLAUSES[k].from);
    const i = Math.max(0, docs.indexOf(startDoc));
    const turn = [...docs.slice(i), ...docs.slice(0, i)];
    return [...turn, turn[0]].map((d) => DOCS[d].name).join(' → ');
  };
  const onRingCount = $derived(st.onRing.filter(Boolean).length);
  const behindNames = $derived(DOCS.filter((_, d) => st.behind[d]).map((d) => d.the));
  const caption = $derived.by(() => {
    if (st.signed === N) return `No rings left: all twelve can be signed in order, with ${say(moved.length)} clause${moved.length === 1 ? '' : 's'} after the money.`;
    const onRing = DOCS.filter((_, d) => st.onRing[d]).map((d) => d.the);
    const lead = onRing.length <= 3 ? `${cap(list(onRing))} are on rings` : `${cap(say(onRing.length))} documents are on rings`;
    const tail = behindNames.length ? `, and ${list(behindNames)} wait${behindNames.length === 1 ? 's' : ''} behind them` : '';
    return `${lead}${tail}. On a ring each document waits for the one before it, so none can go first.`;
  });

  // The rings a clause in force closes, with the shortest one spelled out from the clause itself.
  const onRings = (k) => {
    const rs = ringsThrough(k, moved).sort((p, q) => p.length - q.length);
    if (!rs.length) return 'on no ring';
    const path = ringPath(rs[0], CLAUSES[k].from);
    return rs.length === 1 ? `on one ring: ${path}` : `on ${rings(rs.length)}, such as ${path}`;
  };
  // What moving a clause off every ring did: freed what waited only for it, or nothing.
  const freedBy = (k) => {
    const before = chain(moved.filter((m) => m !== k));
    const freed = DOCS.filter((_, d) => st.number[d] && !before.number[d]).map((d) => d.the);
    return freed.length ? `It was on no ring, but ${list(freed)} no longer wait${freed.length === 1 ? 's' : ''} behind one.` : 'It was on no ring, so nothing more can be signed.';
  };
  const readout = $derived.by(() => {
    if (sel?.clause !== undefined) {
      const k = sel.clause;
      const c = CLAUSES[k];
      const n = ringsThrough(k, moved).length;
      if (c.lock) return { head: who(k), quote: c.text, note: `Cannot move: ${c.lock} It is ${onRings(k)}.` };
      if (isMoved(k))
        return {
          head: whoNot(k),
          quote: c.after,
          note: `After the money, the clause is an undertaking with a deadline. ${n ? `It was on ${rings(n)}; ${n === 1 ? 'it is' : n === 2 ? 'both are' : `all ${say(n)} are`} cut.` : freedBy(k)} Tap again to put it back.`,
        };
      return { head: who(k), quote: c.text, note: `It is ${onRings(k)}. A tap moves it after the money.` };
    }
    if (sel?.doc !== undefined) {
      const d = sel.doc;
      const waits = CLAUSES.filter((c, k) => c.to === d && !isMoved(k)).map((c) => DOCS[c.from].the);
      const what = waits.length ? `It waits for ${list(waits)}.` : 'It waits for nothing.';
      if (st.number[d]) return { head: DOCS[d].name, note: `${what} It is ${ordinal(st.number[d])} in the chain.` };
      if (st.onRing[d]) {
        const r = st.rings.filter((x) => x.some((k) => CLAUSES[k].from === d)).sort((p, q) => p.length - q.length)[0];
        return { head: DOCS[d].name, note: `${what} It is on a ring, ${ringPath(r, d)}, so it cannot go first.` };
      }
      const stuck = CLAUSES.filter((c, k) => c.to === d && !isMoved(k) && !st.number[c.from]).map((c) => DOCS[c.from].the);
      return { head: DOCS[d].name, note: `${what} ${cap(list(stuck))} cannot be signed, so neither can it.` };
    }
    if (st.signed === N && moved.length === FEWEST && ANSWER.every(isMoved))
      return {
        head: 'After the money',
        note: `The sponsors pay in alongside the loan, and the regulator sets a provisional tariff. Between them, the two clauses sat on all ${say(answerRings.length)} rings.`,
      };
    if (!isMoved(EQ_LOAN) && !isMoved(LOAN_EQ))
      return {
        head: 'A ring of two',
        note: `${who(EQ_LOAN)}: “${CLAUSES[EQ_LOAN].text}” ${who(LOAN_EQ)}: “${CLAUSES[LOAN_EQ].text}” Neither can go first.`,
      };
    return { head: '', note: 'Tap an arrow to read its clause, or a document to see what it waits for.' };
  });

  const label = $derived(
    `One deal: twelve documents and twenty clauses. ${st.signed} can be signed in order${st.signed ? `: ${st.order.map((d) => DOCS[d].name).join(', ')}` : ''}. ${caption} The clauses are listed below the figure.`,
  );

  // ---- Across many random deals ----
  const CH = 178;
  const cm = { top: 26, right: 14, bottom: 36, left: 40 };
  const cx = $derived(linear(0, MAX_CLAUSES, cm.left, width - cm.right));
  const cy = linear(0, 100, CH - cm.bottom, cm.top);
  const curve = $derived(line(DEAL_TABLE.inOrder.map((v, m) => [cx(m), cy(v)])));
  const OURS = CLAUSES.length;
  const TIP = N;
  // The label for this deal sits to the right of its point, unless the chart is too narrow.
  // Its label: two short lines above the point, clear of the curve, joined to it by a dotted line;
  // right of the point where there is room, else ending at the chart's edge.
  const oursLabel = $derived(cx(OURS) + 8 + 122 < width ? { x: cx(OURS) + 8, anchor: 'start' } : { x: width - 2, anchor: 'end' });
  // The tipping point's label: one line where it fits, else two.
  const tipLines = $derived(cx(TIP) + 6 + 200 < width ? ['Tipping point: one per document'] : ['Tipping point:', 'one per document']);

  // ---- Puzzle ----
  const puzzle = $derived({
    goal: 'Twenty sensible clauses, and the deal cannot close. Move the fewest clauses after the money so that all twelve can be signed in order.',
    met: st.signed === N && moved.length <= FEWEST,
    progress:
      st.signed === N && moved.length > FEWEST
        ? `All twelve can be signed in order, with ${say(moved.length)} clauses moved. Can ${say(FEWEST)} do it?`
        : '',
    hints: [
      'Any one clause on a ring cuts it, and a clause that sits on several rings cuts them all at once.',
      'One ring runs through the tariff decree, the PPA and the loan: only one of its clauses can move. Then look at the loan, the equity and the co-lender.',
    ],
    found: 'Two clauses, each on several rings: the sponsors pay in alongside the loan, and the regulator sets a provisional tariff.',
  });
  const showAnswer = () => ((moved = [...ANSWER]), (sel = null));
</script>

<Chapter n={14} kicker="Circular conditions" title="A chain tied in a knot" lede="When documents wait for each other, a chain of them ties itself in a knot. A knot has no first link." puzzle="knot">
  {#snippet setup()}
    <p>
      In a co-financed power plant, the sponsors pay in their equity only once the loan is signed, and the loan disburses
      only once the equity is in. Each clause makes sense on its own. Together, they wait for each other for ever.
    </p>
    <p>
      A plant reaches financial close when a dozen documents are signed, from the land lease to the tariff decree, each
      drafted by its own team and checked on its own. Each refers to others, and each such clause is a link: this
      document is signed once that one is. Signed <span class="tkc-idea">one after another</span>, the documents form a
      chain of <span class="tkc-and">ANDs</span>.
    </p>
    <p>Tied back on itself, the chain does not break; it locks.</p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="One deal, twelve documents"
      sub="A power plant’s financial close. Tap an arrow to read its clause and move it; padlocked clauses cannot move."
      rules={[
        'Each arrow is one clause: the document it points to waits for the other.',
        'A document can be signed once everything it waits for is signed.',
        'A clause moved after the money becomes an undertaking with a deadline, not a wait.',
      ]}
    >
      <Puzzle id="knot" {...puzzle} onshow={showAnswer} />

      <div class="tkc-chart net" bind:clientWidth={width}>
        <!-- A tap picks the nearest arrow or document; keyboard and screen-reader users have the list of clauses below. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <svg {width} height={H} role="img" aria-label={label} bind:this={svg} onclick={onTap}>
          <g aria-hidden="true">
            {#each geoms as g (g.k)}
              <g class={arrowClass(g.k)}>
                {#if !isMoved(g.k) && st.ringsOf[g.k]}<path class="glow" d={g.shaft} />{/if}
                <path class="shaft" d={g.shaft} />
                <path class="head" d={g.head} />
              </g>
            {/each}
            {#each geoms as g (g.k)}
              {#if CLAUSES[g.k].lock}
                <g class="lock" class:on={st.ringsOf[g.k] > 0} transform="translate({locks[g.k].x.toFixed(1)} {locks[g.k].y.toFixed(1)})">
                  <circle r={LOCK_R} class="lock-bg" />
                  <path d="M-2.6 -0.6V-2.4A2.6 2.6 0 0 1 2.6 -2.4V-0.6" class="lock-loop" />
                  <rect x="-3.8" y="-0.8" width="7.6" height="5.4" rx="1.2" class="lock-body" />
                </g>
              {/if}
            {/each}
            {#each boxes as b, d (d)}
              <g class={docClass(d)}>
                <rect x={b.x0} y={b.y0} width={b.w} height={b.h} rx="7" />
                {#each b.lines as l, i (i)}
                  <text x={b.cx} y={b.cy + (i - (b.lines.length - 1) / 2) * (fs + 2) + fs * 0.36} text-anchor="middle" style:font-size="{fs}px">{l}</text>
                {/each}
                {#if st.number[d]}
                  <g class="badge" transform="translate({badges[d].x.toFixed(1)} {badges[d].y.toFixed(1)})">
                    <circle r="8.5" />
                    <text y="3.6" text-anchor="middle">{st.number[d]}</text>
                  </g>
                {/if}
              </g>
            {/each}
          </g>
        </svg>
        <div class="tkc-legend">
          <span><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="8" class="key-badge" /><text x="9" y="12.5" text-anchor="middle" class="key-num">1</text></svg>Signed in this order</span>
          <span><svg width="24" height="10" aria-hidden="true"><path d="M1 5H16" class="key-ring" /><path d="M23 5L16 1.5V8.5Z" class="key-ring-head" /></svg>On a ring: none can go first</span>
          <span><span class="key-behind" aria-hidden="true"></span>Waits behind a ring</span>
          <span><svg width="24" height="10" aria-hidden="true"><path d="M1 5H16" class="key-moved" /><path d="M23 5L16 1.5V8.5Z" class="key-moved-head" /></svg>After the money</span>
        </div>
        <p class="state">{caption}</p>
        <p class="tkc-small readout" aria-live="polite">
          {#if readout.head}<strong>{readout.head}</strong>{readout.quote ? ': ' : ' · '}{/if}{#if readout.quote}“{readout.quote}”{' '}{/if}{readout.note}
        </p>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat
          label="Can be signed in order"
          value="{st.signed} of {N}"
          sub={st.signed === N ? 'documents: the whole chain' : `documents; ${say(onRingCount)} on rings${behindNames.length ? `, ${say(behindNames.length)} behind` : ''}`}
          swatch="var(--tkc-ink)"
        />
        <Stat
          label="Moved after the money"
          value={moved.length}
          sub={moved.length ? `of ${CLAUSES.length} clauses, each now an undertaking with a deadline` : `of ${CLAUSES.length} clauses; ${say(LOCKED)} cannot move`}
          swatch="var(--tkc-options)"
        />
      </div>

      <details class="tkc-note clauses">
        <summary>The twenty clauses, as a list</summary>
        <ul>
          {#each CLAUSES as c, k (k)}
            <li>
              <button
                type="button"
                class:moved={isMoved(k)}
                aria-pressed={c.lock ? undefined : isMoved(k)}
                aria-disabled={c.lock ? 'true' : undefined}
                onclick={() => act(k)}
                onfocus={() => (sel = { clause: k })}
              >
                <span class="who">{isMoved(k) ? whoNot(k) : who(k)}</span>
                <span>{isMoved(k) ? c.after : c.text}</span>
                <span class="tag">{c.lock ? 'Cannot move' : isMoved(k) ? 'After the money' : st.ringsOf[k] ? `On ${rings(st.ringsOf[k])}` : 'On no ring'}</span>
              </button>
            </li>
          {/each}
        </ul>
      </details>

      {#if revealed}
        <div class="many">
          <span class="tkc-fig-title small">Across {int(DEALS)} random deals</span>
          <svg {width} height={CH} role="img" aria-label="Share of {int(DEALS)} random deals of twelve documents that can be signed in order: {pctAt(6)} with 6 clauses, {pctAt(12)} with 12, {pctAt(16)} with 16, {pctAt(20)} with 20. The tipping point is at about one clause per document.">
            {#each [0, 50, 100] as v}
              <line class={v === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={width - cm.right} y1={cy(v)} y2={cy(v)} />
              <text class="tkc-axis-label" x={cm.left - 6} y={cy(v) + 4} text-anchor="end">{v}%</text>
            {/each}
            {#each [0, 6, 12, 18, 24, 30] as v}
              <text class="tkc-axis-label" x={cx(v)} y={CH - cm.bottom + 16} text-anchor={v === 0 ? 'start' : v === MAX_CLAUSES ? 'end' : 'middle'}>{v}</text>
            {/each}
            <text class="tkc-axis-title" x="0" y="12">Deals that can be signed in order</text>
            <text class="tkc-axis-title" x={cm.left + (width - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">Clauses between the twelve documents</text>
            <line class="tip" x1={cx(TIP)} x2={cx(TIP)} y1={cm.top} y2={cy(0)} />
            {#each tipLines as l, i (i)}
              <text class="tkc-label-2 tkc-halo" x={cx(TIP) + 6} y={cm.top + 10 + i * 14}>{l}</text>
            {/each}
            <path d={curve} class="avg" />
            <circle cx={cx(OURS)} cy={cy(deal(OURS))} r="4.5" class="pt" />
            <line class="lead" x1={cx(OURS)} x2={cx(OURS)} y1={cy(deal(OURS)) - 6} y2={cy(30) + 4} />
            <text class="tkc-label tkc-halo" x={oursLabel.x} y={cy(42)} text-anchor={oursLabel.anchor}>{OURS} clauses, as here:</text>
            <text class="tkc-label tkc-halo" x={oursLabel.x} y={cy(42) + 15} text-anchor={oursLabel.anchor}>{pctAt(OURS)} in order</text>
          </svg>
          <p class="tkc-caption">Twelve documents; each clause makes one wait for another, drawn at random.</p>
        </div>
      {/if}

      {#snippet model()}
        <p>
          The deal is illustrative: twelve documents and twenty clauses, each simplified to one document waiting for
          another to be signed first. Documents are numbered in the order they can be signed, the earliest in a fixed list
          first when several are free. A ring is a cycle of waits. A search of every set of clauses that can move finds
          that no single clause frees all twelve, and that only one pair does.
        </p>
        <p>
          A random deal puts the 132 possible clauses between twelve documents in a random order; its first {OURS} are a
          deal of {OURS}, so more clauses only add to the same deal. In random networks one knot comes to hold most of the
          nodes past about one link per node (Karp; Łuczak, 1990). Kauffman’s figures: twelve settings of two values each,
          each setting’s contribution depending on others through a random table; 400 designs, 40 teams each.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Follow the arrows from the loan to the tariff decree, on to the PPA and back to the loan: a ring. Each document on it
      waits for the one before it, so none can be signed first, nor anything that waits for the ring.
      All {say(START.rings.length)} rings here run through the loan.
    </p>
    <p>
      Moving a clause after the money keeps its promise and drops its wait: the sponsors still pay in, alongside each
      disbursement instead of before the first, and the tariff still reflects the financing cost, once known. A ring
      holds only while every wait on it holds, so one clause moved gives it a first document. A clause on several rings
      cuts them all; these two sat on all {say(answerRings.length)}.
    </p>
    <p>
      Deal teams know another way out, the joint closing: everyone signs in one room at one moment, so nobody goes first.
      It unties a small ring of private parties, such as the lenders and the sponsors, but not one that runs
      through a law or a regulator, which does not sign on cue at a closing.
    </p>
    <p>
      Across {int(DEALS)} random deals of twelve documents, {pctAt(6)} can be signed in order with six clauses, {pctAt(12)}
      with twelve and {pctAt(20)} with twenty. The documents did not change; the links did. Past about one clause per
      document, a <span class="tkc-idea">tipping point</span>, rings start to share documents and join: at twenty, the
      largest knot holds {say(Math.round(DEAL_TABLE.largest[20]))} documents on average.
    </p>
    <p>
      The biologist Stuart Kauffman found the same cliff in design and called it a complexity catastrophe. When each of
      twelve design choices depends on every other, teams changing one choice at a time almost all stall, at one of some
      315 dead ends. Kept inside modules of four, whose teams try their choices together, dependencies let every team reach the
      best: the watchmakers’ secret.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our conditions wait for each other, across documents never read side by side?">
      <p>
        Conditions are written one document at a time: the loan agreement, the equity subscription, the PPA, the policy
        matrix of a reform loan, each drafted by a different team and checked on its own. A ring between them tends to show
        only at closing, when every party is ready and waiting for another.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .net {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .net > svg {
    display: block;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .state {
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.45;
    color: var(--tkc-ink);
    text-wrap: pretty;
  }
  .readout {
    min-height: 3em;
    text-wrap: pretty;
  }
  .readout strong {
    color: var(--tkc-ink);
  }

  /* Arrows: grey for a clause off every ring, orange on a ring, dashed blue after the money. */
  .shaft {
    fill: none;
    stroke-width: 1.4;
    stroke-linecap: round;
    transition: stroke 160ms ease, stroke-width 160ms ease;
  }
  .plain .shaft {
    stroke: var(--tkc-muted);
  }
  .plain .head {
    fill: var(--tkc-muted);
  }
  .ring .shaft {
    stroke: var(--tkc-conditions);
    stroke-width: 2;
  }
  .ring .head {
    fill: var(--tkc-conditions);
  }
  .glow {
    fill: none;
    stroke: var(--tkc-conditions);
    stroke-opacity: 0.18;
    stroke-width: 8;
    stroke-linecap: round;
  }
  .moved .shaft {
    stroke: var(--tkc-options);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .moved .head {
    fill: var(--tkc-options);
  }
  .em .shaft {
    stroke-width: 3;
  }
  .em .glow {
    stroke-opacity: 0.32;
    stroke-width: 10;
  }
  .sel .shaft {
    stroke-width: 3;
  }
  .lock-bg {
    fill: var(--tkc-surface);
    stroke: var(--tkc-rule);
    stroke-width: 1;
  }
  .lock.on .lock-bg {
    stroke: var(--tkc-conditions);
  }
  .lock-loop {
    fill: none;
    stroke: var(--tkc-ink-2);
    stroke-width: 1.3;
  }
  .lock-body {
    fill: var(--tkc-ink-2);
  }

  /* Documents: numbered in the chain, tinted on a ring, dashed behind one. */
  .doc rect {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.25;
    transition: fill 200ms ease, stroke 200ms ease;
  }
  .doc text {
    fill: var(--tkc-ink);
    font-weight: 600;
  }
  .doc.ring rect {
    fill: color-mix(in srgb, var(--tkc-conditions) 16%, var(--tkc-surface));
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .doc.behind rect {
    stroke: var(--tkc-muted);
    stroke-dasharray: 3 2.5;
  }
  .doc.behind text {
    fill: var(--tkc-muted);
  }
  .doc.sel rect {
    stroke-width: 2.6;
  }
  .badge circle {
    fill: var(--tkc-ink);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
  }
  .badge text {
    fill: var(--tkc-surface);
    font-size: 10.5px;
    font-weight: 700;
  }

  /* Legend keys. */
  .key-badge {
    fill: var(--tkc-ink);
  }
  .key-num {
    fill: var(--tkc-surface);
    font-size: 10.5px;
    font-weight: 700;
  }
  .key-ring {
    stroke: var(--tkc-conditions);
    stroke-width: 2;
  }
  .key-ring-head {
    fill: var(--tkc-conditions);
  }
  .key-moved {
    stroke: var(--tkc-options);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .key-moved-head {
    fill: var(--tkc-options);
  }
  .key-behind {
    display: inline-block;
    width: 20px;
    height: 12px;
    border-radius: 4px;
    border: 1.25px dashed var(--tkc-muted);
  }

  /* The clauses as a list, for the keyboard and screen readers. */
  .clauses ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }
  .clauses button {
    display: grid;
    gap: 1px;
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    border-radius: 8px;
    border: 1px solid var(--tkc-hair);
    background: var(--tkc-surface);
    color: var(--tkc-ink-2);
    font-size: 0.8125rem;
    line-height: 1.4;
    cursor: pointer;
  }
  .clauses button.moved {
    border-color: var(--tkc-options);
    background: var(--tkc-options-wash);
  }
  .clauses button[aria-disabled='true'] {
    cursor: default;
  }
  .clauses .who {
    color: var(--tkc-ink);
    font-weight: 600;
  }
  .clauses .tag {
    color: var(--tkc-muted);
  }

  /* Across many random deals. */
  .many {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding-top: 10px;
    border-top: 1px solid var(--tkc-hair);
  }
  .many svg {
    display: block;
    overflow: visible;
  }
  .small {
    font-size: 0.9375rem;
  }
  .avg {
    fill: none;
    stroke: var(--tkc-ink-2);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .tip {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
    stroke-dasharray: 1 3;
    stroke-linecap: round;
  }
  .lead {
    stroke: var(--tkc-muted);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .pt {
    fill: var(--tkc-ink);
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
</style>
