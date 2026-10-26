<script>
  import { getContext, tick } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { programme, stateAt, trace, layout, placeLabels, NAMES, SEED, N, JOINT, RUNS, LINKS, CLIFF, START, ASKED } from '../lib/sim/knot.js';
  import { linear, line } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  // A prediction. Before the first answer (or a hint) the slider plays up to START links, the part
  // that does not give the answer away; ASKED and beyond, and the summary over many programmes,
  // open after it. The joint closing is there from the start.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('knot'));

  const MAX = LINKS[LINKS.length - 1];
  const named = (name) => NAMES.indexOf(name);
  const EQUITY = named('Equity paid in');
  const LOAN = named('Loan ready to disburse');
  const TARIFF = named('Tariff rise');

  // One programme of forty conditions; the slider adds links to it, never redraws it.
  const prog = programme(SEED);
  let links = $state(START);
  let closing = $state('one');
  let width = $state(560);

  const joint = $derived(closing === 'joint' ? JOINT : 1);
  const s = $derived(stateAt(links, { prog, joint }));
  const stuck = $derived(N - s.metCount);

  // The numbers the puzzle and the text quote, from the figure's own programme.
  const one = stateAt(START, { prog });
  const two = stateAt(ASKED, { prog });
  const oneJoint = stateAt(START, { prog, joint: JOINT });
  const twoJoint = stateAt(ASKED, { prog, joint: JOINT });
  const behindAt = (st) => st.met.filter((m, v) => !m && !st.inKnot[v]).length;
  const at = (key, c) => CLIFF[key][LINKS.indexOf(c)];
  const share = (c) => Math.round((at('one', c) / N) * 100);
  const full = (c) => (at('full', c) < 0.05 ? 'none' : `${Math.round(at('full', c))}%`);

  // The figure opens on the stuck condition furthest behind the knot, its path traced.
  const FIRST = one.met
    .map((m, v) => ({ v, len: trace(one, v).kind === 'behind' ? trace(one, v).path.length : 0 }))
    .reduce((a, b) => (b.len > a.len ? b : a)).v;
  let picked = $state(FIRST);
  const t = $derived(picked === null ? null : trace(s, picked));

  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const say = (k) => (k < words.length ? words[k] : String(k));
  const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const fmtLinks = (v) => (v === 0 ? 'None' : v % 40 === 0 ? `${v} · ${say(v / 40)} each` : `${v}`);

  // ---- The network ----
  const compact = $derived(width < 480);
  const H = $derived(compact ? Math.round(Math.min(330, Math.max(260, width * 1.02))) : 310);
  const r = $derived(compact ? 5.5 : 6.5);
  const head = $derived(compact ? 5 : 6);
  // Positions depend only on the shape of the box, in steps, so a resize does not rerun the layout on every pixel.
  const aspect = $derived(Math.max(0.8, Math.min(2.4, Math.round((width / H) * 5) / 5)));
  const unit = $derived(layout(prog, { aspect }));
  const M = 12;
  const pos = $derived(unit.map((p) => ({ x: M + (p.x / aspect) * (width - 2 * M), y: M + p.y * (H - 2 * M) })));
  // Left to right, for the arrow keys.
  const order = $derived([...pos.keys()].sort((a, b) => pos[a].x - pos[b].x || pos[a].y - pos[b].y));

  function toward(p, q, dist) {
    const ex = q.x - p.x;
    const ey = q.y - p.y;
    const l = Math.hypot(ex, ey) || 1;
    return { x: p.x + (ex / l) * dist, y: p.y + (ey / l) * dist };
  }
  // A gently curved arrow from the condition that waits to the one it waits for, so that two
  // conditions waiting for each other show two arrows, not one line.
  function arrow(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(0.14 * len, 22);
    const c = { x: (a.x + b.x) / 2 - (dy / len) * bend, y: (a.y + b.y) / 2 + (dx / len) * bend };
    const from = toward(a, c, r + 1.5);
    const tip = toward(b, c, r + 1.5);
    const ux = tip.x - c.x;
    const uy = tip.y - c.y;
    const ul = Math.hypot(ux, uy) || 1;
    const hx = ux / ul;
    const hy = uy / ul;
    const base = { x: tip.x - hx * head, y: tip.y - hy * head };
    const w = head * 0.55;
    const f = (v) => v.toFixed(1);
    return {
      line: `M${f(from.x)} ${f(from.y)}Q${f(c.x)} ${f(c.y)} ${f(base.x)} ${f(base.y)}`,
      head: `M${f(tip.x)} ${f(tip.y)}L${f(base.x - hy * w)} ${f(base.y + hx * w)}L${f(base.x + hy * w)} ${f(base.y - hx * w)}Z`,
      full: `M${f(a.x)} ${f(a.y)}Q${f(c.x)} ${f(c.y)} ${f(b.x)} ${f(b.y)}`,
    };
  }

  // The traced path, and the picked condition's own waits.
  const onPath = $derived(new Set(t ? t.path.slice(1).map((w, k) => `${t.path[k]}-${w}`) : []));
  const arrows = $derived(
    s.links.map(([i, j]) => {
      const key = `${i}-${j}`;
      const inside = s.comp[i] === s.comp[j] && s.inKnot[i];
      const kind = inside ? (s.closed[i] ? 'closed' : 'tied') : s.met[j] ? 'plain' : 'blocked';
      const mark = onPath.has(key) ? 'path' : i === picked ? 'own' : t && t.kind !== 'met' ? 'dim' : '';
      return { key, ...arrow(pos[i], pos[j]), kind, mark };
    }),
  );
  // Each knot drawn as one soft shape behind it: its members, the links inside it thickened, and
  // the triangles those links close, so the shape has few holes.
  const shapes = $derived.by(() => {
    const out = [];
    s.sizes.forEach((size, c) => {
      if (size < 2) return;
      const members = s.comp.map((k, v) => (k === c ? v : -1)).filter((v) => v >= 0);
      const inside = s.links.map(([i, j], e) => [i, j, e]).filter(([i, j]) => s.comp[i] === c && s.comp[j] === c);
      const near = new Set(inside.flatMap(([i, j]) => [`${i}-${j}`, `${j}-${i}`]));
      const tris = [];
      for (let a = 0; a < members.length; a++)
        for (let b = a + 1; b < members.length; b++) {
          if (!near.has(`${members[a]}-${members[b]}`)) continue;
          for (let d = b + 1; d < members.length; d++)
            if (near.has(`${members[a]}-${members[d]}`) && near.has(`${members[b]}-${members[d]}`))
              tris.push([members[a], members[b], members[d]].map((v) => `${pos[v].x.toFixed(1)},${pos[v].y.toFixed(1)}`).join(' '));
        }
      out.push({ c, members, inner: inside.map(([, , e]) => arrows[e].full), tris, closed: s.closed[members[0]] });
    });
    return out;
  });

  // Names on the figure: the condition picked, then the equity and the loan, each beside its dot,
  // clear of the box's edge, of each other, and as far as can be of dots and the highlighted links.
  const labels = $derived.by(() => {
    const ids = [...new Set([picked, EQUITY, LOAN].filter((v) => v !== null))];
    const marks = arrows.flatMap((a, e) => {
      const [i, j] = s.links[e];
      const weight = a.mark === 'path' || a.mark === 'own' ? 8 : a.kind === 'tied' || a.kind === 'closed' ? 4 : 1;
      return [0.3, 0.5, 0.7].map((f) => ({ x: pos[i].x + (pos[j].x - pos[i].x) * f, y: pos[i].y + (pos[j].y - pos[i].y) * f, weight }));
    });
    return placeLabels({ ids, pos, text: (v) => NAMES[v], width: (t) => t.length * 6.3 + 4, box: { width, height: H }, r, marks }).map((l) => ({
      ...l,
      picked: l.v === picked,
    }));
  });

  // Tap or click: the nearest condition within reach of the pointer; the picked one again clears it.
  function onTap(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - box.left;
    const my = e.clientY - box.top;
    let best = -1;
    let gap = Infinity;
    pos.forEach((p, v) => {
      const d = Math.hypot(p.x - mx, p.y - my) - r;
      if (d < gap) (gap = d), (best = v);
    });
    if (best >= 0 && gap <= 16) picked = best === picked ? null : best;
  }
  let diagram = $state();
  async function onKey(e) {
    const k = order.indexOf(picked ?? order[0]);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next;
    if (step) next = (k + step + N) % N;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = N - 1;
    else if (e.key === ' ' || e.key === 'Enter') next = k;
    else return;
    e.preventDefault();
    picked = order[next];
    await tick();
    diagram?.querySelector(`[data-v="${picked}"]`)?.focus();
  }
  const stateOf = (v) => (s.closed[v] ? 'signed at a joint closing' : s.met[v] ? 'can be met' : s.inKnot[v] ? 'stuck in a knot' : 'stuck');

  // ---- What the figure shows, in words ----
  const knotsOpen = $derived(s.sizes.filter((size, c) => size > 1 && !s.closed[s.comp.indexOf(c)]));
  const knotsClosed = $derived(s.sizes.filter((size, c) => size > 1 && s.closed[s.comp.indexOf(c)]).length);
  const behind = $derived(behindAt(s));
  const onlyEquityLoan = $derived(s.inKnot[EQUITY] && s.comp[EQUITY] === s.comp[LOAN] && s.sizes[s.comp[EQUITY]] === 2 && s.inKnot.filter(Boolean).length === 2);
  const more = (k, it) => (k ? `, and ${say(k)} more wait${k === 1 ? 's' : ''} behind ${it}` : '');
  const caption = $derived.by(() => {
    if (!s.links.length) return 'No links: every condition can be met at once.';
    if (!knotsOpen.length && !knotsClosed) return 'No knots: every condition can be met, one after another.';
    if (!knotsOpen.length)
      return onlyEquityLoan
        ? 'A joint closing signs the equity and the loan together, and then all forty can be met.'
        : `Joint closings sign each small knot at once: ${s.metCount === N ? 'all forty' : int(s.metCount)} can be met.`;
    if (onlyEquityLoan) return `The equity waits for the loan; the loan waits for the equity. Neither can go first${more(behind, 'them')}.`;
    const K = Math.max(...knotsOpen);
    const lead = knotsOpen.length > 1 ? `${say(knotsOpen.length)} knots, the largest of ${K}` : `A knot of ${K}`;
    const big = joint > 1 && K > JOINT ? ', too many to sign at one closing' : '';
    return `${lead[0].toUpperCase()}${lead.slice(1)}${big}: none of it can go first${more(behind, 'it')}.`;
  });

  const readout = $derived.by(() => {
    if (picked === null || !t) return null;
    const waits = s.out[picked].map((w) => NAMES[w]);
    const first = waits.length ? `waits for ${list(waits)}.` : 'waits for nothing.';
    const chain = (path) => path.map((w) => NAMES[w]).join(' → ');
    let then;
    if (t.kind === 'met') {
      const k = waits.length;
      then = k === 0 ? 'It can be met at once.' : k === 1 ? 'That can be met, so it can too.' : `${k === 2 ? 'Both' : `All ${say(k)}`} can be met, so it can too.`;
    } else if (t.kind === 'closed') {
      const others = s.comp.map((c, v) => (c === s.comp[picked] && v !== picked ? NAMES[v] : null)).filter(Boolean);
      then = `It is in a knot with ${list(others)}: a joint closing signs them together.`;
    } else if (t.kind === 'knot') {
      const size = s.sizes[s.comp[picked]];
      then =
        size === 2
          ? `${NAMES[t.path[1]]} waits for it in turn: a knot of two, and neither can go first.`
          : `It is in a knot of ${size}: ${chain(t.path)}. None of it can go first.`;
    } else {
      then = `Stuck: ${chain(t.path.slice(1))}, which is in a knot.`;
    }
    return { name: NAMES[picked], first, then };
  });

  const label = $derived(
    `Forty conditions of one programme, ${s.links.length} links between them. ${s.metCount} can be met and ${stuck} are stuck. ${caption}`,
  );

  // ---- Across many programmes ----
  const CH = 160;
  const cm = { top: 22, right: 14, bottom: 34, left: 34 };
  const cx = $derived(linear(0, MAX, cm.left, width - cm.right));
  const cy = linear(0, N, CH - cm.bottom, cm.top);
  const curve = (key) => line(LINKS.map((c, k) => [cx(c), cy(CLIFF[key][k])]));
  const onLine = $derived(joint > 1 ? 'joint' : 'one');
  const here = $derived({ x: cx(links), y: cy(at(onLine, links)), v: at(onLine, links) });
  // The label sits above and to the right of the point, clear of the falling curve; without room
  // there (only far to the right, where the curve is low), in the empty top-right corner.
  const hereAt = $derived(
    here.x + 95 < width ? { x: here.x + 8, y: Math.max(cm.top + 10, here.y - 8), anchor: 'start' } : { x: width - cm.right, y: cm.top + 16, anchor: 'end' },
  );

  // ---- Puzzle ----
  const puzzle = {
    goal: `With ${START} links, ${one.metCount} of the ${N} conditions can be met, and a joint closing frees the other ${say(N - one.metCount)}. With ${ASKED} links, how many can?`,
    choices: [
      { value: '28', label: 'About 28' },
      { value: '16', label: 'About 16' },
      { value: '8', label: 'About 8' },
    ],
    answer: '8',
    wrong: (v) =>
      v === '28'
        ? 'Far fewer. With twice the links, knots begin to share conditions and join.'
        : 'Fewer still. Knots that share a condition join, and everything waiting behind them is stuck too.',
    hints: [
      'A condition that waits for a knot is stuck too, however few links it has of its own.',
      `Two knots that share a condition become one. At ${ASKED} links, two per condition, they share often.`,
    ],
    found: `About ${two.metCount}: past one link per condition, small knots join into one of ${two.largest}, too big for any joint closing.`,
  };
  const showAnswer = () => ((links = ASKED), (closing = 'one'), (picked = TARIFF));
</script>

<Chapter n={14} kicker="Circular conditions" title="A chain tied in a knot" lede="When conditions wait for each other, a chain of them ties itself in a knot. A knot has no first link." puzzle="knot">
  {#snippet setup()}
    <p>
      In a co-financed power project, the equity investor pays in only once the loan is ready to disburse, and the loan
      is ready only once the equity is in. Each condition makes sense on its own. Together, they wait for each other for
      ever.
    </p>
    <p>
      Reforms knot in the same way: the tariff rise waits for a new regulator, the regulator for a law, the law for proof
      that tariffs cover costs, which needs the tariff rise. Deal teams untie small knots with a joint closing, where
      everything is signed and paid at once.
    </p>
    <p>
      Each condition waits for everything it lists: a chain of <span class="tkc-and">ANDs</span>. Tied back on itself,
      the chain does not break; it locks. A power plant, its financing and a utility reform can carry forty such
      conditions.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Forty conditions of one programme"
      sub="A power plant, its financing and a utility reform. Tap a condition to see what it waits for."
      rules={[
        'The names are illustrative; the links between them are drawn at random.',
        'A condition can be met once everything it waits for is met.',
        'Conditions that wait for each other, directly or not, form a knot.',
      ]}
    >
      <Puzzle id="knot" {...puzzle} predict onshow={showAnswer} />

      <div class="tkc-controls">
        <Slider
          id="k-links"
          label="Links between them"
          bind:value={links}
          min={0}
          max={MAX}
          step={10}
          format={fmtLinks}
          limit={live ? null : START}
          limitNote="{START + 10} to {MAX} links, and the average over many programmes, open after your first answer."
        />
        <div class="ctl">
          <Segmented
            name="k-small"
            label="Closing"
            bind:value={closing}
            options={[
              { value: 'one', label: 'One at a time' },
              { value: 'joint', label: 'Joint closing' },
            ]}
          />
          <p class="tkc-caption">A joint closing signs a knot of up to {say(JOINT)} at once.</p>
        </div>
      </div>

      <div class="tkc-chart net" bind:clientWidth={width} bind:this={diagram}>
        <!-- Each condition is a radio that takes focus and the arrow keys; a tap picks the nearest one. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
        <svg {width} height={H} role="radiogroup" aria-label={label} onclick={onTap}>
          <g aria-hidden="true">
            {#each shapes as k (k.c)}
              <g class="knot" class:closed={k.closed} style:--w="{2 * (r + 6)}px">
                {#each k.tris as points}<polygon {points} />{/each}
                {#each k.inner as d}<path {d} />{/each}
                {#each k.members as v (v)}<circle cx={pos[v].x} cy={pos[v].y} r={r + 7} />{/each}
              </g>
            {/each}
            {#each arrows as a (a.key)}
              <g class="arrow {a.kind} {a.mark}">
                <path class="shaft" d={a.line} />
                <path class="head" d={a.head} />
              </g>
            {/each}
          </g>
          {#each pos as p, v (v)}
            <circle
              cx={p.x}
              cy={p.y}
              {r}
              class="dot"
              class:met={s.met[v]}
              data-v={v}
              role="radio"
              aria-checked={v === picked}
              aria-label="{NAMES[v]}: {stateOf(v)}"
              tabindex={v === (picked ?? order[0]) ? 0 : -1}
              onkeydown={onKey}
            />
          {/each}
          {#if picked !== null}<circle cx={pos[picked].x} cy={pos[picked].y} r={r + 3.5} class="ring" aria-hidden="true" />{/if}
          <g aria-hidden="true">
            {#each labels as l (l.v)}
              <text class="tkc-label tkc-halo name" class:quiet={!l.picked} x={l.x} y={l.y} text-anchor={l.anchor}>{NAMES[l.v]}</text>
            {/each}
          </g>
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch round" style:background="var(--tkc-options)" aria-hidden="true"></span>Can be met</span>
          <span><span class="tkc-swatch round" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Stuck</span>
          <span><span class="knot-key" aria-hidden="true"></span>{joint > 1 ? 'A knot (blue: signed together)' : 'A knot'}</span>
          <span>
            <svg width="22" height="10" aria-hidden="true"><path d="M1 5H15" class="key-shaft" /><path d="M21 5L15 2V8Z" class="key-head" /></svg>
            Waits for
          </span>
        </div>
        <p class="state">{caption}</p>
        <p class="tkc-small readout">
          {#if readout}<strong>{readout.name}</strong> {readout.first} {readout.then}{:else}Tap a condition to see what it waits for.{/if}
        </p>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Conditions that can be met" value={s.metCount} sub="of {N}; {stuck ? `${stuck} stuck` : 'none stuck'}" swatch="var(--tkc-options)" />
        <Stat
          label="Largest knot"
          value={s.largest > 1 ? `${s.largest}` : 'None'}
          sub={s.largest < 2
            ? 'no conditions wait for each other'
            : !knotsOpen.length
              ? 'conditions, signed together'
              : Math.max(...knotsOpen) === 2
                ? 'conditions; neither can go first'
                : 'conditions; none can go first'}
          swatch="color-mix(in srgb, var({s.largest > 1 && !knotsOpen.length ? '--tkc-options' : '--tkc-conditions'}) 22%, var(--tkc-surface))"
        />
      </div>

      {#if live}
        <div class="many">
          <span class="tkc-fig-title small">Across {int(RUNS)} programmes</span>
          <svg {width} height={CH} role="img" aria-label="Average conditions that can be met, out of {N}, across {int(RUNS)} random programmes: {share(20)}% at 20 links, {share(40)}% at 40, {share(60)}% at 60, {share(80)}% at 80. The tipping point is at 40 links, one per condition.">
            {#each [0, 20, 40] as v}
              <line class={v === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={width - cm.right} y1={cy(v)} y2={cy(v)} />
              <text class="tkc-axis-label" x={cm.left - 6} y={cy(v) + 4} text-anchor="end">{v}</text>
            {/each}
            {#each [0, 40, 80, 120] as v}
              <text class="tkc-axis-label" x={cx(v)} y={CH - cm.bottom + 16} text-anchor={v === 0 ? 'start' : v === MAX ? 'end' : 'middle'}>{v}</text>
            {/each}
            <text class="tkc-axis-title" x="0" y="12">Conditions that can be met, on average</text>
            <text class="tkc-axis-title" x={cm.left + (width - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">Links between the forty</text>
            <line class="tip" x1={cx(START)} x2={cx(START)} y1={cy(at('one', START))} y2={cy(0)} />
            <text class="tkc-label-2 tkc-halo" x={cx(START) - 6} y={cy(6)} text-anchor="end">Tipping point</text>
            {#if joint > 1}<path d={curve('one')} class="avg faint" />{/if}
            <path d={curve(onLine)} class="avg" class:joint={joint > 1} />
            <line class="now" x1={here.x} x2={here.x} y1={cm.top} y2={cy(0)} />
            <circle cx={here.x} cy={here.y} r="4.5" class="pt" class:joint={joint > 1} />
            <text class="tkc-label tkc-halo" x={hereAt.x} y={hereAt.y} text-anchor={hereAt.anchor}>{here.v.toFixed(0)} on average</text>
          </svg>
          <p class="tkc-caption">
            The same rules, {int(RUNS)} random programmes of forty.{#if joint > 1}{' '}Blue: small knots signed at
              joint closings; grey: one at a time.{/if}
          </p>
        </div>
      {/if}

      {#snippet model()}
        <p>
          Each of the 1,560 possible links (one condition waiting for another) gets a random number, and the slider puts
          the first ones in that order in place, so more links only add to the same programme. A knot is a set of
          conditions in which each waits, directly or through others, for every other: a strongly connected component.
          One knot comes to hold most of a random network once there is more than one link per node (Karp; Łuczak, 1990).
          A joint closing meets a knot of up to {say(JOINT)} at once, once everything else it waits for is met. The figure
          is one programme; the averages are over {int(RUNS)}.
        </p>
        <p>
          Kauffman’s figures: twelve settings of two values each; each setting’s contribution depends on itself and on
          others through a random table; 400 designs, 40 teams each, starting from random designs.
        </p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      Between {START} links and {ASKED}, only the number of links changed. Across {int(RUNS)} programmes like this one, the share of conditions that can be met falls from {share(40)}% at 40 links to {share(80)}% at 80, and the programmes that can be met in full, from {full(40)} to {full(80)}.
    </p>
    <p>
      That is a tipping point, like the one on the queues chapter’s curve, and it sits at one link per condition. Below it, knots
      are few and small. Above it, they share conditions and join into one knot that grows until it holds most of the
      programme: {Math.round(at('largest', ASKED))} of the 40, on average, at {ASKED} links. In this programme, the tariff rise,
      the regulator, the law and the proof that tariffs cover costs end up in the same knot as the equity and the loan.
      Software engineers know such a knot as a deadlock.
    </p>
    <p>
      A joint closing unties small knots: here it lets all {oneJoint.metCount} be met at {START} links. At {ASKED} it frees
      {twoJoint.metCount === two.metCount ? 'none' : say(twoJoint.metCount - two.metCount)}, because a knot of {two.largest}
      can only be met all at once, and a law cannot be passed at a closing table. An undertaking with a deadline also cuts a
      knot, by letting one condition follow the money, a move the disbursement chapter returns to.
    </p>
    <p>
      The biologist Stuart Kauffman found the same cliff in design, and called it a complexity catastrophe. When each of
      twelve design choices depends on every other, a hundred teams improving a design one change at a time almost all
      stall at one of some 315 dead ends, where any single change makes things worse; one reaches the best. Three dependencies each, kept inside modules of four whose teams try their choices together, let every team reach it. That is the watchmakers’ secret.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our conditions wait for each other, across documents never read side by side?">
      <p>
        Conditions are written one document at a time: the loan agreement, the equity subscription, the PPA, the policy
        matrix of a reform loan, each drafted by a different team and checked on its own. A knot between them tends to show
        only at closing, when every party is ready and waiting for another.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ctl {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .net {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .net svg {
    display: block;
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
  /* One opaque colour for every piece, so overlaps do not darken: the shape reads as one. */
  .knot {
    --knot: color-mix(in srgb, var(--tkc-conditions) 22%, var(--tkc-surface));
  }
  .knot.closed {
    --knot: color-mix(in srgb, var(--tkc-options) 18%, var(--tkc-surface));
  }
  .knot path {
    fill: none;
    stroke: var(--knot);
    stroke-width: var(--w);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .knot circle,
  .knot polygon {
    fill: var(--knot);
    stroke: var(--knot);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .shaft {
    fill: none;
    stroke-width: 1.1;
    stroke-linecap: round;
    transition: opacity 160ms ease;
  }
  .head {
    transition: opacity 160ms ease;
  }
  .plain .shaft {
    stroke: var(--tkc-muted);
    opacity: 0.55;
  }
  .plain .head {
    fill: var(--tkc-muted);
    opacity: 0.7;
  }
  /* A link to a stuck condition: what holds the waiting one up. */
  .blocked .shaft {
    stroke: var(--tkc-conditions);
    opacity: 0.55;
  }
  .blocked .head {
    fill: var(--tkc-conditions);
    opacity: 0.65;
  }
  .tied .shaft {
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .tied .head {
    fill: var(--tkc-conditions);
  }
  .closed .shaft {
    stroke: var(--tkc-options);
    stroke-width: 1.5;
  }
  .closed .head {
    fill: var(--tkc-options);
  }
  /* The picked condition: its own links in ink, the traced path thick; the rest steps back. */
  .own .shaft {
    stroke: var(--tkc-ink);
    stroke-width: 1.6;
    opacity: 1;
  }
  .own .head {
    fill: var(--tkc-ink);
    opacity: 1;
  }
  .path .shaft {
    stroke: var(--tkc-conditions-ink);
    stroke-width: 2.6;
    opacity: 1;
  }
  .path .head {
    fill: var(--tkc-conditions-ink);
    opacity: 1;
  }
  .path.closed .shaft {
    stroke: var(--tkc-options-ink);
  }
  .path.closed .head {
    fill: var(--tkc-options-ink);
  }
  .dim .shaft,
  .dim .head {
    opacity: 0.2;
  }
  .dot {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
    transition: fill 200ms ease;
    cursor: pointer;
  }
  .dot.met {
    fill: var(--tkc-options);
  }
  .dot:focus {
    outline: none;
  }
  .dot:focus-visible {
    stroke: var(--tkc-focus);
    stroke-width: 3;
  }
  .ring {
    fill: none;
    stroke: var(--tkc-ink);
    stroke-width: 2;
    pointer-events: none;
  }
  .name {
    pointer-events: none;
  }
  .name.quiet {
    fill: var(--tkc-ink-2);
    font-weight: 550;
  }
  .round {
    border-radius: 50%;
  }
  .knot-key {
    display: inline-block;
    width: 18px;
    height: 12px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--tkc-conditions) 22%, var(--tkc-surface));
  }
  .key-shaft {
    stroke: var(--tkc-muted);
    stroke-width: 1.2;
  }
  .key-head {
    fill: var(--tkc-muted);
  }
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
  .avg.joint {
    stroke: var(--tkc-options);
  }
  .avg.faint {
    stroke: var(--tkc-rule);
  }
  .tip {
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
    stroke-dasharray: 1 3;
    stroke-linecap: round;
  }
  .now {
    stroke: var(--tkc-muted);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .pt {
    fill: var(--tkc-ink-2);
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .pt.joint {
    fill: var(--tkc-options);
  }
</style>
