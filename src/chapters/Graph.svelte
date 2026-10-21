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
  import { STRUCTURES, structure, outputCurve, singlePoints, TEAM_SIZE } from '../lib/sim/scale.js';
  import { watchmakers } from '../lib/sim/watchmakers.js';
  import { linear, line, ticks, barRight } from '../lib/scales.js';
  import { int, pct } from '../lib/format.js';

  const MAX = 60;
  let nodes = $state(24);
  let kind = $state('mesh');
  let what = $state('people');
  let interrupt = $state(10); // tenths of a percent per part
  let diagramW = $state(320);
  let width = $state(560);
  let watchW = $state(360);
  let hover = $state(null);

  const sys = $derived(what === 'systems');
  const now = $derived(structure(kind, nodes));
  const spof = $derived(singlePoints(kind, nodes));
  const COLORS = { mesh: 'var(--tkc-conditions)', hub: 'var(--tkc-ink-2)', teams: 'var(--tkc-options)' };
  const labelOf = (s) => (sys ? s.systems : s.label);
  const curves = STRUCTURES.map((s) => ({ ...s, values: outputCurve(s.id, MAX) }));

  // Diagram of required links for the structure on show.
  const size = $derived(Math.min(340, diagramW));
  const graph = $derived.by(() => {
    const c = size / 2;
    const R = size / 2 - 14;
    const pts = [];
    const edges = [];
    if (kind === 'mesh' || kind === 'hub') {
      const ring = kind === 'hub' ? nodes - 1 : nodes;
      for (let i = 0; i < ring; i++) {
        const a = (2 * Math.PI * i) / ring - Math.PI / 2;
        pts.push({ x: c + R * Math.cos(a), y: c + R * Math.sin(a), key: false });
      }
      if (kind === 'hub') {
        pts.push({ x: c, y: c, key: true });
        for (let i = 0; i < ring; i++) edges.push([i, ring]);
      } else {
        for (let i = 0; i < ring; i++) for (let j = i + 1; j < ring; j++) edges.push([i, j]);
      }
    } else {
      const sizes = now.sizes;
      const T = sizes.length;
      const big = T === 1 ? 0 : R * 0.68;
      const small = T === 1 ? R * 0.6 : Math.min(R * 0.3, (Math.PI * big) / T - 6);
      const leads = [];
      sizes.forEach((s, t) => {
        const a = (2 * Math.PI * t) / T - Math.PI / 2;
        const tx = c + big * Math.cos(a);
        const ty = c + big * Math.sin(a);
        const first = pts.length;
        for (let k = 0; k < s; k++) {
          const b = a + Math.PI + (2 * Math.PI * k) / s;
          pts.push({ x: tx + small * Math.cos(b), y: ty + small * Math.sin(b), key: k === 0 && T > 1 });
        }
        for (let i = 0; i < s; i++) for (let j = i + 1; j < s; j++) edges.push([first + i, first + j]);
        leads.push(first);
      });
      for (let i = 0; i < leads.length; i++) for (let j = i + 1; j < leads.length; j++) edges.push([leads[i], leads[j]]);
    }
    return { pts, edges };
  });

  // Output curves.
  const H = 220;
  const m = { top: 16, right: 18, bottom: 38, left: 40 };
  const x = $derived(linear(1, MAX, m.left, width - m.right));
  const y = linear(0, 55, H - m.bottom, m.top);
  const paths = $derived(curves.map((c) => ({ ...c, d: line(c.values.slice(0, reach).map((v, i) => [x(i + 1), y(v)])) })));

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    hover = Math.max(1, Math.min(reach, Math.round(x.invert(e.clientX - box.left + m.left))));
  }

  // Watchmakers.
  const w = $derived(watchmakers(interrupt / 1000));
  const watchInner = $derived(Math.max(0, watchW - 30)); // the figure's clientWidth includes its padding
  const wx = $derived(linear(0, 10, 92, Math.max(140, watchInner - 60)));
  const every = (perMonth) => {
    if (perMonth >= 1) return `${perMonth.toFixed(1)} a month`;
    const months = 1 / perMonth;
    if (months < 24) return `one every ${Math.round(months)} months`;
    const years = months / 12;
    return years > 1000 ? 'almost never' : `one every ${Math.round(years)} years`;
  };

  const puzzle = {
    goal: 'Sixty people must each work closely with all the others, and each of those links takes 2% of both people’s time. How much useful work do the sixty produce?',
    choices: [
      { value: '48', label: 'About 48 people’s worth: each link costs only 2%' },
      { value: '25', label: 'About 25 people’s worth' },
      { value: '12', label: 'About 12 people’s worth' },
      { value: '0', label: 'Nothing at all' },
    ],
    answer: '0',
    wrong: () => 'Count the links each person has, and what they cost. The figure can check it: everyone linked, 60 people.',
    hints: ['Each person keeps up a link with every one of the other 59.', '59 links at 2% each: how much time is left for work?'],
    found: 'Nothing at all. Each person has 59 colleagues to keep up with, and at 2% each that is more than all of their time.',
  };
  // A prediction: the controls open, and the curves run to 60, after the first answer or a hint.
  const game = getContext('tkc-game');
  const live = $derived(game.engaged('graph'));
  const reach = $derived(live ? MAX : nodes);
</script>

<Chapter
  n={13}
  kicker="Graph theory"
  title="The shape of the network"
  lede="Every chapter so far has been about a network. Its shape, more than its size, decides whether growth makes an organization smarter or slower."
  puzzle="graph"
>
  {#snippet setup()}
    <p>
      Graph theory is the mathematics of dots and lines. It describes anything made of parts and links: people and their dependencies, systems and their data feeds, banks and their exposures.
    </p>
    <p>
      A chain of sign-offs is a path, and stand-ins are parallel paths. Linked systems pass problems along their links,
      and the banks of 2008 passed losses along theirs.
    </p>
    <p>
      Graph theory also explains what happens with scale. If everyone must link to everyone else, the number of links
      grows far faster than the group: 10 people have 45 pairs, 50 have 1,225.
    </p>
  {/snippet}

  {#snippet figure()}
    <Instrument title="Grow the network" sub="Each required link costs both ends 2% of their capacity.">
      <Puzzle id="graph" {...puzzle} onshow={() => ((kind = 'mesh'), (nodes = 60), (what = 'people'))} />
      {#if !live}<p class="tkc-wait-note">The controls open after your first answer, or a hint.</p>{/if}
      <div class="tkc-controls" class:tkc-wait={!live} inert={live ? undefined : true}>
        <Segmented
          name="g-what"
          label="The nodes are"
          bind:value={what}
          options={[
            { value: 'people', label: 'People' },
            { value: 'systems', label: 'Systems' },
          ]}
        />
        <Slider id="g-nodes" label={sys ? 'Systems' : 'People'} bind:value={nodes} min={2} max={MAX} />
        <Segmented name="g-kind" label="Shape" bind:value={kind} options={STRUCTURES.map((s) => ({ value: s.id, label: labelOf(s) }))} />
      </div>

      <div class="split">
        <div class="diagram" bind:clientWidth={diagramW}>
          <svg width={size} height={size} role="img" aria-label="{int(now.links)} required links among {nodes} {sys ? 'systems' : 'people'}.">
            {#each graph.edges as [a, b]}
              <line x1={graph.pts[a].x} y1={graph.pts[a].y} x2={graph.pts[b].x} y2={graph.pts[b].y} class="rel" style:stroke={COLORS[kind]} style:opacity={kind === 'mesh' ? Math.max(0.08, 0.6 - nodes / 110) : 0.55} />
            {/each}
            {#each graph.pts as p}
              <circle cx={p.x} cy={p.y} r={p.key ? 6 : 4} class="node" class:key={p.key} />
            {/each}
          </svg>
        </div>
        <div class="tkc-stats tkc-stats--4 side-stats" use:announce>
          <Stat label={sys ? 'Links to maintain' : 'Required relationships'} value={int(now.links)} sub={kind === 'mesh' ? 'every pair' : kind === 'hub' ? 'everything to the centre' : `inside modules of about ${TEAM_SIZE}, plus between them`} />
          <Stat label={sys ? 'Effort spent on links' : 'Time spent coordinating'} value={pct(now.overhead)} sub="on average" />
          <Stat label={sys ? 'Capacity left for new work' : 'Useful output'} value={now.output.toFixed(1)} sub={now.overloaded ? (sys ? 'the hub is the limit' : 'the approver is the limit') : sys ? 'systems’ worth' : 'people’s worth'} swatch={COLORS[kind]} />
          <Stat label="Single points of failure" value={spof} sub={spof === 0 ? 'no one node cuts the network' : spof === 1 ? 'the centre' : 'one bridge per module'} />
        </div>
      </div>

      <div class="tkc-chart" bind:clientWidth={width}>
        <svg {width} height={H} role="img" aria-label="Useful output against size for three shapes of network.">
          {#each ticks(0, 50, 5) as t}
            <line class={t === 0 ? 'tkc-base' : 'tkc-grid'} x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
            <text class="tkc-axis-label" x={m.left - 6} y={y(t) + 4} text-anchor="end">{t}</text>
          {/each}
          {#each [1, 10, 20, 30, 40, 50, 60] as t}
            <text class="tkc-axis-label" x={x(t)} y={H - m.bottom + 16} text-anchor="middle">{t}</text>
          {/each}
          {#each paths as p (p.id)}
            <path d={p.d} class="cv" style:stroke={COLORS[p.id]} style:opacity={p.id === kind ? 1 : 0.55} />
          {/each}
          <line class="now" x1={x(nodes)} x2={x(nodes)} y1={m.top} y2={y(0)} />
          {#each paths as p (p.id)}
            <circle cx={x(nodes)} cy={y(p.values[nodes - 1])} r={p.id === kind ? 5.5 : 4} class="pt" style:fill={COLORS[p.id]} />
          {/each}
          {#if hover !== null}<line class="cross" x1={x(hover)} x2={x(hover)} y1={m.top} y2={y(0)} />{/if}
          <text class="tkc-axis-title" x={m.left + (width - m.left - m.right) / 2} y={H - 4} text-anchor="middle">{sys ? 'Systems' : 'People'}</text>
          <text class="tkc-axis-title" x={m.left - 34} y={m.top - 4}>{sys ? 'Capacity for new work' : 'Useful output'}</text>
          <rect x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={H - m.top - m.bottom} fill="transparent" role="presentation" onpointermove={onMove} onpointerleave={() => (hover = null)} />
        </svg>
        {#if hover !== null}
          <div class="tkc-tip" style:left="{Math.min(width - 240, Math.max(0, x(hover) + 10))}px" style:top="24px">
            <div>{hover} {sys ? 'systems' : 'people'}</div>
            {#each paths as p (p.id)}
              <div class="tkc-tip-row"><span class="tkc-swatch tkc-swatch--line" style:background={COLORS[p.id]}></span><strong>{p.values[hover - 1].toFixed(1)}</strong> {labelOf(p).toLowerCase()}</div>
            {/each}
          </div>
        {/if}
        <div class="tkc-legend">
          {#each STRUCTURES as s (s.id)}
            <span><span class="tkc-swatch tkc-swatch--line" style:background={COLORS[s.id]}></span>{labelOf(s)}</span>
          {/each}
        </div>
      </div>

      {#snippet model()}
        <p>Every required link costs each end 2% of its capacity. In the first shape every pair is linked. In the second, every node links to one centre, which can handle the work of about 12 nodes. In the third, nodes form modules of about {TEAM_SIZE} that are fully linked inside, and one node per module links to the other modules.</p>
        <p>A single point of failure is a node whose loss would cut the network in two. In the modular shape each module has one bridge to the rest; giving each module two bridges would remove them, at the cost of a few more links.</p>
      {/snippet}
    </Instrument>
  {/snippet}

  {#snippet after()}
    <p>
      When everyone depends on everyone, output peaks at around 25 people and then falls: each newcomer adds more
      coordination than work. Fred Brooks saw this in software in 1975: adding people to a late project makes it later.
      The same holds for systems, where every new point-to-point link is one more thing to maintain and one more path for
      a problem to travel.
    </p>
    <p>
      Cities show the upside of scale. Wages, patents and economic output grow faster than population: a city twice as
      big produces roughly 2.2 times as much. In a city you can work with almost anyone
      and have to coordinate with almost no one. Possible links are options. Required links are conditions.
    </p>
    <p>
      A single central hub keeps links low, but output stops growing at whatever the centre can handle, and the centre is
      a single point of failure. Small modules with clear interfaces keep growing almost in proportion.
    </p>
    <p>
      Ships are built the same way. A hull divided into watertight compartments survives a breach that would sink an
      open one. The Titanic had sixteen, and could stay afloat with its first four flooded. The iceberg opened five, and
      the walls between compartments stopped short of the top, so the water spilled from one into the next. Modules
      protect only if the walls between them hold.
    </p>
    <h3>Simon’s watchmakers: why modular means flexible</h3>
    <p>
      Herbert Simon, a Nobel economist and one of the founders of artificial intelligence, told a parable about two
      watchmakers. Both build watches of 1,000 parts, and both are often interrupted. Tempus builds each watch in one go;
      when he puts it down, it falls apart and he starts again. Hora builds modules of ten parts that hold together, so an
      interruption costs him only the module in his hands.
    </p>
    <figure class="watch" bind:clientWidth={watchW}>
      <Slider id="g-int" label="Chance of an interruption per part" bind:value={interrupt} min={0} max={20} format={(v) => `${(v / 10).toFixed(1)}%`} />
      <svg width={watchInner} height="76" role="img" aria-label="Watches finished per month: Tempus {every(w.tempus.perMonth)}, Hora {every(w.hora.perMonth)}.">
        {#each [{ name: 'Tempus', sub: 'one piece', v: w.tempus.perMonth }, { name: 'Hora', sub: 'modules of 10', v: w.hora.perMonth }] as row, i (row.name)}
          {@const yy = 4 + i * 36}
          <text class="tkc-label" x="0" y={yy + 13}>{row.name}</text>
          <text class="tkc-axis-label" x="0" y={yy + 27}>{row.sub}</text>
          <path d={barRight(wx(0), yy + 2, Math.max(2, wx(Math.min(10, row.v)) - wx(0)), 18)} class="wbar" class:win={row.v >= Math.max(w.tempus.perMonth, w.hora.perMonth)} />
          <text class="tkc-label-2" x={wx(Math.min(10, row.v)) + 6} y={yy + 15}>{every(row.v)}</text>
        {/each}
      </svg>
      <figcaption class="tkc-caption">
        Watches finished per month, placing one part a minute for 160 hours. With no interruptions Tempus is slightly
        faster, because modules cost a little extra assembly.
        {#if interrupt > 0}At {(interrupt / 10).toFixed(1)}% Hora is {w.ratio < 10 ? `${w.ratio.toFixed(1)} times` : w.ratio < 1e6 ? `about ${int(Number(w.ratio.toPrecision(2)))} times` : 'more than a million times'} faster{#if interrupt === 10}; Simon’s rougher arithmetic gave about 4,000{/if}.{/if}
      </figcaption>
    </figure>
    <p>
      Simon’s point was that complex systems which survive and adapt are almost always built like Hora’s watches: from
      modules with few links between them. That is what flexible means in graph terms. It is why regulators ring-fence
      parts of banks, why payment systems settle through a few heavily protected hubs, and why AI agents work best when a
      big task is broken into small steps whose results are saved.
    </p>
    <p>
      John Gall, a doctor who wrote about why systems fail, turned the same idea into a law in 1975: a complex system
      that works is invariably found to have evolved from a simple system that worked. A complex system designed from scratch, he added, never works and cannot be patched up to make it work. Start simple, make it work, and let it grow.
    </p>
  {/snippet}

  {#snippet bank()}
    <BankNote ask="Draw the graph of one process: who and what must link to whom? Where are the single points of failure?">
      <p>
        Before adding a role, a committee, a system or an interface, ask what it does to the graph: does it add an option
        or a required link? Build in modules that can finish their work and hand over a stable result, so an interruption
        in one does not send everything back to the start.
      </p>
    </BankNote>
  {/snippet}
</Chapter>

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    align-items: center;
  }
  @container fig (min-width: 600px) {
    .split {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    .side-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .diagram {
    display: flex;
    justify-content: center;
    min-width: 0;
  }
  .rel {
    stroke-width: 1;
  }
  .node {
    fill: var(--tkc-surface);
    stroke: var(--tkc-ink-2);
    stroke-width: 1.5;
  }
  .node.key {
    fill: var(--tkc-conditions);
    stroke: var(--tkc-surface);
  }
  .cv {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .now {
    stroke: var(--tkc-ink);
    stroke-width: 1;
  }
  .cross {
    stroke: var(--tkc-muted);
    stroke-width: 1;
  }
  .pt {
    stroke: var(--tkc-surface);
    stroke-width: 2;
  }
  .watch {
    margin: 0;
    display: grid;
    gap: 10px;
    min-width: 0;
    padding: 14px;
    border-radius: 10px;
    background: var(--tkc-surface);
    border: 1px solid var(--tkc-hair);
  }
  .wbar {
    fill: var(--tkc-ink-2);
  }
  .wbar.win {
    fill: var(--tkc-options);
  }
</style>
