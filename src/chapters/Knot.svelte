<script>
  import { getContext } from 'svelte';
  import Chapter from '../lib/ui/Chapter.svelte';
  import Instrument from '../lib/ui/Instrument.svelte';
  import Slider from '../lib/ui/Slider.svelte';
  import Segmented from '../lib/ui/Segmented.svelte';
  import Stat from '../lib/ui/Stat.svelte';
  import { announce } from '../lib/ui/announce.js';
  import Puzzle from '../lib/ui/Puzzle.svelte';
  import BankNote from '../lib/ui/BankNote.svelte';
  import { programme, stateAt, layout, SEED, N, JOINT, RUNS, LINKS, CLIFF } from '../lib/sim/knot.js';
  import { linear, line } from '../lib/scales.js';
  import { int } from '../lib/format.js';

  // A prediction: the slider opens after the first answer or a hint; "Small knots" once the puzzle is closed.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('knot'));
  const revealed = $derived(!game.isOpen('knot'));

  const START = 1;
  const ANSWER = 2;
  let links = $state(START);
  let small = $state('wait');
  let width = $state(560);

  // One programme of forty conditions; the slider adds links to it, never redraws it.
  const prog = programme(SEED);
  const joint = $derived(revealed && small === 'joint' ? JOINT : 1);
  const s = $derived(stateAt(links, { prog, joint }));
  const stuck = $derived(N - s.metCount);
  const largestClosed = $derived(s.largest > 1 && s.sizes.every((size, c) => size !== s.largest || s.closed[s.comp.indexOf(c)]));

  // The numbers the puzzle and the text quote, from the figure's own programme.
  const one = stateAt(1, { prog });
  const two = stateAt(2, { prog });
  const oneJoint = stateAt(1, { prog, joint: JOINT });
  const twoJoint = stateAt(2, { prog, joint: JOINT });
  const avg = (d, key = 'one') => CLIFF[key][LINKS.indexOf(d)];
  const share = (d) => Math.round((avg(d) / N) * 100);

  const others = (v) => (v === 0 ? 'No others' : `${v} other${v === 1 ? '' : 's'}`);

  // ---- The network ----
  const compact = $derived(width < 480);
  const H = $derived(compact ? Math.round(Math.min(330, Math.max(240, width * 0.98))) : 310);
  const r = $derived(compact ? 5.5 : 6.5);
  const head = $derived(compact ? 5 : 6);
  // Positions depend only on the shape of the box, in steps, so a resize does not rerun the layout on every pixel.
  const aspect = $derived(Math.max(0.8, Math.min(2.4, Math.round((width / H) * 5) / 5)));
  const unit = $derived(layout(prog, { aspect }));
  const M = 12;
  const pos = $derived(unit.map((p) => ({ x: M + (p.x / aspect) * (width - 2 * M), y: M + p.y * (H - 2 * M) })));

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

  const arrows = $derived(
    s.links.map(([i, j]) => {
      const inside = s.comp[i] === s.comp[j] && s.inKnot[i];
      return { key: `${i}-${j}`, ...arrow(pos[i], pos[j]), kind: inside ? (s.closed[i] ? 'closed' : 'loop') : 'plain' };
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
  const label = $derived(
    `Forty conditions; each waits for ${others(links).toLowerCase()} on average, ${s.links.length} links in all. ${s.metCount} can be met and ${stuck} are stuck. ` +
      (s.largest > 1 ? `The largest knot holds ${s.largest} conditions${largestClosed ? ', closed together' : ''}.` : 'There are no knots.'),
  );

  // ---- Across many programmes ----
  const CH = 150;
  const cm = { top: 22, right: 14, bottom: 34, left: 34 };
  const cx = $derived(linear(0, 3, cm.left, width - cm.right));
  const cy = linear(0, N, CH - cm.bottom, cm.top);
  const curve = (key) => line(LINKS.map((d, k) => [cx(d), cy(CLIFF[key][k])]));
  const onLine = $derived(joint > 1 ? 'joint' : 'one');
  const here = $derived({ x: cx(links), y: cy(avg(links, onLine)), v: avg(links, onLine) });
  // The label sits above and to the right of the point, clear of the falling curve; without room
  // there (only far to the right, where the curve is low), in the empty top-right corner.
  const hereAt = $derived(
    here.x + 95 < width ? { x: here.x + 8, y: Math.max(cm.top + 10, here.y - 8), anchor: 'start' } : { x: width - cm.right, y: cm.top + 16, anchor: 'end' },
  );

  // ---- Puzzle ----
  const puzzle = {
    goal: `Each condition waits for one other on average, and ${one.metCount} of the ${N} can be met. If each waits for two, how many can?`,
    choices: [
      { value: '28', label: 'About 28' },
      { value: '16', label: 'About 16' },
      { value: '8', label: 'About 8' },
    ],
    answer: '8',
    wrong: (v) =>
      v === '28'
        ? 'Far fewer. With twice the links, the small loops begin to share conditions.'
        : 'Fewer still. Loops that share a condition join into one knot, and whatever waits for the knot is stuck too.',
    hints: ['A condition that waits for a loop is stuck too, however few links it has of its own.', 'Two loops that share a condition become one knot. With two links each, loops share often.'],
    found: `About ${two.metCount}: past one link each, the loops join into one knot of ${two.largest} conditions, and none of it can be met first.`,
  };
  const showAnswer = () => ((links = ANSWER), (small = 'wait'));
</script>

<Chapter
  n={14}
  kicker="Circular conditions"
  title="A chain looped back on itself"
  lede="A chain of conditions can loop back on itself. A loop has no first link."
  puzzle="knot"
>
  {#snippet setup()}
    <p>
      In a co-financed project, the equity investor pays in only once the loan is ready to disburse, and the loan is
      ready only once the equity is in. Each condition makes sense on its own. Together, they wait for each other for
      ever.
    </p>
    <p>
      Reform programmes knot in the same way. The tariff rise waits for the new regulator, the regulator for a law, and
      the law for proof that tariffs cover costs, which needs the tariff rise. Deal teams untie small loops with a joint
      closing, where everything is signed and paid at once, or with an escrow.
    </p>
    <p>
      Every condition is a link in a chain of <span class="tkc-and">ANDs</span>. When the chain loops back on itself, it
      does not break; it locks. A reform programme can have forty conditions.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument
      title="Forty conditions of one programme"
      sub="An arrow points from a condition to one it waits for. More links are added to the same programme."
      rules={['Forty conditions; each waits for others picked at random.', 'A condition can be met once everything it waits for is met.', 'A loop of waiting is a knot: none of it can be met first.']}
    >
      <Puzzle id="knot" {...puzzle} predict onshow={showAnswer} />

      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Slider id="k-links" label="Each waits for" bind:value={links} min={0} max={3} step={0.25} format={others} />
        {#if revealed}
          <div class="ctl">
            <Segmented
              name="k-small"
              label="Small knots"
              bind:value={small}
              options={[
                { value: 'wait', label: 'Wait' },
                { value: 'joint', label: 'Close together' },
              ]}
            />
            <p class="tkc-caption">A joint closing meets every condition of a knot of up to three at once.</p>
          </div>
        {/if}
      </div>

      <div class="tkc-chart net" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label={label}>
          {#each shapes as k (k.c)}
            <g class="knot" class:closed={k.closed} style:--w="{2 * (r + 6)}px">
              {#each k.tris as points}<polygon {points} />{/each}
              {#each k.inner as d}<path {d} />{/each}
              {#each k.members as v (v)}<circle cx={pos[v].x} cy={pos[v].y} r={r + 7} />{/each}
            </g>
          {/each}
          {#each arrows as a (a.key)}
            <g class="arrow {a.kind}">
              <path class="shaft" d={a.line} />
              <path class="head" d={a.head} />
            </g>
          {/each}
          {#each pos as p, v (v)}
            <circle cx={p.x} cy={p.y} {r} class="dot" class:met={s.met[v]} />
          {/each}
        </svg>
        <div class="tkc-legend">
          <span><span class="tkc-swatch round" style:background="var(--tkc-options)" aria-hidden="true"></span>Can be met</span>
          <span><span class="tkc-swatch round" style:background="var(--tkc-conditions)" aria-hidden="true"></span>Stuck</span>
          <span><span class="knot-key" aria-hidden="true"></span>A knot</span>
          <span>
            <svg width="22" height="10" aria-hidden="true"><path d="M1 5H15" class="key-shaft" /><path d="M21 5L15 2V8Z" class="key-head" /></svg>
            Waits for
          </span>
        </div>
      </div>

      <div class="tkc-stats two" use:announce>
        <Stat label="Conditions that can be met" value={s.metCount} sub="of {N}; {stuck ? `${stuck} stuck` : 'none stuck'}" swatch="var(--tkc-options)" />
        <Stat
          label="Largest knot"
          value={s.largest > 1 ? `${s.largest}` : 'None'}
          sub={s.largest < 2 ? 'no loops of waiting' : largestClosed ? 'conditions, closed together' : 'conditions; none can be met first'}
          swatch="color-mix(in srgb, var(--tkc-conditions) 16%, var(--tkc-surface))"
        />
      </div>

      {#if live}
        <div class="many">
          <span class="tkc-fig-title small">Across {int(RUNS)} programmes</span>
          <svg {width} height={CH} role="img" aria-label="Average conditions that can be met, out of {N}, across {int(RUNS)} random programmes: {share(0.5)}% at half a link each, {share(1)}% at one, {share(1.5)}% at one and a half, {share(2)}% at two.">
            {#each [0, 20, 40] as t}
              <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={cm.left} x2={width - cm.right} y1={cy(t)} y2={cy(t)} />
              <text class="tkc-axis-label" x={cm.left - 6} y={cy(t) + 4} text-anchor="end">{t}</text>
            {/each}
            {#each [0, 1, 2, 3] as t}
              <text class="tkc-axis-label" x={cx(t)} y={CH - cm.bottom + 16} text-anchor={t === 0 ? 'start' : t === 3 ? 'end' : 'middle'}>{t}</text>
            {/each}
            <text class="tkc-axis-title" x="0" y="12">Conditions that can be met, on average</text>
            <text class="tkc-axis-title" x={cm.left + (width - cm.left - cm.right) / 2} y={CH - 4} text-anchor="middle">Others each condition waits for</text>
            {#if joint > 1}<path d={curve('one')} class="avg faint" />{/if}
            <path d={curve(onLine)} class="avg" class:joint={joint > 1} />
            <line class="now" x1={here.x} x2={here.x} y1={cm.top} y2={cy(0)} />
            <circle cx={here.x} cy={here.y} r="4.5" class="pt" class:joint={joint > 1} />
            <text class="tkc-label tkc-halo" x={hereAt.x} y={hereAt.y} text-anchor={hereAt.anchor}>{here.v.toFixed(0)} on average</text>
          </svg>
          <p class="tkc-caption">
            The same rules, {int(RUNS)} random programmes of forty.{#if joint > 1}{' '}Blue: small knots closed
              together; grey: one at a time.{/if}
          </p>
        </div>
      {/if}

      {#snippet model()}
        <p>
          Each of the 1,560 possible links (one condition waiting for another) gets a random number, and is in place when
          that number is below the links per condition divided by 39, so more links only add to the same programme. A
          knot is a set of conditions in which each waits, directly or through others, for every other: a strongly
          connected component. A joint closing meets a knot of up to three at once, when everything else it waits for is
          met. The figure is one programme; the averages are over {int(RUNS)}.
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
      Between one link each and two, only the number of links changed. Across {int(RUNS)} programmes
      like this one, the share that can be met falls from {share(0.5)}% at half a link each to {share(1)}% at one,
      {share(1.5)}% at one and a half and {share(2)}% at two. Programmes met in full fall from 83% to 32%, 4% and none.
    </p>
    <p>
      Below one link each, loops are few and small. Above it, they share conditions and join into one knot that grows
      until it holds most of the programme: 25 of the 40, on average, at two links each. Mathematicians mapped this
      threshold in random networks in 1990; software engineers call a knot a deadlock.
    </p>
    <p>
      A joint closing unties small knots: here it lets all {oneJoint.metCount} be met at one link each. At two it frees {twoJoint.metCount === two.metCount ? 'none' : twoJoint.metCount - two.metCount}, because a
      knot that big can only be met all at once. An undertaking with a deadline also cuts a loop, by letting one
      condition follow the money, as in the disbursement chapter.
    </p>
    <h3>The complexity catastrophe</h3>
    <p>
      The biologist Stuart Kauffman found the same cliff in design. Picture a lending product with twelve design
      choices, each working well or badly depending on others, and a hundred teams improving it one change at a time.
      With no dependencies, all hundred reach the best design; with three each, 15 do; with every choice tied to every
      other, one does, and the rest stop at one of some 315 dead ends, where any single change makes things worse. He
      called it a complexity catastrophe; Daniel Levinthal later found the same in firms. Kept inside modules of four, with each
      module’s team trying its choices together, the same dependencies let all hundred reach the best. That is the
      watchmakers’ secret.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Which of our conditions wait for each other, across documents never read side by side?">
      <p>
        Conditions are written one document at a time: the loan agreement, the equity subscription, the policy matrix of a
        reform loan, each drafted by a different team and checked on its own. A loop between them tends to show only at
        closing, when every party is ready and waiting for another.
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
  .net svg {
    display: block;
  }
  /* One opaque colour for every piece, so overlaps do not darken: the shape reads as one. */
  .knot {
    --knot: color-mix(in srgb, var(--tkc-conditions) 16%, var(--tkc-surface));
  }
  .knot.closed {
    --knot: color-mix(in srgb, var(--tkc-options) 14%, var(--tkc-surface));
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
  }
  .plain .shaft {
    stroke: var(--tkc-muted);
    opacity: 0.55;
  }
  .plain .head {
    fill: var(--tkc-muted);
    opacity: 0.7;
  }
  .loop .shaft {
    stroke: var(--tkc-conditions);
    stroke-width: 1.5;
  }
  .loop .head {
    fill: var(--tkc-conditions);
  }
  .closed .shaft {
    stroke: var(--tkc-options);
    stroke-width: 1.5;
  }
  .closed .head {
    fill: var(--tkc-options);
  }
  .dot {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
    stroke-width: 1.5;
    transition: fill 200ms ease;
  }
  .dot.met {
    fill: var(--tkc-options);
  }
  .round {
    border-radius: 50%;
  }
  .knot-key {
    display: inline-block;
    width: 18px;
    height: 12px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--tkc-conditions) 16%, var(--tkc-surface));
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
